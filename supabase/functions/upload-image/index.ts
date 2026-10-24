import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Admin-only: uploads a product/category image straight to Cloudflare R2, so
// the live site never serves images from Supabase Storage (which is what
// drives Supabase's billed "cached egress"). Returns the object key to store
// in the database - product_images.image_url (relative path, resolved to the
// R2 CDN at read time) or the full R2 URL for categories.image_url.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRow } = await adminClient
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!adminRow) return jsonResponse({ error: "unauthorized" }, 403);

    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID");
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const r2Bucket = Deno.env.get("R2_BUCKET");
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
      return jsonResponse({ error: "R2 is not configured on the server" }, 500);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const prefix = String(formData.get("prefix") || "");
    if (!(file instanceof File)) return jsonResponse({ error: "file is required" }, 400);
    if (file.size > 10 * 1024 * 1024) return jsonResponse({ error: "file too large (max 10MB)" }, 400);

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const key = `${prefix}${Date.now()}-${safeName}`;

    const r2 = new AwsClient({
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      service: "s3",
      region: "auto",
    });

    const endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2Bucket}/${encodeURIComponent(key)}`;
    const body = new Uint8Array(await file.arrayBuffer());

    const putRes = await r2.fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
      body,
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      return jsonResponse({ error: `R2 upload failed: ${putRes.status} ${text}` }, 502);
    }

    return jsonResponse({ key });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 500);
  }
});

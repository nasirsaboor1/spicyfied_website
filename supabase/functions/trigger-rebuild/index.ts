import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const deployHook = Deno.env.get("DEPLOY_HOOK_URL");
    if (!deployHook) {
      return new Response(
        JSON.stringify({ error: "DEPLOY_HOOK_URL not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let payload: unknown = null;
    try {
      payload = await req.json();
    } catch {
      payload = null;
    }

    const res = await fetch(deployHook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "supabase-webhook",
        triggered_at: new Date().toISOString(),
        payload,
      }),
    });

    const ok = res.ok;
    const text = await res.text().catch(() => "");

    return new Response(
      JSON.stringify({ ok, status: res.status, response: text.slice(0, 500) }),
      {
        status: ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

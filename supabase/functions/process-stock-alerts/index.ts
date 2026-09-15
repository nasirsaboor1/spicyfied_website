import { createClient } from "npm:@supabase/supabase-js@2";

const GRAPH_API_VERSION = "v21.0";

interface WhatsAppTemplateComponent {
  type: string;
  sub_type?: string;
  index?: string;
  parameters: Array<{ type: string; text: string }>;
}

interface WhatsAppTemplate {
  name: string;
  language: { code: string };
  components: WhatsAppTemplateComponent[];
}

/** Normalizes an Indian phone number to the digits-only, country-coded form the Graph API expects. */
function toWhatsAppNumber(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

async function sendWhatsAppTemplate(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  template: WhatsAppTemplate
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, error: errText };
  }

  return { ok: true };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STATUS_LABEL: Record<string, string> = {
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

interface QueueRow {
  id: string;
  event_type: "low_stock" | "out_of_stock" | "back_in_stock";
  product_id: string;
  variant_id: string | null;
  stock_quantity: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
      return jsonResponse(
        { error: "whatsapp_not_configured", message: "WhatsApp notifications are not set up yet." },
        503
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: queueRows, error: queueError } = await adminClient
      .from("stock_alert_queue")
      .select("id, event_type, product_id, variant_id, stock_quantity")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(50);

    if (queueError) {
      console.error("process-stock-alerts: failed to read queue", queueError);
      return jsonResponse({ error: "Failed to read alert queue" }, 500);
    }

    const rows = (queueRows ?? []) as QueueRow[];
    let sent = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const { data: product } = await adminClient
        .from("products")
        .select("name")
        .eq("id", row.product_id)
        .maybeSingle();
      const productName = product?.name || "A product";

      if (row.event_type === "low_stock" || row.event_type === "out_of_stock") {
        const { data: recipients } = await adminClient
          .from("stock_alert_recipients")
          .select("phone")
          .eq("is_active", true);

        for (const recipient of recipients ?? []) {
          const waNumber = toWhatsAppNumber(recipient.phone);
          if (!waNumber) continue;
          const result = await sendWhatsAppTemplate(accessToken, phoneNumberId, waNumber, {
            name: "stock_alert",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: productName },
                  { type: "text", text: STATUS_LABEL[row.event_type] },
                  { type: "text", text: String(row.stock_quantity ?? 0) },
                ],
              },
            ],
          });
          if (result.ok) sent++;
          else errors.push(`recipient ${recipient.phone}: ${result.error}`);
        }
      } else {
        const { data: signups } = await adminClient
          .from("back_in_stock_notifications")
          .select("id, user_id")
          .eq("product_id", row.product_id)
          .eq("is_notified", false);

        for (const signup of signups ?? []) {
          if (!signup.user_id) continue;

          const { data: profile } = await adminClient
            .from("customer_profiles")
            .select("phone, phone_verified")
            .eq("id", signup.user_id)
            .maybeSingle();

          if (!profile?.phone || !profile.phone_verified) continue;

          const waNumber = toWhatsAppNumber(profile.phone);
          if (!waNumber) continue;

          const result = await sendWhatsAppTemplate(accessToken, phoneNumberId, waNumber, {
            name: "back_in_stock",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: productName }],
              },
            ],
          });

          if (result.ok) {
            sent++;
            await adminClient.from("back_in_stock_notifications").update({ is_notified: true }).eq("id", signup.id);
          } else {
            errors.push(`signup ${signup.id}: ${result.error}`);
          }
        }
      }

      await adminClient.from("stock_alert_queue").update({ processed_at: new Date().toISOString() }).eq("id", row.id);
    }

    if (errors.length) console.error("process-stock-alerts: some sends failed", errors);

    return jsonResponse({ processed: rows.length, sent, errors: errors.length }, 200);
  } catch (err) {
    console.error("process-stock-alerts error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

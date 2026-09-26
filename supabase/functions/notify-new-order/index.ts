import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppTemplate, toWhatsAppNumber, WhatsAppTemplate } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItemRow {
  product_name: string;
  variant_name: string;
  quantity: number;
  total_price: number;
}

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  total_amount: number;
  delivery_type: string;
  payment_method: string | null;
  payment_status: string | null;
  notes: string | null;
  addresses: { full_name: string; phone: string } | null;
  order_items: OrderItemRow[];
}

function extractPickupContact(notes: string | null): { name: string | null } {
  const match = notes?.match(/Pickup contact:\s*([^,]+),/);
  return { name: match ? match[1].trim() : null };
}

function paymentLabel(method: string | null, status: string | null): string {
  const m =
    method === "cod"
      ? "Cash on Delivery"
      : method === "upi"
      ? "UPI"
      : method === "card"
      ? "Card"
      : method || "—";
  if (method === "cod") return m;
  return `${m} (${status || "pending"})`;
}

async function sendAdminEmail(
  order: OrderRow,
  customerName: string,
  payment: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("ADMIN_ALERT_EMAIL");
  if (!apiKey || !to) return { ok: false, skipped: true };

  const from = Deno.env.get("ADMIN_ALERT_FROM") || "Spicyfied <onboarding@resend.dev>";
  const itemsHtml = order.order_items
    .map(
      (i) =>
        `<tr><td style="padding:4px 12px 4px 0">${i.product_name} (${i.variant_name})</td>` +
        `<td style="padding:4px 12px 4px 0">x${i.quantity}</td>` +
        `<td style="padding:4px 0">₹${Math.round(Number(i.total_price))}</td></tr>`
    )
    .join("");

  const fulfilment = order.delivery_type === "pickup" ? "Store pickup" : "Delivery";
  const html = `
    <div style="font-family:sans-serif;max-width:560px">
      <h2 style="margin:0 0 4px">New order: ${order.order_number}</h2>
      <p style="margin:0 0 16px;color:#555">A new order has been placed on Spicyfied.</p>
      <p style="margin:0 0 4px"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin:0 0 4px"><strong>Fulfilment:</strong> ${fulfilment}</p>
      <p style="margin:0 0 4px"><strong>Payment:</strong> ${payment}</p>
      <p style="margin:0 0 4px"><strong>Total:</strong> ₹${Math.round(Number(order.total_amount))}</p>
      <table style="margin:12px 0;border-collapse:collapse">${itemsHtml}</table>
      <p style="color:#555">Open the Spicyfied admin panel to process this order.</p>
    </div>`;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((e) => e.trim()).filter(Boolean),
        subject: `New order ${order.order_number} — ₹${Math.round(Number(order.total_amount))}`,
        html,
      }),
    });
    if (!resp.ok) return { ok: false, error: await resp.text() };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "unauthorized" }, 401);

    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) return jsonResponse({ error: "orderId is required" }, 400);

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

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(
        "id, order_number, user_id, total_amount, delivery_type, payment_method, payment_status, notes, addresses(full_name, phone), order_items(product_name, variant_name, quantity, total_price)"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) return jsonResponse({ error: "Order not found" }, 404);
    const typedOrder = order as unknown as OrderRow;

    // Triggered by the customer who placed it, or by an admin.
    if (typedOrder.user_id !== user.id) {
      const { data: adminRow } = await adminClient
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!adminRow) return jsonResponse({ error: "unauthorized" }, 403);
    }

    const pickupContact = extractPickupContact(typedOrder.notes);
    const customerName =
      typedOrder.delivery_type === "pickup"
        ? pickupContact.name || "Customer"
        : typedOrder.addresses?.full_name || "Customer";
    const total = Math.round(Number(typedOrder.total_amount)).toString();
    const payment = paymentLabel(typedOrder.payment_method, typedOrder.payment_status);

    // --- WhatsApp to admin recipients ---------------------------------------
    let whatsappResult: unknown = { skipped: true };
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (accessToken && phoneNumberId) {
      // Recipients: explicit env list, otherwise the active stock-alert recipients.
      const envPhones = (Deno.env.get("ADMIN_ALERT_PHONE") || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      let rawPhones = envPhones;
      if (rawPhones.length === 0) {
        const { data: recipients } = await adminClient
          .from("stock_alert_recipients")
          .select("phone")
          .eq("is_active", true);
        rawPhones = (recipients || []).map((r: { phone: string }) => r.phone);
      }

      const numbers = Array.from(
        new Set(rawPhones.map((p) => toWhatsAppNumber(p)).filter((n): n is string => !!n))
      );

      const template = (): WhatsAppTemplate => ({
        name: "new_order_admin",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: typedOrder.order_number },
              { type: "text", text: customerName },
              { type: "text", text: total },
              { type: "text", text: payment },
            ],
          },
        ],
      });

      const results = await Promise.all(
        numbers.map((n) => sendWhatsAppTemplate(accessToken, phoneNumberId, n, template()))
      );
      whatsappResult = {
        attempted: numbers.length,
        sent: results.filter((r) => r.ok).length,
        errors: results.filter((r) => !r.ok).map((r) => (r as { error: string }).error),
      };
    }

    // --- Email to admin ------------------------------------------------------
    const emailResult = await sendAdminEmail(typedOrder, customerName, payment);

    return jsonResponse({ success: true, whatsapp: whatsappResult, email: emailResult }, 200);
  } catch (err) {
    console.error("notify-new-order error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

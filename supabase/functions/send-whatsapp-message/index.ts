import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppTemplate, toWhatsAppNumber, WhatsAppTemplate } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type MessageType = "order_confirmation" | "order_shipped" | "order_delivered";

interface SendRequest {
  orderId: string;
  type: MessageType;
}

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  total_amount: number;
  delivery_type: string;
  notes: string | null;
  carrier: string | null;
  tracking_number: string | null;
  addresses: { full_name: string; phone: string } | null;
}

function extractPickupContact(notes: string | null): { name: string | null; phone: string | null } {
  const match = notes?.match(/Pickup contact:\s*([^,]+),\s*([\d+\-\s]{7,})/);
  return { name: match ? match[1].trim() : null, phone: match ? match[2].trim() : null };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const { orderId, type } = (await req.json()) as SendRequest;
    if (!orderId || (type !== "order_confirmation" && type !== "order_shipped" && type !== "order_delivered")) {
      return jsonResponse({ error: "orderId and a valid type are required" }, 400);
    }

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

    if (userError || !user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(
        "id, order_number, user_id, email, total_amount, delivery_type, notes, carrier, tracking_number, addresses(full_name, phone)"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }
    const typedOrder = order as unknown as OrderRow;

    if (type === "order_confirmation") {
      // Only the customer who placed the order can trigger their own confirmation.
      if (typedOrder.user_id !== user.id) {
        return jsonResponse({ error: "unauthorized" }, 403);
      }
    } else {
      // Shipping updates are admin-triggered.
      const { data: adminRow } = await adminClient
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!adminRow) {
        return jsonResponse({ error: "unauthorized" }, 403);
      }
    }

    const pickupContact = extractPickupContact(typedOrder.notes);
    const name =
      typedOrder.delivery_type === "pickup"
        ? pickupContact.name || "there"
        : typedOrder.addresses?.full_name || "there";
    const rawPhone =
      typedOrder.delivery_type === "pickup" ? pickupContact.phone : typedOrder.addresses?.phone;
    const waNumber = rawPhone ? toWhatsAppNumber(rawPhone) : null;

    if (!waNumber) {
      return jsonResponse({ error: "no_phone_on_order", message: "No phone number found on this order." }, 422);
    }

    const total = Math.round(Number(typedOrder.total_amount)).toString();

    const templatesByType: Record<MessageType, WhatsAppTemplate> = {
      order_confirmation: {
        name: "order_confirmation",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: typedOrder.order_number },
              { type: "text", text: total },
            ],
          },
        ],
      },
      order_shipped: {
        name: "order_shipped",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: typedOrder.order_number },
              { type: "text", text: typedOrder.carrier || "—" },
              { type: "text", text: typedOrder.tracking_number || "—" },
            ],
          },
        ],
      },
      order_delivered: {
        name: "order_delivered",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: typedOrder.order_number },
            ],
          },
        ],
      },
    };

    const template = templatesByType[type];

    const result = await sendWhatsAppTemplate(accessToken, phoneNumberId, waNumber, template);

    if (!result.ok) {
      console.error("WhatsApp send failed:", result.error);
      return jsonResponse({ error: "whatsapp_send_failed", message: result.error }, 502);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error("send-whatsapp-message error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

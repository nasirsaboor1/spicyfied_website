import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateOrderRequest {
  orderId: string;
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
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      return jsonResponse(
        {
          error: "razorpay_not_configured",
          message: "Online payments are not set up yet. Please choose in-store pickup with cash, or contact us to arrange payment.",
        },
        503
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "unauthorized" }, 401);
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

    const { orderId } = (await req.json()) as CreateOrderRequest;
    if (!orderId) {
      return jsonResponse({ error: "orderId is required" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, user_id, total_amount, order_number, payment_status, razorpay_order_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    if (order.user_id !== user.id) {
      return jsonResponse({ error: "unauthorized" }, 403);
    }

    if (order.payment_status === "paid") {
      return jsonResponse({ error: "Order already paid" }, 400);
    }

    const amountInPaise = Math.round(Number(order.total_amount) * 100);

    const razorpayAuth = btoa(`${keyId}:${keySecret}`);
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${razorpayAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: order.order_number,
        notes: { order_id: order.id },
      }),
    });

    if (!rzpResponse.ok) {
      const errText = await rzpResponse.text();
      console.error("Razorpay order creation failed:", errText);
      return jsonResponse({ error: "Failed to create payment order" }, 502);
    }

    const rzpOrder = await rzpResponse.json();

    await adminClient
      .from("orders")
      .update({ razorpay_order_id: rzpOrder.id })
      .eq("id", order.id);

    return jsonResponse(
      {
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key_id: keyId,
      },
      200
    );
  } catch (err) {
    console.error("create-razorpay-order error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

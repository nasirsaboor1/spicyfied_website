import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyPaymentRequest {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) {
      return jsonResponse({ error: "razorpay_not_configured" }, 503);
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

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      (await req.json()) as VerifyPaymentRequest;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, user_id, razorpay_order_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    if (order.user_id !== user.id) {
      return jsonResponse({ error: "unauthorized" }, 403);
    }

    if (order.razorpay_order_id !== razorpay_order_id) {
      return jsonResponse({ error: "Order mismatch" }, 400);
    }

    const expectedSignature = await hmacSha256Hex(
      keySecret,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    if (expectedSignature !== razorpay_signature) {
      return jsonResponse({ error: "Invalid payment signature" }, 400);
    }

    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        payment_status: "paid",
        payment_id: razorpay_payment_id,
        status: "confirmed",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order after payment verification:", updateError);
      return jsonResponse({ error: "Failed to record payment" }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error("verify-razorpay-payment error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderEmailRequest {
  orderId: string;
  emailType: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, emailType } = await req.json() as OrderEmailRequest;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        shipping_address:addresses(*),
        order_items(
          *,
          product:products(name)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const emailHtml = generateOrderConfirmationEmail(order);

    console.log(`Email notification for order ${order.order_number}:`);
    console.log(`To: ${order.customer.email}`);
    console.log(`Type: ${emailType}`);
    console.log("Email HTML generated successfully");

    const { error: notificationError } = await supabase
      .from("email_notifications")
      .insert({
        order_id: orderId,
        customer_id: order.customer_id,
        email_type: emailType,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error("Failed to log email notification:", notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email notification logged successfully",
        orderNumber: order.order_number,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function generateOrderConfirmationEmail(order: any): string {
  const items = order.order_items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        ${item.product.name} - ${item.variant_size}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ₹${Math.round(item.price)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
        ₹${Math.round(item.subtotal)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2d5016 0%, #4a7c24 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Order Confirmed!</h1>
    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Thank you for your order</p>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="margin: 0 0 5px; color: #6b7280; font-size: 14px;">Order Number</p>
      <p style="margin: 0; font-size: 24px; font-weight: 700; color: #2d5016;">${order.order_number}</p>
    </div>

    <h2 style="color: #2d5016; border-bottom: 2px solid #2d5016; padding-bottom: 10px; margin-top: 0;">Order Details</h2>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items}
      </tbody>
    </table>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Subtotal:</span>
        <span>₹${Math.round(order.subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Tax (5%):</span>
        <span>₹${Math.round(order.tax_amount)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Shipping:</span>
        <span>${order.shipping_fee === 0 ? "FREE" : `₹${order.shipping_fee}`}</span>
      </div>
      ${
        order.discount_amount > 0
          ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #059669;">
        <span>Discount:</span>
        <span>-₹${Math.round(order.discount_amount)}</span>
      </div>
      `
          : ""
      }
      <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: 700; color: #2d5016;">
        <span>Total:</span>
        <span>₹${Math.round(order.total_amount)}</span>
      </div>
    </div>

    <h2 style="color: #2d5016; border-bottom: 2px solid #2d5016; padding-bottom: 10px; margin-top: 30px;">Delivery Address</h2>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 5px; font-weight: 600;">${order.shipping_address.full_name}</p>
      <p style="margin: 0 0 5px;">${order.shipping_address.phone}</p>
      <p style="margin: 0; color: #6b7280;">
        ${order.shipping_address.address_line1}${order.shipping_address.address_line2 ? `, ${order.shipping_address.address_line2}` : ""}<br>
        ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}<br>
        ${order.shipping_address.country}
      </p>
    </div>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">Estimated Delivery</p>
      <p style="margin: 5px 0 0; color: #92400e;">${new Date(order.estimated_delivery).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>

    <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0;">Need help? Contact us at support@spicyfied.in</p>
      <p style="color: #6b7280; margin: 10px 0 0; font-size: 14px;">Spicyfied - Pure, Natural, Premium Spices</p>
    </div>
  </div>
</body>
</html>
  `;
}

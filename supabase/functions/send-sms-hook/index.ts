import { Webhook } from "npm:standardwebhooks@1.0.0";
import { sendWhatsAppTemplate, toWhatsAppNumber } from "../_shared/whatsapp.ts";

/**
 * Supabase Auth "Send SMS Hook" - fires whenever a user requests a phone
 * OTP (login/signup via phone). We intercept it here and deliver the code
 * over WhatsApp instead of a traditional SMS gateway.
 *
 * Configure in Supabase Dashboard: Authentication > Hooks > Send SMS Hook
 * (HTTPS type, pointed at this function's URL). The "Generate secret" value
 * shown there must be set as the SEND_SMS_HOOK_SECRET function secret.
 *
 * Requires a Meta WhatsApp AUTHENTICATION-category template named
 * "login_verification_code" (see project notes for exact setup).
 */

interface SendSmsHookPayload {
  user: { phone?: string };
  sms: { otp: string };
}

Deno.serve(async (req: Request) => {
  const errorResponse = (httpCode: number, message: string) =>
    new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
      status: httpCode,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!hookSecret || !accessToken || !phoneNumberId) {
      console.error("send-sms-hook: missing SEND_SMS_HOOK_SECRET / WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID");
      return errorResponse(500, "WhatsApp login is not configured yet.");
    }

    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    const wh = new Webhook(hookSecret.replace("v1,whsec_", ""));
    let payload: SendSmsHookPayload;
    try {
      payload = wh.verify(rawBody, headers) as SendSmsHookPayload;
    } catch (err) {
      console.error("send-sms-hook: signature verification failed", err);
      return errorResponse(401, "Invalid webhook signature.");
    }

    const phone = payload.user?.phone;
    const otp = payload.sms?.otp;

    if (!phone || !otp) {
      return errorResponse(400, "Missing phone or OTP in hook payload.");
    }

    const waNumber = toWhatsAppNumber(phone);
    if (!waNumber) {
      return errorResponse(400, "Could not parse phone number.");
    }

    const result = await sendWhatsAppTemplate(accessToken, phoneNumberId, waNumber, {
      name: "login_verification_code",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        },
      ],
    });

    if (!result.ok) {
      console.error("send-sms-hook: WhatsApp send failed", result.error);
      return errorResponse(500, "Failed to send WhatsApp verification code.");
    }

    // Supabase Auth requires a JSON response (even if empty) with a 200 status for a successful send.
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-sms-hook error:", err);
    return errorResponse(500, "Internal error");
  }
});

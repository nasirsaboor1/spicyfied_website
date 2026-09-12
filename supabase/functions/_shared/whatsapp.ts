const GRAPH_API_VERSION = "v21.0";

export interface WhatsAppTemplateComponent {
  type: string;
  sub_type?: string;
  index?: string;
  parameters: Array<{ type: string; text: string }>;
}

export interface WhatsAppTemplate {
  name: string;
  language: { code: string };
  components: WhatsAppTemplateComponent[];
}

/** Normalizes an Indian phone number to the digits-only, country-coded form the Graph API expects. */
export function toWhatsAppNumber(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export async function sendWhatsAppTemplate(
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

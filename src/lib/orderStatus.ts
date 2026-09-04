export const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Badge classes for the orders table/detail view.
export const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-violet-100 text-violet-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// Hex fills for the dashboard status-breakdown chart - same semantics as the
// badge classes above, kept in one place so the two never drift apart.
export const STATUS_CHART_COLORS: Record<OrderStatus, string> = {
  pending: '#D97706',
  confirmed: '#0284C7',
  processing: '#7C3AED',
  shipped: '#4F46E5',
  delivered: '#16A34A',
  cancelled: '#DC2626',
};

export function normalizeStatus(status: string | null): OrderStatus {
  return (STATUS_OPTIONS as readonly string[]).includes(status || '')
    ? (status as OrderStatus)
    : 'pending';
}

export function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case 'cod':
      return 'Cash on Pickup';
    case 'upi':
      return 'UPI';
    case 'card':
      return 'Card';
    default:
      return 'Not set';
  }
}

/**
 * Best-effort phone number for an order, for WhatsApp/SMS follow-up.
 * Delivery orders carry it on the shipping address; pickup orders only
 * capture it inline in the notes field (see CheckoutPage's pickup flow).
 */
export function extractOrderPhone(order: {
  delivery_type: string;
  addresses?: { phone: string } | null;
  notes?: string | null;
}): string | null {
  if (order.delivery_type === 'delivery' && order.addresses?.phone) {
    return order.addresses.phone;
  }
  const match = order.notes?.match(/Pickup contact:.*?,\s*([\d+\-\s]{7,})/);
  return match ? match[1].trim() : null;
}

/** Normalizes an Indian phone number to the digits-only, country-coded form wa.me expects. */
export function toWhatsAppNumber(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

interface PackingSlipOrder {
  order_number: string;
  created_at: string;
  delivery_type: string;
  email: string;
  notes: string | null;
  carrier: string | null;
  tracking_number: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  addresses: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  order_items: Array<{
    id: string;
    product_name: string;
    variant_name: string;
    quantity: number;
    total_price: number;
  }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function printPackingSlip(order: PackingSlipOrder) {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) {
    alert('Please allow pop-ups to print the packing slip.');
    return;
  }

  const itemsRows = order.order_items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.product_name)} — ${escapeHtml(item.variant_name)}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">₹${Math.round(item.total_price)}</td>
        </tr>`
    )
    .join('');

  const addressBlock =
    order.delivery_type === 'pickup'
      ? `<p>Pickup from shop</p>${order.notes ? `<p>${escapeHtml(order.notes)}</p>` : ''}`
      : order.addresses
      ? `
        <p><strong>${escapeHtml(order.addresses.full_name)}</strong></p>
        <p>${escapeHtml(order.addresses.phone)}</p>
        <p>${escapeHtml(order.addresses.address_line1)}${order.addresses.address_line2 ? ', ' + escapeHtml(order.addresses.address_line2) : ''}</p>
        <p>${escapeHtml(order.addresses.city)}, ${escapeHtml(order.addresses.state)} ${escapeHtml(order.addresses.postal_code)}</p>
      `
      : '<p>—</p>';

  const shipmentBlock =
    order.carrier || order.tracking_number
      ? `<p>Carrier: ${escapeHtml(order.carrier || '—')} &nbsp; Tracking #: ${escapeHtml(order.tracking_number || '—')}</p>`
      : '';

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Packing Slip - ${escapeHtml(order.order_number)}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 640px; margin: 0 auto; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .muted { color: #666; font-size: 13px; margin-bottom: 24px; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; }
          .section p { margin: 2px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 14px; }
          th { font-size: 11px; text-transform: uppercase; color: #888; border-bottom: 2px solid #ccc; }
          .right { text-align: right; }
          .total-row td { font-weight: bold; border-top: 2px solid #333; border-bottom: none; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Spicyfied — Packing Slip</h1>
        <p class="muted">Order ${escapeHtml(order.order_number)} &middot; ${new Date(order.created_at).toLocaleDateString()}</p>

        <div class="section">
          <h2>Ship To</h2>
          ${addressBlock}
          ${shipmentBlock}
        </div>

        <div class="section">
          <h2>Items</h2>
          <table>
            <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Amount</th></tr></thead>
            <tbody>
              ${itemsRows}
              <tr class="total-row"><td colspan="2">Total</td><td class="right">₹${Math.round(order.total_amount)}</td></tr>
            </tbody>
          </table>
        </div>

        <p class="muted">Thank you for shopping with Spicyfied.</p>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

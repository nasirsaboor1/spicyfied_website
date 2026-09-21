/*
  # Remove the hardcoded 5% tax from server-side order-total recomputation

  `recompute_order_totals()` (added in 20260823120000_order_and_review_integrity.sql)
  is a legitimate anti-tampering control: it recomputes subtotal, tax,
  shipping, and total server-side from the actual catalog prices and
  delivery rules whenever order_items change, so a client can never lie
  about what it owes. That is kept exactly as-is here.

  What changes: product prices are tax-inclusive (decided and applied
  client-side in the checkout UI), but this trigger was still hardcoding
  an extra 5% tax on top, server-side - completely independent of the
  client fix, since the client only controls the *displayed* total, not
  what this trigger overwrites it with after order_items are inserted.
  That is why the checkout page correctly showed a tax-free total while
  the stored order (and therefore what Razorpay actually charged) still
  had 5% added back in.

  This redefines the function with tax always 0, everything else
  (subtotal from real order_items, shipping from the real delivery-zone
  fee) unchanged. Does not affect past orders - only order_items inserts/
  updates/deletes from this point on will recompute without tax.
*/

CREATE OR REPLACE FUNCTION public.recompute_order_totals(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric;
  v_tax numeric := 0;
  v_shipping numeric;
  v_delivery_type text;
  v_postal_code text;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM order_items WHERE order_id = p_order_id;

  SELECT o.delivery_type, a.postal_code
  INTO v_delivery_type, v_postal_code
  FROM orders o
  LEFT JOIN addresses a ON a.id = o.shipping_address_id
  WHERE o.id = p_order_id;

  IF v_delivery_type = 'pickup' THEN
    v_shipping := 0;
  ELSIF v_postal_code IS NOT NULL THEN
    v_shipping := get_delivery_fee(v_postal_code);
  ELSE
    v_shipping := 0;
  END IF;

  UPDATE orders
  SET subtotal = v_subtotal,
      tax_amount = v_tax,
      shipping_amount = v_shipping,
      total_amount = v_subtotal + v_tax + v_shipping
  WHERE id = p_order_id;
END;
$$;

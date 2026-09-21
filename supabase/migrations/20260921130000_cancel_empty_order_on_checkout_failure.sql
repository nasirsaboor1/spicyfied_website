/*
  # Clean up an order left empty by a failed order_items insert

  Checkout creates the `orders` row first (to get an order number/id),
  then inserts `order_items` in a second, separate request. If that second
  insert is rejected - most notably by the new out-of-stock guard in
  20260921120000_reject_order_items_when_out_of_stock.sql - the order row
  from the first request is already committed and stays behind as an
  empty, permanently "pending" order with no items.

  This adds a narrowly-scoped SECURITY DEFINER function the checkout page
  calls right after that failure: it deletes the order only when it
  belongs to the caller, is still pending, and genuinely has no items
  attached, so it can never touch a real order. SECURITY DEFINER is used
  because customers otherwise have no DELETE grant on orders at all - this
  function does not add one, it only allows this one exact, self-checked
  case.
*/

CREATE OR REPLACE FUNCTION public.cancel_empty_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM orders
  WHERE id = p_order_id
    AND user_id = auth.uid()
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM order_items WHERE order_items.order_id = orders.id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_empty_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_empty_order(uuid) TO authenticated;

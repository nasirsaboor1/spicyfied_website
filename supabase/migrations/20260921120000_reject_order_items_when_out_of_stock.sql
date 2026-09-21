/*
  # Reject an order item when its variant does not have enough stock

  `decrement_stock_on_order_item()` (20260915104200_stock_tracking_and_alerts.sql)
  already decrements stock_quantity after every order_items insert, but it
  floored the result at 0 rather than rejecting the insert - so nothing
  server-side ever stopped an order from going through for a size that had
  already sold out. In practice this could happen from a genuine race (two
  customers buying the last unit at the same moment) or from a request sent
  straight to the API, bypassing the storefront's own out-of-stock UI (see
  the client-side fix in ProductDetailPage.tsx, which only stops the normal
  UI path).

  This makes the same UPDATE that decrements stock also be the check: it
  only succeeds when enough stock currently exists, so ordinary Postgres
  row-level locking on product_variants keeps it correct under concurrent
  orders (whichever transaction's UPDATE commits first wins; the loser sees
  the already-reduced stock_quantity and fails the WHERE clause). When
  stock isn't sufficient, the insert is rejected with a message naming the
  product and size, which rolls back that order_items insert instead of
  silently accepting an unfulfillable order.
*/

CREATE OR REPLACE FUNCTION decrement_stock_on_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_qty integer;
  v_product_id uuid;
  v_old_status text;
  v_new_status text;
BEGIN
  IF NEW.variant_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE product_variants
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.variant_id
    AND COALESCE(stock_quantity, 0) >= NEW.quantity
  RETURNING stock_quantity, product_id INTO v_new_qty, v_product_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION '% (%) just sold out - please remove it from your cart or pick another size.',
      NEW.product_name, NEW.variant_name;
  END IF;

  v_new_status := CASE
    WHEN v_new_qty <= 0 THEN 'out_of_stock'
    WHEN v_new_qty <= 10 THEN 'low_stock'
    ELSE 'in_stock'
  END;

  SELECT stock_status INTO v_old_status FROM products WHERE id = v_product_id;

  IF v_old_status IS DISTINCT FROM v_new_status THEN
    UPDATE products SET stock_status = v_new_status, updated_at = now() WHERE id = v_product_id;

    IF v_new_status IN ('low_stock', 'out_of_stock') THEN
      INSERT INTO stock_alert_queue (event_type, product_id, variant_id, stock_quantity)
      VALUES (v_new_status, v_product_id, NEW.variant_id, v_new_qty);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

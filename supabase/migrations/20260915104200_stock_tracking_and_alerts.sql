/*
  # Real inventory tracking + stock alert queue

  Until now, `product_variants.stock_quantity` and `products.stock_status`
  were purely manual fields an admin typed into the product edit form -
  placing and paying for an order never reduced stock. This migration makes
  stock real:

  1. New columns
    - `back_in_stock_notifications.user_id` (uuid, references auth.users) -
      identifies a logged-in customer's back-in-stock request so their
      already-verified WhatsApp number (customer_profiles.phone) can be used
      at send time, instead of collecting a fresh unverified number.

  2. New tables
    - `stock_alert_recipients` - WhatsApp numbers that should receive a
      low-stock / out-of-stock alert. Independent of `admin_users` so alert
      numbers can be managed without touching admin accounts.
    - `stock_alert_queue` - a lightweight outbox. Triggers insert a row here
      when something alert-worthy happens; the `process-stock-alerts` Edge
      Function reads unprocessed rows and sends the WhatsApp messages, then
      marks them processed. Decoupling the DB trigger from the actual HTTP
      call keeps the trigger itself simple, synchronous, and dependency-free
      (no pg_net / external network call from inside Postgres).

  3. Behavior
    - `decrement_stock_on_order_item()` (AFTER INSERT ON order_items): reduces
      the ordered variant's stock_quantity (floored at 0), recomputes the
      parent product's stock_status (0 -> out_of_stock, <=10 -> low_stock,
      else in_stock), and - only on a downward transition into low/out -
      queues a `low_stock` or `out_of_stock` alert.
    - `queue_back_in_stock_alert()` (AFTER UPDATE ON products): when
      stock_status transitions from low_stock/out_of_stock back to
      in_stock, queues a `back_in_stock` alert for that product.

  4. Security
    - Both trigger functions are SECURITY DEFINER with a locked search_path,
      because the customer's own (non-admin) session inserts order_items,
      and RLS on `products` / `product_variants` otherwise restricts writes
      to admins only (see 20260816111124_admin_role_and_product_write_access.sql).
      The functions only ever touch stock_quantity/stock_status and the
      alert queue - never price, ownership, or any other column.
*/

-- 1. back_in_stock_notifications: link to the logged-in customer -----------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'back_in_stock_notifications' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE back_in_stock_notifications
      ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE back_in_stock_notifications ALTER COLUMN email DROP NOT NULL;

-- 2. stock_alert_recipients --------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_alert_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_alert_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage stock alert recipients" ON stock_alert_recipients;
CREATE POLICY "Admins can manage stock alert recipients"
  ON stock_alert_recipients FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- 3. stock_alert_queue --------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_alert_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('low_stock', 'out_of_stock', 'back_in_stock')),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  stock_quantity integer,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stock_alert_queue_unprocessed
  ON stock_alert_queue (created_at) WHERE processed_at IS NULL;

ALTER TABLE stock_alert_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view stock alert queue" ON stock_alert_queue;
CREATE POLICY "Admins can view stock alert queue"
  ON stock_alert_queue FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

-- No INSERT/UPDATE policy for stock_alert_queue: only the SECURITY DEFINER
-- trigger functions below and the service-role Edge Function touch it.

-- 4. Decrement stock on order placement, derive stock_status, queue alerts --

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
  SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - NEW.quantity, 0)
  WHERE id = NEW.variant_id
  RETURNING stock_quantity, product_id INTO v_new_qty, v_product_id;

  IF v_product_id IS NULL THEN
    RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order_item ON order_items;
CREATE TRIGGER trg_decrement_stock_on_order_item
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock_on_order_item();

-- 5. Queue a back-in-stock alert when an admin restocks a product -----------

CREATE OR REPLACE FUNCTION queue_back_in_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_status = 'in_stock' AND OLD.stock_status IN ('low_stock', 'out_of_stock') THEN
    INSERT INTO stock_alert_queue (event_type, product_id)
    VALUES ('back_in_stock', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_back_in_stock_alert ON products;
CREATE TRIGGER trg_queue_back_in_stock_alert
  AFTER UPDATE OF stock_status ON products
  FOR EACH ROW
  EXECUTE FUNCTION queue_back_in_stock_alert();

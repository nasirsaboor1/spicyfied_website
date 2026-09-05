/*
  # Admin dashboard improvements - schema additions

  1. back_in_stock_notifications - ensure anyone (signed in or not) can submit
     a request; only an admin-view SELECT policy was previously tracked.
  2. order_status_history - new table recording every status change on an
     order, so admins can see a timeline instead of just the current status.
  3. orders.cancellation_reason - captured when an order is marked cancelled.
*/

-- 1. Allow public back-in-stock signups ------------------------------------
DROP POLICY IF EXISTS "Anyone can request back in stock notification" ON back_in_stock_notifications;
CREATE POLICY "Anyone can request back in stock notification"
  ON back_in_stock_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Order status history ----------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view order status history" ON order_status_history;
CREATE POLICY "Admins can view order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can insert order status history" ON order_status_history;
CREATE POLICY "Admins can insert order status history"
  ON order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (is_admin((select auth.uid())));

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- 3. Cancellation reason ------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

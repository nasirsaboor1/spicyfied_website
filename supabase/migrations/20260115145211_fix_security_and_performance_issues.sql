/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  Foreign key columns without indexes can cause significant performance degradation:
  - `order_items.product_id` - Index for product lookups in orders
  - `order_items.variant_id` - Index for variant lookups in orders
  - `orders.shipping_address_id` - Index for address lookups on orders
  - `wishlists.product_id` - Index for product lookups in wishlists

  ### 2. Optimize RLS Policies for Performance
  Replace `auth.uid()` with `(select auth.uid())` in all RLS policies to prevent re-evaluation
  for each row. This is critical for query performance at scale.

  Affected tables and policies:
  - `customers` - 3 policies (view, update, insert)
  - `addresses` - 4 policies (view, create, update, delete)
  - `orders` - 3 policies (view, create, update)
  - `order_items` - 2 policies (view, insert)
  - `order_status_history` - 1 policy (view)
  - `payment_transactions` - 1 policy (view)
  - `wishlists` - 3 policies (view, add, remove)

  ### 3. Fix Function Search Paths
  Set immutable search_path for functions to prevent security issues:
  - `generate_order_number()` - Set search_path to 'public'
  - `update_updated_at_column()` - Set search_path to 'public'

  ## Performance Impact
  - Faster queries on foreign key relationships
  - Reduced CPU usage for RLS policy evaluation
  - Better security for database functions
*/

-- =============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_id ON orders(shipping_address_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);

-- =============================================
-- 2. OPTIMIZE RLS POLICIES - DROP OLD ONES
-- =============================================

-- Drop customers policies
DROP POLICY IF EXISTS "Users can view own customer profile" ON customers;
DROP POLICY IF EXISTS "Users can update own customer profile" ON customers;
DROP POLICY IF EXISTS "Users can insert own customer profile" ON customers;

-- Drop addresses policies
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can create own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;

-- Drop orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;

-- Drop order_items policies
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for own orders" ON order_items;

-- Drop order_status_history policies
DROP POLICY IF EXISTS "Users can view own order status history" ON order_status_history;

-- Drop payment_transactions policies
DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;

-- Drop wishlists policies
DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlists;
DROP POLICY IF EXISTS "Users can add to own wishlist" ON wishlists;
DROP POLICY IF EXISTS "Users can remove from own wishlist" ON wishlists;

-- =============================================
-- 3. CREATE OPTIMIZED RLS POLICIES
-- =============================================

-- Customers policies (optimized)
CREATE POLICY "Users can view own customer profile"
  ON customers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own customer profile"
  ON customers FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own customer profile"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Addresses policies (optimized)
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Users can create own addresses"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  TO authenticated
  USING (customer_id = (select auth.uid()));

-- Orders policies (optimized)
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Users can update own pending orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (customer_id = (select auth.uid()));

-- Order items policies (optimized)
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert order items for own orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = (select auth.uid())
    )
  );

-- Order status history policies (optimized)
CREATE POLICY "Users can view own order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.customer_id = (select auth.uid())
    )
  );

-- Payment transactions policies (optimized)
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payment_transactions.order_id
      AND orders.customer_id = (select auth.uid())
    )
  );

-- Wishlists policies (optimized)
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Users can add to own wishlist"
  ON wishlists FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Users can remove from own wishlist"
  ON wishlists FOR DELETE
  TO authenticated
  USING (customer_id = (select auth.uid()));

-- =============================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =============================================

-- Recreate generate_order_number with fixed search_path
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number text;
  year_month text;
BEGIN
  year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  SELECT 'ORD-' || year_month || '-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(order_number FROM 13) AS INTEGER)), 0)::text + 1, 5, '0')
  INTO new_number
  FROM orders
  WHERE order_number LIKE 'ORD-' || year_month || '-%';
  
  RETURN new_number;
END;
$$;

-- Recreate update_updated_at_column with fixed search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

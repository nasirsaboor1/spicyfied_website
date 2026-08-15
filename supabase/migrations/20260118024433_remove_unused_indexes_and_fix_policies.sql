/*
  # Remove Unused Indexes and Fix Duplicate Policies

  1. Changes
    - Drop all unused indexes that are creating unnecessary overhead
    - These indexes haven't been used and can be recreated later if needed
    - Consolidate duplicate permissive policies on admin_users table
    
  2. Performance Notes
    - Removing unused indexes reduces database overhead and storage
    - Indexes can be recreated in the future if query patterns show they're needed
    
  3. Security Notes
    - Consolidate admin_users SELECT policies into a single clear policy
    - Remove redundant overlapping policies that cause confusion
*/

-- Drop unused indexes on product_variants
DROP INDEX IF EXISTS idx_product_variants_product_id;

-- Drop unused indexes on products
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_is_active;
DROP INDEX IF EXISTS idx_products_is_bestseller;

-- Drop unused indexes on review_votes
DROP INDEX IF EXISTS idx_review_votes_review_id;
DROP INDEX IF EXISTS idx_review_votes_customer_id;

-- Drop unused indexes on product_reviews
DROP INDEX IF EXISTS idx_product_reviews_customer_id;
DROP INDEX IF EXISTS idx_product_reviews_rating;
DROP INDEX IF EXISTS idx_product_reviews_is_approved;
DROP INDEX IF EXISTS idx_product_reviews_created_at;
DROP INDEX IF EXISTS idx_product_reviews_order_id;

-- Drop unused indexes on admin_users
DROP INDEX IF EXISTS idx_admin_users_is_active;

-- Drop unused indexes on email_notifications
DROP INDEX IF EXISTS idx_email_notifications_order_id;
DROP INDEX IF EXISTS idx_email_notifications_status;
DROP INDEX IF EXISTS idx_email_notifications_customer_id;

-- Drop unused indexes on addresses
DROP INDEX IF EXISTS idx_addresses_customer_id;
DROP INDEX IF EXISTS idx_addresses_is_default;

-- Drop unused indexes on orders
DROP INDEX IF EXISTS idx_orders_customer_id;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_order_number;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_shipping_address_id;

-- Drop unused indexes on order_items
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_order_items_product_id;
DROP INDEX IF EXISTS idx_order_items_variant_id;

-- Drop unused indexes on order_status_history
DROP INDEX IF EXISTS idx_order_status_history_order_id;

-- Drop unused indexes on payment_transactions
DROP INDEX IF EXISTS idx_payment_transactions_order_id;

-- Drop unused indexes on wishlists
DROP INDEX IF EXISTS idx_wishlists_customer_id;
DROP INDEX IF EXISTS idx_wishlists_product_id;

-- Drop unused indexes on coupons
DROP INDEX IF EXISTS idx_coupons_code;

-- Drop unused indexes on customers
DROP INDEX IF EXISTS idx_customers_email;

-- Drop unused indexes on contact_submissions
DROP INDEX IF EXISTS idx_contact_submissions_created_at;
DROP INDEX IF EXISTS idx_contact_submissions_status;

-- Fix multiple permissive policies on admin_users table
-- Drop the duplicate policies
DROP POLICY IF EXISTS "Admins can view and manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Create a single consolidated policy for SELECT
CREATE POLICY "Admin users can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

-- Recreate other policies if they existed
CREATE POLICY "Admin users can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admin users can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admin users can delete admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (is_admin((select auth.uid())));
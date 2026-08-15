/*
  # Fix Foreign Key Indexes and Security Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  Foreign key columns without indexes cause significant performance degradation.
  Adding indexes for all foreign key relationships:
  
  - `addresses.customer_id` - Index for customer address lookups
  - `email_notifications.customer_id` - Index for customer notification lookups
  - `email_notifications.order_id` - Index for order notification lookups
  - `order_items.order_id` - Index for order item lookups
  - `order_items.product_id` - Index for product lookups in orders (if not exists)
  - `order_items.variant_id` - Index for variant lookups in orders (if not exists)
  - `order_status_history.order_id` - Index for order status history lookups
  - `orders.customer_id` - Index for customer order lookups
  - `orders.shipping_address_id` - Index for shipping address lookups (if not exists)
  - `payment_transactions.order_id` - Index for payment transaction lookups
  - `product_reviews.order_id` - Index for order review lookups
  - `product_variants.product_id` - Index for product variant lookups
  - `review_votes.customer_id` - Index for customer review vote lookups
  - `wishlists.product_id` - Index for wishlist product lookups (if not exists)

  ### 2. Fix Contact Submissions RLS Policy
  Replace the permissive policy that allows unrestricted access with a restrictive
  policy that implements proper validation:
  
  - Validate name length (2-100 characters)
  - Validate email format and length
  - Validate message length (10-5000 characters)
  - Ensure phone is within reasonable length if provided
  - Ensure status is set to 'new'

  ## Performance Impact
  - Faster queries on all foreign key relationships
  - Better security for contact form submissions
  - Reduced CPU usage for database operations
*/

-- =============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================

-- Addresses
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);

-- Email Notifications
CREATE INDEX IF NOT EXISTS idx_email_notifications_customer_id ON email_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_order_id ON email_notifications(order_id);

-- Order Items (some may already exist from previous migration)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- Order Status History
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_id ON orders(shipping_address_id);

-- Payment Transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);

-- Product Reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON product_reviews(order_id);

-- Product Variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Review Votes
CREATE INDEX IF NOT EXISTS idx_review_votes_customer_id ON review_votes(customer_id);

-- Wishlists (may already exist from previous migration)
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);

-- =============================================
-- 2. FIX CONTACT SUBMISSIONS RLS POLICY
-- =============================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;

-- Create a more restrictive policy with validation
CREATE POLICY "Allow contact form submissions with validation"
  ON contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Ensure name is not empty and reasonable length
    name IS NOT NULL 
    AND length(trim(name)) >= 2 
    AND length(name) <= 100
    -- Ensure email is present and has basic format validation
    AND email IS NOT NULL 
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 255
    -- Ensure phone is reasonable length if provided
    AND (phone IS NULL OR length(phone) <= 20)
    -- Ensure message is present and reasonable
    AND message IS NOT NULL 
    AND length(trim(message)) >= 10 
    AND length(message) <= 5000
    -- Ensure status is set to 'new' only
    AND status = 'new'
  );

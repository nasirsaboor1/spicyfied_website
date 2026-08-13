/*
  # Fix Security and Performance Issues

  1. Missing Indexes
    - Add index on email_notifications.customer_id
    - Add index on product_reviews.order_id

  2. RLS Policy Optimization
    - Update all policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation for each row

  3. Function Search Path
    - Set immutable search_path on all functions for security

  4. Multiple Permissive Policies
    - Consolidate admin_users SELECT policies
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_email_notifications_customer_id ON email_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON product_reviews(order_id);

-- Drop existing RLS policies that need optimization
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Authenticated users can vote on reviews" ON review_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON review_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON review_votes;
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view email notifications" ON email_notifications;

-- Recreate RLS policies with optimized auth.uid() calls
CREATE POLICY "Authenticated users can create reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);

CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = customer_id)
  WITH CHECK ((select auth.uid()) = customer_id);

CREATE POLICY "Users can delete own reviews"
  ON product_reviews FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = customer_id);

CREATE POLICY "Authenticated users can vote on reviews"
  ON review_votes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);

CREATE POLICY "Users can update own votes"
  ON review_votes FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = customer_id)
  WITH CHECK ((select auth.uid()) = customer_id);

CREATE POLICY "Users can delete own votes"
  ON review_votes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = customer_id);

-- Consolidate admin_users policies into a single SELECT policy
CREATE POLICY "Admins can view and manage admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (select auth.uid())
      AND admin_users.is_active = true
    )
  );

-- Recreate super admin management policy for INSERT/UPDATE/DELETE
CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (select auth.uid())
      AND admin_users.role = 'super_admin'
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (select auth.uid())
      AND admin_users.role = 'super_admin'
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can view email notifications"
  ON email_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (select auth.uid())
      AND admin_users.is_active = true
    )
  );

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE products
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM product_reviews
      WHERE product_id = NEW.product_id
      AND is_approved = true
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = NEW.product_id
      AND is_approved = true
    )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE product_reviews
    SET helpful_count = (
      SELECT COUNT(*)
      FROM review_votes
      WHERE review_id = NEW.review_id
      AND is_helpful = true
    )
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_reviews
    SET helpful_count = (
      SELECT COUNT(*)
      FROM review_votes
      WHERE review_id = OLD.review_id
      AND is_helpful = true
    )
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
    AND is_active = true
  );
END;
$$;
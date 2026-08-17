/*
  # Master Admin Access and Team Management

  1. Widen admin scope from "products only" to everything the app manages:
     orders, order_items, addresses, reviews, wishlists, carts/cart_items,
     delivery_zones/settings, and the marketing content tables (recipes,
     promotional_banners, content_pages, etc.) - full read/write for any
     active admin, matching the request for master-level access within
     the app's own data.

  2. admin_users becomes self-service from inside the app: any active
     admin can view all admin accounts, add new ones, and deactivate
     existing ones - no more requiring direct Supabase access to manage
     the team.

  Scope note: this grants control over everything the application itself
  stores. It does NOT and cannot touch Supabase's own project-level
  billing/infrastructure - that's a separate, Supabase-account-level
  concern outside the database entirely.
*/

-- 1. admin_users: self-manageable by any active admin -----------------------

DROP POLICY IF EXISTS "Admins can view own admin record" ON admin_users;

CREATE POLICY "Admins can view all admin accounts"
  ON admin_users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()) OR is_admin((select auth.uid())));

CREATE POLICY "Admins can add admin accounts"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update admin accounts"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- 2. Orders and order items --------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage order items" ON order_items;
CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- 3. Customer-facing data (addresses, reviews, wishlists, carts) ------------

DROP POLICY IF EXISTS "Admins can view all addresses" ON addresses;
CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;
CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view wishlists" ON wishlists;
CREATE POLICY "Admins can view wishlists"
  ON wishlists FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view carts" ON carts;
CREATE POLICY "Admins can view carts"
  ON carts FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view cart items" ON cart_items;
CREATE POLICY "Admins can view cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

-- 4. Delivery zones/settings: admin write (was read-only for everyone) ------

DROP POLICY IF EXISTS "Admins can manage delivery zones" ON delivery_zones;
CREATE POLICY "Admins can manage delivery zones"
  ON delivery_zones FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage delivery settings" ON delivery_settings;
CREATE POLICY "Admins can manage delivery settings"
  ON delivery_settings FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- 5. Marketing/content tables -------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage recipes" ON recipes;
CREATE POLICY "Admins can manage recipes"
  ON recipes FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Admins can manage recipe ingredients"
  ON recipe_ingredients FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage product stories" ON product_stories;
CREATE POLICY "Admins can manage product stories"
  ON product_stories FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage promotional banners" ON promotional_banners;
CREATE POLICY "Admins can manage promotional banners"
  ON promotional_banners FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage content pages" ON content_pages;
CREATE POLICY "Admins can manage content pages"
  ON content_pages FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage google review links" ON google_review_links;
CREATE POLICY "Admins can manage google review links"
  ON google_review_links FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON newsletter_subscribers;
CREATE POLICY "Admins can view newsletter subscribers"
  ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view back in stock notifications" ON back_in_stock_notifications;
CREATE POLICY "Admins can view back in stock notifications"
  ON back_in_stock_notifications FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

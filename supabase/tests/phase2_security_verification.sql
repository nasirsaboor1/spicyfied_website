/*
  Phase 2 security remediation — verification script

  Proves, against a disposable local Postgres database, that:
    (a) the vulnerabilities described in SUPABASE_RECONCILIATION_REPORT.md
        and closed by migration 20260911220000_phase2_security_remediation.sql
        are real and reproducible, and
    (b) that migration closes every one of them while leaving every
        legitimate customer/admin flow intact.

  This is NOT a Supabase CLI / pgTAP test — it's a plain SQL script that
  builds a minimal, faithful replica of the relevant tables, functions,
  triggers, and RLS policies (copied verbatim from the migrations, not
  paraphrased), so it can run against any local PostgreSQL 14+ with no
  Docker/Supabase-CLI dependency. It does not touch, connect to, or
  require credentials for the real Supabase project.

  HOW TO RUN

    1. Requires a local PostgreSQL server and a role that can CREATE DATABASE.
    2. Reproduce the BEFORE (vulnerable) state and confirm every exploit
       succeeds:

         createdb spicyfied_rls_test
         psql -d spicyfied_rls_test -v ON_ERROR_STOP=1 -f phase2_security_verification.sql -v phase=before

    3. Apply the real fix migration on top of that same database:

         psql -d spicyfied_rls_test -f ../migrations/20260911220000_phase2_security_remediation.sql

    4. Re-run this script's test sections only (skip schema/seed) and
       confirm every exploit is now blocked and every legitimate flow
       still works:

         psql -d spicyfied_rls_test -v ON_ERROR_STOP=0 -f phase2_security_verification.sql -v phase=after

    5. dropdb spicyfied_rls_test when done.

  Read the \echo banner above each block for the expected result in each
  phase; this script does not assert/abort automatically (RLS failures
  surface as either "0 rows"/"UPDATE 0" or a thrown error depending on
  the operation — both are shown in full so the actual behavior is
  never summarized away).
*/

\if :{?phase}
\else
\set phase 'setup_and_before'
\endif

\echo '################################################################'
\echo '# Phase:' :phase
\echo '################################################################'

\if :{?skip_setup}
\else

-- ============================================================================
-- SCHEMA — minimal replica of the live-relevant tables/functions/triggers/
-- policies, reproducing the CONFIRMED LIVE (pre-fix) production state,
-- including the vulnerable policies, so the exploits can be proven here
-- before the fix migration is applied on top.
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb
);

-- Reproduces Supabase's real auth.uid()/auth.role()/auth.jwt(), which read
-- the `request.jwt.claims` GUC PostgREST sets per request, so RLS policies
-- referencing them behave identically to production.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role';
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS public;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE TABLE admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  base_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  variant_name text NOT NULL,
  price numeric NOT NULL,
  weight_value numeric NOT NULL DEFAULT 1,
  weight_unit text NOT NULL DEFAULT 'g'
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product variants are viewable by everyone" ON product_variants FOR SELECT USING (true);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  status text DEFAULT 'pending',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  shipping_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_method text,
  payment_id text,
  razorpay_order_id text,
  delivery_type text NOT NULL DEFAULT 'delivery',
  shipping_address_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  variant_id uuid REFERENCES product_variants(id),
  product_name text NOT NULL,
  variant_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE delivery_zones (
  pincode text PRIMARY KEY,
  label text,
  delivery_fee numeric NOT NULL DEFAULT 0
);
CREATE TABLE delivery_settings (
  id boolean PRIMARY KEY DEFAULT true,
  outside_zone_fee numeric NOT NULL DEFAULT 50
);
INSERT INTO delivery_settings (id, outside_zone_fee) VALUES (true, 50);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  title text,
  comment text,
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE promotional_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  link_url text,
  is_active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz
);
ALTER TABLE promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE TABLE google_review_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text NOT NULL,
  review_url text NOT NULL,
  is_active boolean DEFAULT true
);
ALTER TABLE google_review_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE product_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  story_title text,
  story_content text,
  heritage_info text,
  sourcing_details text
);
ALTER TABLE product_stories ENABLE ROW LEVEL SECURITY;

CREATE TABLE back_in_stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  is_notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE back_in_stock_notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  is_active boolean DEFAULT true
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id)
);
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Functions — bodies copied verbatim from the committed migrations.
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = user_id AND admin_users.is_active = true);
END; $$;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO anon, authenticated; -- live (pre-fix) state

CREATE OR REPLACE FUNCTION get_delivery_fee(p_postal_code text)
RETURNS decimal LANGUAGE plpgsql STABLE AS $$
DECLARE zone_fee decimal; fallback_fee decimal;
BEGIN
  SELECT delivery_fee INTO zone_fee FROM delivery_zones WHERE pincode = trim(p_postal_code);
  IF zone_fee IS NOT NULL THEN RETURN zone_fee; END IF;
  SELECT outside_zone_fee INTO fallback_fee FROM delivery_settings WHERE id = true;
  RETURN COALESCE(fallback_fee, 50);
END; $$;
GRANT EXECUTE ON FUNCTION get_delivery_fee(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_order_item_pricing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE catalog_price numeric;
BEGIN
  IF NEW.variant_id IS NULL THEN RAISE EXCEPTION 'order_items.variant_id is required for pricing'; END IF;
  SELECT price INTO catalog_price FROM product_variants WHERE id = NEW.variant_id;
  IF catalog_price IS NULL THEN RAISE EXCEPTION 'Unknown product variant %', NEW.variant_id; END IF;
  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN RAISE EXCEPTION 'order_items.quantity must be >= 1'; END IF;
  NEW.unit_price := catalog_price;
  NEW.total_price := catalog_price * NEW.quantity;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_order_item_pricing ON order_items;
CREATE TRIGGER trg_enforce_order_item_pricing
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_pricing();

CREATE OR REPLACE FUNCTION public.recompute_order_totals(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_subtotal numeric; v_tax numeric; v_shipping numeric; v_delivery_type text;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal FROM order_items WHERE order_id = p_order_id;
  SELECT o.delivery_type INTO v_delivery_type FROM orders o WHERE o.id = p_order_id;
  v_tax := round(v_subtotal * 0.05, 2);
  IF v_delivery_type = 'pickup' THEN v_shipping := 0; ELSE v_shipping := 50; END IF;
  UPDATE orders SET subtotal = v_subtotal, tax_amount = v_tax, shipping_amount = v_shipping,
      total_amount = v_subtotal + v_tax + v_shipping WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.recompute_order_totals(uuid) TO anon, authenticated; -- live (pre-fix) state

CREATE OR REPLACE FUNCTION public.trg_recompute_order_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_order_totals(COALESCE(NEW.order_id, OLD.order_id));
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_order_items_recompute_totals ON order_items;
CREATE TRIGGER trg_order_items_recompute_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_order_totals();

CREATE OR REPLACE FUNCTION public.enforce_review_integrity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_purchase boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = NEW.user_id AND oi.product_id = NEW.product_id
  ) INTO has_purchase;
  NEW.is_verified_purchase := has_purchase;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_review_integrity ON reviews;
CREATE TRIGGER trg_enforce_review_integrity
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_integrity();

-- Policies — the CONFIRMED LIVE (pre-fix) production state, vulnerable
-- policies included, so the exploits below are proven against a faithful
-- model before the real fix migration is applied on top of this database.
CREATE POLICY "Admins can view all admin accounts" ON admin_users FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage orders" ON orders FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can create own orders" ON orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Users can view own orders" ON orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all orders" ON orders FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can manage order items" ON order_items FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can insert order items for own orders" ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can view all order items" ON order_items FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Admins can manage all reviews" ON reviews FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Admins can manage reviews" ON reviews FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews FOR SELECT
  USING (is_approved = true);
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage promotional banners" ON promotional_banners FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can manage promotional banners" ON promotional_banners FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view active promotional banners" ON promotional_banners FOR SELECT
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Admins can manage google review links" ON google_review_links FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can manage google review links" ON google_review_links FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view active google review links" ON google_review_links FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage product stories" ON product_stories FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can insert product stories" ON product_stories FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can update product stories" ON product_stories FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view product stories" ON product_stories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can request back in stock notification" ON back_in_stock_notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can subscribe to back in stock notifications" ON back_in_stock_notifications FOR INSERT
  TO public WITH CHECK (true);
CREATE POLICY "Admins can view back in stock notifications" ON back_in_stock_notifications FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view all notifications" ON back_in_stock_notifications FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can update notifications" ON back_in_stock_notifications FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage subscribers" ON newsletter_subscribers FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins can view newsletter subscribers" ON newsletter_subscribers FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view subscribers" ON newsletter_subscribers FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can manage categories" ON categories FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images" ON product_images FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can manage product images" ON product_images FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin') WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Product images are viewable by everyone" ON product_images FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- SEED DATA
-- ============================================================================
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'customer-a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'customer-b@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');

INSERT INTO admin_users (id, email, is_active) VALUES
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', true);

INSERT INTO products (id, name, slug, base_price) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Turmeric Powder', 'turmeric-powder', 100),
  ('10000000-0000-0000-0000-000000000002', 'Cardamom', 'cardamom', 200);
INSERT INTO product_variants (id, product_id, variant_name, price) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '100g', 150.00);

-- Customer A's paid order + item (real catalog price 150 x 2 = 300; seeded
-- with deliberately wrong unit_price/total_price to prove the pricing
-- trigger overwrites them even for a superuser-issued INSERT).
INSERT INTO orders (id, order_number, user_id, email, status, subtotal, total_amount, delivery_type)
VALUES ('30000000-0000-0000-0000-00000000000a', 'ORD-TEST-A', '00000000-0000-0000-0000-00000000000a', 'customer-a@example.com', 'pending', 0, 0, 'pickup');
INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, total_price)
VALUES ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Turmeric Powder', '100g', 1, 2, 1);

-- Customer B's own order (must be invisible to Customer A)
INSERT INTO orders (id, order_number, user_id, email, status, subtotal, total_amount, delivery_type)
VALUES ('30000000-0000-0000-0000-00000000000b', 'ORD-TEST-B', '00000000-0000-0000-0000-00000000000b', 'customer-b@example.com', 'pending', 0, 0, 'pickup');

-- Customer A's own review (unapproved by default) on the product they
-- actually purchased (Turmeric) — used to test moderation-field locking.
INSERT INTO reviews (id, product_id, user_id, rating, title, comment)
VALUES ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 5, 'Great', 'Good stuff');

INSERT INTO promotional_banners (id, title, content, link_url, is_active)
VALUES ('50000000-0000-0000-0000-000000000001', 'Diwali Sale', '20% off', 'https://spicyfied.in/shop', true);
INSERT INTO google_review_links (id, google_place_id, review_url, is_active)
VALUES ('60000000-0000-0000-0000-000000000001', 'place123', 'https://g.page/r/legit-link', true);
INSERT INTO product_stories (id, product_id, story_title, story_content)
VALUES ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Our Turmeric', 'Sourced from Erode.');

-- Customer B's back-in-stock request (must be invisible to Customer A)
INSERT INTO back_in_stock_notifications (id, email, product_id)
VALUES ('80000000-0000-0000-0000-000000000001', 'customer-b@example.com', '10000000-0000-0000-0000-000000000001');

\echo 'seed sanity check: order_items pricing trigger must have overwritten (1,1) -> (150.00,300.00), and orders totals must be 315.00 (300 + 5% tax, pickup=0 shipping)'
SELECT unit_price, quantity, total_price FROM order_items WHERE order_id = '30000000-0000-0000-0000-00000000000a';
SELECT order_number, subtotal, tax_amount, shipping_amount, total_amount FROM orders ORDER BY order_number;

\endif

-- ============================================================================
-- EXPLOIT ATTEMPTS — every attempt is wrapped in its own transaction and
-- rolled back so a "successful" exploit doesn't corrupt state for later
-- tests. Run in "before" phase: every one of these should SUCCEED (proving
-- the vulnerability). Run again in "after" phase (post-migration): every
-- one should FAIL or return zero rows (proving the fix).
-- ============================================================================

\echo '=== [1] Customer A: UPDATE promotional_banners (BEFORE=1 row changed / AFTER=0 rows) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE promotional_banners SET link_url = 'https://evil.example.com/phish' WHERE id = '50000000-0000-0000-0000-000000000001';
SELECT title, link_url FROM promotional_banners WHERE id = '50000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo '=== [2] Customer A: INSERT promotional_banners (BEFORE=succeeds / AFTER=RLS error) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
INSERT INTO promotional_banners (title, link_url, is_active) VALUES ('evil', 'https://evil.example.com', true);
ROLLBACK;

\echo '=== [3] Customer A: UPDATE google_review_links (BEFORE=1 row changed / AFTER=0 rows) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE google_review_links SET review_url = 'https://evil.example.com' WHERE id = '60000000-0000-0000-0000-000000000001';
SELECT review_url FROM google_review_links WHERE id = '60000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo '=== [4] Customer A: UPDATE product_stories (BEFORE=1 row changed / AFTER=0 rows) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE product_stories SET story_content = 'defaced' WHERE id = '70000000-0000-0000-0000-000000000001';
SELECT story_content FROM product_stories WHERE id = '70000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo '=== [5a] Customer A: SELECT all back_in_stock_notifications, incl. Customer B email (BEFORE>=1 row incl. customer-b / AFTER=0 rows) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SELECT email, product_id FROM back_in_stock_notifications;
ROLLBACK;

\echo '=== [5b] Customer A: UPDATE Customer B''s back_in_stock_notifications row (BEFORE=1 row changed / AFTER=0 rows) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE back_in_stock_notifications SET is_notified = true WHERE id = '80000000-0000-0000-0000-000000000001';
SELECT is_notified FROM back_in_stock_notifications WHERE id = '80000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo '=== [6] Customer A: self-approve own review via UPDATE is_approved=true (BEFORE=true / AFTER=stays false) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE reviews SET is_approved = true WHERE id = '40000000-0000-0000-0000-00000000000a';
SELECT is_approved FROM reviews WHERE id = '40000000-0000-0000-0000-00000000000a';
ROLLBACK;

\echo '=== [7] Customer A: INSERT new review with is_approved=true (BEFORE=true / AFTER=forced false) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
INSERT INTO reviews (product_id, user_id, rating, title, comment, is_approved)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 1, 'spam', 'spam review', true)
RETURNING is_approved;
ROLLBACK;

\echo '=== [8] Customer A: INSERT review with is_verified_purchase=true for an UNPURCHASED product, Cardamom (ALWAYS false - pre-existing trg_enforce_review_integrity, unrelated to this migration, confirms the harness models truth correctly) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
INSERT INTO reviews (product_id, user_id, rating, is_verified_purchase)
VALUES ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 5, true)
RETURNING is_verified_purchase;
ROLLBACK;

\echo '=== [9] Customer A: reassign own review to a different product_id via UPDATE (BEFORE=succeeds / AFTER=forced back to original) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE reviews SET product_id = '10000000-0000-0000-0000-000000000002' WHERE id = '40000000-0000-0000-0000-00000000000a';
SELECT product_id FROM reviews WHERE id = '40000000-0000-0000-0000-00000000000a';
ROLLBACK;

\echo '=== [10] Anonymous: SELECT back_in_stock_notifications (ALWAYS 0 rows - no anon SELECT policy exists before or after; sanity check) ==='
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SELECT count(*) FROM back_in_stock_notifications;
ROLLBACK;

\echo '=== [11] Customer A: call is_admin() directly (BEFORE=succeeds / AFTER=still succeeds - EXECUTE deliberately kept for `authenticated`, see migration comment section 7; only anon/PUBLIC are revoked) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SELECT is_admin('00000000-0000-0000-0000-0000000000ad');
ROLLBACK;

\echo '=== [11b] Anonymous: call is_admin() directly (BEFORE=succeeds / AFTER=permission denied) ==='
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SELECT is_admin('00000000-0000-0000-0000-0000000000ad');
ROLLBACK;

\echo '=== [12] Customer A: call recompute_order_totals() directly against Customer B''s order (BEFORE=succeeds / AFTER=permission denied) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SELECT recompute_order_totals('30000000-0000-0000-0000-00000000000b');
ROLLBACK;

\echo '=== [13] Customer A: read Customer B''s order (ALWAYS 0 rows, and must NOT error even after the is_admin revoke - this is the regression this migration must never cause) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SELECT count(*) FROM orders WHERE id = '30000000-0000-0000-0000-00000000000b';
ROLLBACK;

\echo '=== [14] Customer A: UPDATE own order payment_status (ALWAYS 0 rows changed - no customer UPDATE policy on orders exists at all; unrelated to this migration, re-confirmed here) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
UPDATE orders SET payment_status = 'paid' WHERE id = '30000000-0000-0000-0000-00000000000a';
SELECT payment_status FROM orders WHERE id = '30000000-0000-0000-0000-00000000000a';
ROLLBACK;

-- ============================================================================
-- LEGITIMATE FUNCTIONALITY — must succeed identically in both phases.
-- ============================================================================

\echo '=== [L1] Anyone can read active promotional banners ==='
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SELECT title FROM promotional_banners WHERE is_active = true;
ROLLBACK;

\echo '=== [L2] Anyone can read google review links / product stories ==='
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SELECT review_url FROM google_review_links WHERE is_active = true;
SELECT story_title FROM product_stories;
ROLLBACK;

\echo '=== [L3] A visitor can submit a valid back-in-stock request exactly as the app does it (INSERT, no RETURNING - ProductDetailPage.tsx never chains .select()) ==='
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
INSERT INTO back_in_stock_notifications (email, product_id) VALUES ('real-customer@example.com', '10000000-0000-0000-0000-000000000001');
ROLLBACK;

\echo '=== [L3b] Invalid back-in-stock submissions are rejected (bad email format, then unknown product id) ==='
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
INSERT INTO back_in_stock_notifications (email, product_id) VALUES ('not-an-email', '10000000-0000-0000-0000-000000000001');
ROLLBACK;
BEGIN;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';
INSERT INTO back_in_stock_notifications (email, product_id) VALUES ('real@example.com', '99999999-9999-9999-9999-999999999999');
ROLLBACK;

\echo '=== [L4] Customer A can create a review and edit rating/title/comment on their own review ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
INSERT INTO reviews (product_id, user_id, rating, title, comment) VALUES ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 4, 'Nice', 'Pretty good') RETURNING is_approved;
UPDATE reviews SET rating = 3, title = 'Updated title', comment = 'changed my mind' WHERE id = '40000000-0000-0000-0000-00000000000a';
SELECT rating, title, comment FROM reviews WHERE id = '40000000-0000-0000-0000-00000000000a';
ROLLBACK;

\echo '=== [L5] Checkout flow: Customer A creates an order + order_items; pricing trigger and total-recompute trigger both fire correctly (150 x 3 = 450 subtotal, +5% tax, +0 pickup shipping = 472.50) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
INSERT INTO orders (order_number, user_id, email, delivery_type) VALUES ('ORD-TEST-L5', '00000000-0000-0000-0000-00000000000a', 'customer-a@example.com', 'pickup') RETURNING id \gset l5_
INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, total_price)
VALUES (:'l5_id', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Turmeric Powder', '100g', 1, 3, 1);
SELECT unit_price, quantity, total_price FROM order_items WHERE order_id = :'l5_id';
SELECT subtotal, tax_amount, total_amount FROM orders WHERE id = :'l5_id';
ROLLBACK;

\echo '=== [L6] Admin can manage promotional banners, google review links, product stories, moderate reviews, and update back-in-stock notifications ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
UPDATE promotional_banners SET title = 'Admin edited' WHERE id = '50000000-0000-0000-0000-000000000001';
UPDATE google_review_links SET review_url = 'https://g.page/r/admin-updated' WHERE id = '60000000-0000-0000-0000-000000000001';
UPDATE product_stories SET story_content = 'Admin updated content' WHERE id = '70000000-0000-0000-0000-000000000001';
UPDATE reviews SET is_approved = true WHERE id = '40000000-0000-0000-0000-00000000000a';
UPDATE back_in_stock_notifications SET is_notified = true WHERE id = '80000000-0000-0000-0000-000000000001';
SELECT
  (SELECT title FROM promotional_banners WHERE id = '50000000-0000-0000-0000-000000000001') AS banner_title,
  (SELECT review_url FROM google_review_links WHERE id = '60000000-0000-0000-0000-000000000001') AS review_link,
  (SELECT story_content FROM product_stories WHERE id = '70000000-0000-0000-0000-000000000001') AS story,
  (SELECT is_approved FROM reviews WHERE id = '40000000-0000-0000-0000-00000000000a') AS review_approved,
  (SELECT is_notified FROM back_in_stock_notifications WHERE id = '80000000-0000-0000-0000-000000000001') AS notified;
ROLLBACK;

\echo '=== [L7] Admin can see all orders via the is_admin()-gated policy ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
SELECT count(*) AS orders_visible_to_admin FROM orders;
ROLLBACK;

\echo '=== [L8] Admin sees admin_users via RLS (proves is_admin() still works inside policy evaluation for the authenticated role after the anon-only EXECUTE revoke) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
SELECT count(*) AS admin_rows_visible FROM admin_users;
ROLLBACK;

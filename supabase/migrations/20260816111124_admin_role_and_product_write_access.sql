/*
  # Admin Role and Product Write Access

  1. New Tables
    - `admin_users` - staff accounts allowed to manage the catalog.
      `id` references auth.users(id); membership (not a role column) is
      what grants access. Managed via service_role only - there is no
      self-service signup for admin accounts.

  2. New Function
    - `is_admin(uuid)` - SECURITY DEFINER check used by RLS policies.
      EXECUTE is revoked from anon/authenticated directly (mirrors the
      pattern in the original migrations) - RLS policies that call it
      still work because policy evaluation runs as the defining role.

  3. Schema addition
    - `products.is_active` - the real schema had no way to hide a product
      from the storefront independent of `stock_status`. Defaults true so
      all 9 existing products stay visible.

  4. Security
    - Admins get full INSERT/UPDATE/DELETE on categories, products,
      product_variants, product_images (SELECT was already public).
    - Admins get INSERT/UPDATE/DELETE on the "Product Image" storage
      bucket's objects (was public-read only, no write policy existed).
*/

-- 1. admin_users --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own admin record" ON admin_users;
CREATE POLICY "Admins can view own admin record"
  ON admin_users FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

-- 2. is_admin() ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = user_id
    AND admin_users.is_active = true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO anon, authenticated;

-- 3. products.is_active ---------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 4. Admin write policies --------------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage product variants" ON product_variants;
CREATE POLICY "Admins can manage product variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- Storage: admins can upload/update/delete product photos ------------------------

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'Product Image' AND is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'Product Image' AND is_admin((select auth.uid())))
  WITH CHECK (bucket_id = 'Product Image' AND is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'Product Image' AND is_admin((select auth.uid())));

/*
  # Phone Auth, Delivery Zones, and Payment Gateway Support

  1. Customers / Auth
    - `customers.email` becomes nullable (phone-only signups have no email)
    - `customers.phone` gets a UNIQUE constraint (it's now the primary login identifier)
    - `handle_new_user()` trigger updated to populate `phone` from `auth.users.phone`
      (set by Supabase phone-OTP auth), falling back to metadata, and to tolerate
      a null email

  2. Delivery Zones
    - `delivery_zones` table: admin-editable pincode -> delivery fee mapping.
      Seeded with only 221001 (Varanasi GPO, the pincode given as the delivery
      base) at fee 0. Any other pincode not listed falls back to the flat
      pan-India fee via `get_delivery_fee()`. The shop owner should add the
      remaining pincodes that actually fall inside the 5km radius via the
      admin panel — pincode boundaries don't line up neatly with a radius,
      so this is deliberately not guessed here.
    - `get_delivery_fee(text)` function: returns the fee for a postal code,
      defaulting to the outside-zone flat fee when not listed.
    - `delivery_settings` table: single-row config for the flat outside-zone
      fee (defaults to 50), editable by admins instead of hardcoded.

  3. Payments (Razorpay)
    - `orders.razorpay_order_id` - Razorpay order id created before checkout
    - `payment_transactions.gateway` - which payment gateway processed it

  4. Security
    - RLS enabled on new tables; delivery zone/settings are publicly readable
      (needed to price checkout) but only admin-writable.
*/

-- 1. Customers: make email optional, phone unique -------------------------

ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_phone_key'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_phone_key UNIQUE (phone);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Delivery zones ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS delivery_settings (
  id boolean PRIMARY KEY DEFAULT true,
  outside_zone_fee decimal(10,2) NOT NULL DEFAULT 50,
  base_pincode text NOT NULL DEFAULT '221001',
  base_radius_km decimal(5,2) NOT NULL DEFAULT 5,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT delivery_settings_singleton CHECK (id)
);

INSERT INTO delivery_settings (id, outside_zone_fee, base_pincode, base_radius_km)
VALUES (true, 50, '221001', 5)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS delivery_zones (
  pincode text PRIMARY KEY,
  label text,
  delivery_fee decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO delivery_zones (pincode, label, delivery_fee)
VALUES ('221001', 'Varanasi GPO (base pincode) - Free Delivery', 0)
ON CONFLICT (pincode) DO NOTHING;

CREATE OR REPLACE FUNCTION get_delivery_fee(p_postal_code text)
RETURNS decimal
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  zone_fee decimal;
  fallback_fee decimal;
BEGIN
  SELECT delivery_fee INTO zone_fee
  FROM delivery_zones
  WHERE pincode = trim(p_postal_code);

  IF zone_fee IS NOT NULL THEN
    RETURN zone_fee;
  END IF;

  SELECT outside_zone_fee INTO fallback_fee FROM delivery_settings WHERE id = true;
  RETURN COALESCE(fallback_fee, 50);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_delivery_fee(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_delivery_fee(text) TO anon, authenticated;

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view delivery zones"
  ON delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage delivery zones"
  ON delivery_zones FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Anyone can view delivery settings"
  ON delivery_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage delivery settings"
  ON delivery_settings FOR ALL
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- 3. Payments ----------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN razorpay_order_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'gateway'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN gateway text DEFAULT 'razorpay';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

-- 4. Product photo storage ---------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Admins can upload product images'
  ) THEN
    CREATE POLICY "Admins can upload product images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'product-images' AND is_admin((select auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Admins can update product images'
  ) THEN
    CREATE POLICY "Admins can update product images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'product-images' AND is_admin((select auth.uid())))
      WITH CHECK (bucket_id = 'product-images' AND is_admin((select auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Admins can delete product images'
  ) THEN
    CREATE POLICY "Admins can delete product images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'product-images' AND is_admin((select auth.uid())));
  END IF;
END $$;

-- 5. Admins need to manage products/variants/images directly ----------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admins can manage products'
  ) THEN
    CREATE POLICY "Admins can manage products"
      ON products FOR ALL
      TO authenticated
      USING (is_admin((select auth.uid())))
      WITH CHECK (is_admin((select auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'Admins can manage product variants'
  ) THEN
    CREATE POLICY "Admins can manage product variants"
      ON product_variants FOR ALL
      TO authenticated
      USING (is_admin((select auth.uid())))
      WITH CHECK (is_admin((select auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'Admins can manage product images'
  ) THEN
    CREATE POLICY "Admins can manage product images"
      ON product_images FOR ALL
      TO authenticated
      USING (is_admin((select auth.uid())))
      WITH CHECK (is_admin((select auth.uid())));
  END IF;
END $$;

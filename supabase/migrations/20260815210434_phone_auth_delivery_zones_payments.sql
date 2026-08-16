/*
  # Delivery Zones and Payment Gateway Support

  Rewritten to target the live database's actual schema (orders.user_id,
  no separate customers table, no admin_users table yet - those land in
  later migrations once auth/admin are built against the real schema).

  1. Delivery Zones
    - `delivery_zones` table: admin-editable pincode -> delivery fee mapping.
      Seeded with only 221001 (Varanasi GPO, the pincode given as the delivery
      base) at fee 0. Any other pincode not listed falls back to the flat
      pan-India fee via `get_delivery_fee()`. Pincode boundaries don't line
      up neatly with a radius, so the remaining zone pincodes are left for
      the shop owner to add via the admin panel once it exists.
    - `get_delivery_fee(text)` function: returns the fee for a postal code,
      defaulting to the outside-zone flat fee when not listed.
    - `delivery_settings` table: single-row config for the flat outside-zone
      fee (defaults to 50), editable by admins instead of hardcoded.

  2. Payments (Razorpay)
    - `orders.razorpay_order_id` - Razorpay order id created before checkout
      (orders already has payment_method/payment_id for the completed charge)

  3. Product images
    - The real storage bucket is "Product Image" (not "product-images"),
      currently private with no read policy at all, so no product photo
      is viewable by anyone. Make it public - product photos aren't
      sensitive data for a public storefront.

  4. Security
    - RLS enabled on the new tables; delivery zone/settings are publicly
      readable (needed to price checkout). Admin-only write policies are
      deferred until an admin-role mechanism exists (see the admin CRUD work).
*/

-- 1. Delivery zones ---------------------------------------------------------

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

DROP POLICY IF EXISTS "Anyone can view delivery zones" ON delivery_zones;
CREATE POLICY "Anyone can view delivery zones"
  ON delivery_zones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view delivery settings" ON delivery_settings;
CREATE POLICY "Anyone can view delivery settings"
  ON delivery_settings FOR SELECT
  USING (true);

-- 2. Payments ----------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN razorpay_order_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

-- 3. Product photo storage ---------------------------------------------------

UPDATE storage.buckets SET public = true WHERE id = 'Product Image';

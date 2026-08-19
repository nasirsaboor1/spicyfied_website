/*
  # Customer Profiles, Checkout Completion, and Delivery Type

  Interim customer verification is moving to email OTP (WhatsApp/phone OTP
  is deferred until the API key is available). This migration adds the
  missing pieces needed to finish the checkout flow against the real schema:

  1. `customer_profiles` - the real schema has no `customers` table at all
     (that only existed in stale, never-applied migration files). Customer
     accounts are now created via Supabase Auth email OTP, and this table
     stores the phone number + display name against that auth user, with a
     `phone_verified` flag left in place for when phone/WhatsApp OTP lands
     later. Auto-created via trigger on signup so it always exists once a
     session is live, same pattern as the old (unapplied) customers trigger.

  2. `orders.delivery_type` - distinguishes in-store pickup from delivery.
     Cash is only ever allowed for pickup; delivery requires online payment
     (card/UPI via Razorpay). Enforced with a CHECK constraint rather than
     just client-side validation.

  3. `order_items` INSERT policy - customers could already view their own
     order items but had no way to insert them, which would have made
     checkout fail at the final step. Missed when the master-admin
     migration widened order_items access for admins only.
*/

-- 1. customer_profiles --------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON customer_profiles;
CREATE POLICY "Users can view own profile"
  ON customer_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON customer_profiles;
CREATE POLICY "Users can insert own profile"
  ON customer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON customer_profiles;
CREATE POLICY "Users can update own profile"
  ON customer_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON customer_profiles;
CREATE POLICY "Admins can view all profiles"
  ON customer_profiles FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

CREATE OR REPLACE FUNCTION public.handle_new_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_customer_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_profile();

-- 2. orders.delivery_type -----------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_type text NOT NULL DEFAULT 'delivery';
  END IF;
END $$;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_delivery_type_check
  CHECK (delivery_type IN ('pickup', 'delivery'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cod_pickup_only_check;
ALTER TABLE orders ADD CONSTRAINT orders_cod_pickup_only_check
  CHECK (payment_method IS DISTINCT FROM 'cod' OR delivery_type = 'pickup');

-- 3. order_items INSERT policy for customers ----------------------------------

DROP POLICY IF EXISTS "Users can insert order items for own orders" ON order_items;
CREATE POLICY "Users can insert order items for own orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

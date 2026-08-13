/*
  # Create Complete E-commerce Schema

  1. New Tables
    - `customers`
      - `id` (uuid, primary key) - Unique customer identifier, linked to auth.users
      - `email` (text, unique) - Customer email address
      - `full_name` (text) - Customer full name
      - `phone` (text) - Customer phone number
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
    - `addresses`
      - `id` (uuid, primary key) - Unique address identifier
      - `customer_id` (uuid, foreign key) - References customers table
      - `address_type` (text) - Type: 'home', 'work', 'other'
      - `full_name` (text) - Recipient name
      - `phone` (text) - Contact phone number
      - `address_line1` (text) - Street address line 1
      - `address_line2` (text) - Street address line 2
      - `city` (text) - City name
      - `state` (text) - State name
      - `postal_code` (text) - PIN code
      - `country` (text) - Country (default 'India')
      - `is_default` (boolean) - Default address flag
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
    - `orders`
      - `id` (uuid, primary key) - Unique order identifier
      - `order_number` (text, unique) - Human-readable order number
      - `customer_id` (uuid, foreign key) - References customers table
      - `status` (text) - Order status: 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
      - `subtotal` (decimal) - Items subtotal
      - `tax_amount` (decimal) - Tax amount
      - `shipping_fee` (decimal) - Shipping charges
      - `discount_amount` (decimal) - Discount applied
      - `total_amount` (decimal) - Final total amount
      - `payment_method` (text) - Payment method used
      - `payment_status` (text) - Payment status: 'pending', 'paid', 'failed', 'refunded'
      - `shipping_address_id` (uuid, foreign key) - References addresses table
      - `notes` (text) - Customer notes/instructions
      - `tracking_number` (text) - Shipping tracking number
      - `estimated_delivery` (date) - Estimated delivery date
      - `delivered_at` (timestamptz) - Actual delivery timestamp
      - `cancelled_at` (timestamptz) - Cancellation timestamp
      - `created_at` (timestamptz) - Order creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
    - `order_items`
      - `id` (uuid, primary key) - Unique order item identifier
      - `order_id` (uuid, foreign key) - References orders table
      - `product_id` (uuid, foreign key) - References products table
      - `variant_id` (uuid, foreign key) - References product_variants table
      - `product_name` (text) - Product name snapshot
      - `variant_size` (text) - Variant size snapshot
      - `price` (decimal) - Price at time of order
      - `quantity` (integer) - Quantity ordered
      - `subtotal` (decimal) - Item subtotal (price * quantity)
      - `created_at` (timestamptz) - Record creation timestamp
      
    - `order_status_history`
      - `id` (uuid, primary key) - Unique history entry identifier
      - `order_id` (uuid, foreign key) - References orders table
      - `status` (text) - Status value
      - `notes` (text) - Status change notes
      - `created_at` (timestamptz) - Status change timestamp
      
    - `payment_transactions`
      - `id` (uuid, primary key) - Unique transaction identifier
      - `order_id` (uuid, foreign key) - References orders table
      - `transaction_id` (text) - Payment gateway transaction ID
      - `payment_method` (text) - Payment method used
      - `amount` (decimal) - Transaction amount
      - `status` (text) - Transaction status: 'pending', 'success', 'failed'
      - `gateway_response` (jsonb) - Full gateway response data
      - `created_at` (timestamptz) - Transaction timestamp
      
    - `wishlists`
      - `id` (uuid, primary key) - Unique wishlist entry identifier
      - `customer_id` (uuid, foreign key) - References customers table
      - `product_id` (uuid, foreign key) - References products table
      - `created_at` (timestamptz) - Added to wishlist timestamp
      
    - `coupons`
      - `id` (uuid, primary key) - Unique coupon identifier
      - `code` (text, unique) - Coupon code
      - `discount_type` (text) - Type: 'percentage', 'fixed'
      - `discount_value` (decimal) - Discount value
      - `min_order_value` (decimal) - Minimum order value required
      - `max_discount` (decimal) - Maximum discount cap (for percentage)
      - `usage_limit` (integer) - Total usage limit
      - `usage_count` (integer) - Current usage count
      - `valid_from` (timestamptz) - Valid from date
      - `valid_until` (timestamptz) - Valid until date
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz) - Creation timestamp

  2. Modifications
    - Add inventory fields to `product_variants` table
      - `stock_quantity` (integer) - Available stock
      - `low_stock_threshold` (integer) - Low stock alert threshold

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their own data
    - Add policies for order management and customer data protection

  4. Indexes
    - Add indexes on foreign keys and frequently queried fields
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_type text NOT NULL DEFAULT 'home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  subtotal decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  shipping_fee decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount decimal(10,2) NOT NULL DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  shipping_address_id uuid REFERENCES addresses(id),
  notes text,
  tracking_number text,
  estimated_delivery date,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  variant_size text NOT NULL,
  price decimal(10,2) NOT NULL,
  quantity integer NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transaction_id text,
  payment_method text NOT NULL,
  amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  gateway_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  min_order_value decimal(10,2) DEFAULT 0,
  max_discount decimal(10,2),
  usage_limit integer,
  usage_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add inventory fields to product_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN stock_quantity integer DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN low_stock_threshold integer DEFAULT 10;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(customer_id, is_default);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_customer_id ON wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view own customer profile"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own customer profile"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own customer profile"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for addresses
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Users can create own addresses"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update own pending orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid());

-- RLS Policies for order_items
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items for own orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- RLS Policies for order_status_history
CREATE POLICY "Users can view own order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payment_transactions.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- RLS Policies for wishlists
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Users can add to own wishlist"
  ON wishlists FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can remove from own wishlist"
  ON wishlists FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- RLS Policies for coupons
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND valid_from <= now() AND (valid_until IS NULL OR valid_until >= now()));

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

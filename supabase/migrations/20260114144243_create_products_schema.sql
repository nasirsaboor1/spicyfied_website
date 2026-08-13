/*
  # Create Spicyfied E-commerce Database Schema

  1. New Tables
    - `products`
      - `id` (uuid, primary key) - Unique product identifier
      - `name` (text) - Product name
      - `slug` (text, unique) - URL-friendly product identifier
      - `description` (text) - Detailed product description
      - `health_benefits` (text) - Health benefits information
      - `category` (text) - Product category (whole-spices, dry-fruits, seeds)
      - `is_bestseller` (boolean) - Whether product is a bestseller
      - `is_active` (boolean) - Whether product is active/visible
      - `created_at` (timestamptz) - Record creation timestamp
      
    - `product_variants`
      - `id` (uuid, primary key) - Unique variant identifier
      - `product_id` (uuid, foreign key) - References products table
      - `size` (text) - Variant size (50g, 100g, etc.)
      - `price` (decimal) - Variant price
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz) - Record creation timestamp
      
    - `product_images`
      - `id` (uuid, primary key) - Unique image identifier
      - `product_id` (uuid, foreign key) - References products table
      - `image_url` (text) - Image URL
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (since this is an e-commerce site)
    - Products and related data are publicly readable
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  health_benefits text NOT NULL DEFAULT '',
  category text NOT NULL,
  is_bestseller boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price decimal(10,2) NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_bestseller ON products(is_bestseller);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (e-commerce products are publicly visible)
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view product variants"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);
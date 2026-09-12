export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  health_benefits: string;
  category: string;
  is_bestseller: boolean;
  is_active: boolean;
  stock_status: StockStatus;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  weight_unit: string;
  price: number;
  stock_quantity: number;
  sort_order: number;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  /** Resized WebP variant URLs, derived from image_url by filename
   * convention (see lib/imageProcessing.ts). May point at an object that
   * doesn't exist in Storage yet (an image uploaded before this pipeline
   * existed, or a variant that failed to generate) — always pair with a
   * fallback to image_url, never assume these resolve. */
  thumb_url: string;
  medium_url: string;
  sort_order: number;
  created_at: string;
}

export interface ProductStory {
  title: string | null;
  content: string | null;
  heritage: string | null;
  sourcing: string | null;
}

export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
  story: ProductStory | null;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  image?: string;
  /** Always-resolving original, shown if `image` (a resized variant) 404s. */
  imageFallback?: string;
}

export type Category = 'whole-spices' | 'dry-fruits' | 'seeds';

export interface CategoryInfo {
  id: Category;
  name: string;
  slug: string;
  image?: string;
}

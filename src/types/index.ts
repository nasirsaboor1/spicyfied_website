export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  health_benefits: string;
  category: string;
  category_name: string;
  is_bestseller: boolean;
  is_active: boolean;
  stock_status: StockStatus;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  price: number;
  stock_quantity: number;
  sort_order: number;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
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
}


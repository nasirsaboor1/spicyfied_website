export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  health_benefits: string;
  category: string;
  is_bestseller: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  price: number;
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

export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  image?: string;
}

export type Category = 'whole-spices' | 'dry-fruits' | 'seeds';

export interface CategoryInfo {
  id: Category;
  name: string;
  slug: string;
  image?: string;
}

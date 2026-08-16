import { supabase } from './supabase';
import { Product, ProductVariant, ProductImage, ProductWithDetails } from '../types';

const IMAGE_BUCKET = 'Product Image';

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  const objectPath = path.startsWith('/') ? path.slice(1) : path;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

const PRODUCT_SELECT = '*, categories(slug, name), product_variants(*), product_images(*)';

interface RawVariant {
  id: string;
  product_id: string;
  variant_name: string;
  price: number;
  is_default: boolean;
}

interface RawImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface RawProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  health_benefits: string | null;
  is_featured: boolean;
  stock_status: string;
  created_at: string;
  categories: { slug: string; name: string } | null;
  product_variants: RawVariant[];
  product_images: RawImage[];
}

function normalizeVariants(variants: RawVariant[]): ProductVariant[] {
  return [...variants]
    .sort((a, b) => (a.is_default === b.is_default ? a.price - b.price : a.is_default ? -1 : 1))
    .map((v, index) => ({
      id: v.id,
      product_id: v.product_id,
      size: v.variant_name,
      price: Number(v.price),
      sort_order: index,
      created_at: '',
    }));
}

function normalizeImages(images: RawImage[]): ProductImage[] {
  return [...images]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.display_order - b.display_order;
    })
    .map((img, index) => ({
      id: img.id,
      product_id: img.product_id,
      image_url: resolveImageUrl(img.image_url),
      sort_order: index + 1,
      created_at: '',
    }));
}

function normalizeProduct(row: RawProduct): ProductWithDetails {
  const product: Product = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    health_benefits: row.health_benefits || '',
    category: row.categories?.slug || '',
    is_bestseller: row.is_featured,
    is_active: true,
    created_at: row.created_at,
  };

  return {
    ...product,
    variants: normalizeVariants(row.product_variants || []),
    images: normalizeImages(row.product_images || []),
  };
}

export async function fetchProductsWithDetails(): Promise<ProductWithDetails[]> {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT);
  if (error) throw error;
  return (data as unknown as RawProduct[] || []).map(normalizeProduct);
}

export async function fetchProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeProduct(data as unknown as RawProduct);
}

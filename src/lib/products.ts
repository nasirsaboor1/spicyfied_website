import { supabase } from './supabase';
import { Product, ProductVariant, ProductImage, ProductWithDetails, ProductStory, StockStatus } from '../types';

const IMAGE_BUCKET = 'Product Image';

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  const objectPath = path.startsWith('/') ? path.slice(1) : path;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

// Mirrors lib/imageProcessing.ts's deriveVariantPath — kept as a small,
// dependency-free duplicate here rather than imported, since that module
// pulls in browser-only Canvas APIs that have no place in the data-read
// path (or in the Node-based prerender/merchant-feed build scripts, which
// need this same derivation and can't import browser code either).
function deriveVariantUrl(path: string | null | undefined, suffix: string): string {
  if (!path) return '';
  const objectPath = path.startsWith('/') ? path.slice(1) : path;
  const dot = objectPath.lastIndexOf('.');
  const base = dot === -1 ? objectPath : objectPath.slice(0, dot);
  return resolveImageUrl(`${base}${suffix}.webp`);
}

export function resolveThumbUrl(path: string | null | undefined): string {
  return deriveVariantUrl(path, '--thumb');
}

export function resolveMediumUrl(path: string | null | undefined): string {
  return deriveVariantUrl(path, '--medium');
}

const PRODUCT_SELECT =
  '*, categories(slug, name), product_variants(*), product_images(*), product_stories(story_title, story_content, heritage_info, sourcing_details)';

interface RawVariant {
  id: string;
  product_id: string;
  variant_name: string;
  weight_unit: string;
  price: number;
  stock_quantity: number | null;
  is_default: boolean;
}

const VALID_STOCK_STATUSES: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];

function normalizeStockStatus(status: string | null | undefined): StockStatus {
  return VALID_STOCK_STATUSES.includes(status as StockStatus) ? (status as StockStatus) : 'in_stock';
}

interface RawImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface RawStory {
  story_title: string | null;
  story_content: string | null;
  heritage_info: string | null;
  sourcing_details: string | null;
}

interface RawProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  health_benefits: string | null;
  is_featured: boolean;
  stock_status: string | null;
  created_at: string;
  categories: { slug: string; name: string } | null;
  product_variants: RawVariant[];
  product_images: RawImage[];
  product_stories: RawStory[] | RawStory | null;
}

function normalizeVariants(variants: RawVariant[]): ProductVariant[] {
  return [...variants]
    .sort((a, b) => (a.is_default === b.is_default ? a.price - b.price : a.is_default ? -1 : 1))
    .map((v, index) => ({
      id: v.id,
      product_id: v.product_id,
      size: v.variant_name,
      weight_unit: v.weight_unit,
      price: Number(v.price),
      stock_quantity: v.stock_quantity ?? 0,
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
      thumb_url: resolveThumbUrl(img.image_url),
      medium_url: resolveMediumUrl(img.image_url),
      sort_order: index + 1,
      created_at: '',
    }));
}

function normalizeStory(raw: RawStory[] | RawStory | null): ProductStory | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return null;

  const story: ProductStory = {
    title: row.story_title,
    content: row.story_content,
    heritage: row.heritage_info,
    sourcing: row.sourcing_details,
  };

  const hasContent = story.title || story.content || story.heritage || story.sourcing;
  return hasContent ? story : null;
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
    stock_status: normalizeStockStatus(row.stock_status),
    created_at: row.created_at,
  };

  return {
    ...product,
    variants: normalizeVariants(row.product_variants || []),
    images: normalizeImages(row.product_images || []),
    story: normalizeStory(row.product_stories),
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

export async function fetchProductRatingSummary(
  productId: string
): Promise<{ average: number; count: number }> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('is_approved', true);

  if (error || !data || data.length === 0) {
    return { average: 0, count: 0 };
  }

  const total = data.reduce((sum, r) => sum + r.rating, 0);
  return { average: total / data.length, count: data.length };
}

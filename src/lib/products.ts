import { supabase } from './supabase';
import { Product, ProductVariant, ProductImage, ProductWithDetails, ProductStory, StockStatus } from '../types';

const IMAGE_BUCKET = 'Product Image';
const IMAGE_CDN = import.meta.env.VITE_IMAGE_CDN_URL as string | undefined;

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const objectPath = path.startsWith('/') ? path.slice(1) : path;
  if (IMAGE_CDN) return `${IMAGE_CDN}/${encodeURIComponent(objectPath)}`;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

const PRODUCT_SELECT =
  '*, categories(slug, name), product_variants(*), product_images(*), product_stories(story_title, story_content, heritage_info, sourcing_details)';

// Grid/listing views (home, shop, recipe matches, related products) only ever
// render a name, category, up to two images, and variant price/stock — never
// the story text or the rest of the images. Fetching the full PRODUCT_SELECT
// for every listing multiplies egress by every image and the story blob on
// every product, for data that's thrown away unrendered.
const PRODUCT_LIST_SELECT =
  'id, name, slug, description, health_benefits, is_featured, stock_status, created_at, categories(slug, name), product_variants(*), product_images(id, product_id, image_url, display_order, is_primary)';

interface RawVariant {
  id: string;
  product_id: string;
  variant_name: string;
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
    category_name: row.categories?.name || '',
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

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

// Header, Footer, and every page that lists products or categories fetch
// independently on mount. Without this, navigating Home -> Shop -> Home
// re-fetches the same catalog from Supabase every time, and several
// components mounting together (Header + Footer + the page itself) each
// fire their own request for the same data. Caching the result for a few
// minutes, and sharing one in-flight request across concurrent callers,
// cuts that down to a single network call per cache window.
let categoriesCache: { data: StorefrontCategory[]; expiresAt: number } | null = null;
let categoriesInFlight: Promise<StorefrontCategory[]> | null = null;

export function fetchCategories(forceRefresh = false): Promise<StorefrontCategory[]> {
  if (!forceRefresh && categoriesCache && Date.now() < categoriesCache.expiresAt) {
    return Promise.resolve(categoriesCache.data);
  }
  if (!forceRefresh && categoriesInFlight) return categoriesInFlight;

  categoriesInFlight = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image_url')
      .order('display_order');
    categoriesInFlight = null;
    if (error) throw error;
    categoriesCache = { data: data || [], expiresAt: Date.now() + CACHE_TTL_MS };
    return categoriesCache.data;
  })();
  return categoriesInFlight;
}

let productListCache: { data: ProductWithDetails[]; expiresAt: number } | null = null;
let productListInFlight: Promise<ProductWithDetails[]> | null = null;

// Lightweight fetch for grid/listing views - see PRODUCT_LIST_SELECT.
export function fetchProductsForListing(forceRefresh = false): Promise<ProductWithDetails[]> {
  if (!forceRefresh && productListCache && Date.now() < productListCache.expiresAt) {
    return Promise.resolve(productListCache.data);
  }
  if (!forceRefresh && productListInFlight) return productListInFlight;

  productListInFlight = (async () => {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_LIST_SELECT)
      .order('is_primary', { foreignTable: 'product_images', ascending: false })
      .order('display_order', { foreignTable: 'product_images', ascending: true })
      .limit(2, { foreignTable: 'product_images' });
    productListInFlight = null;
    if (error) throw error;
    const products = ((data as unknown as RawProduct[]) || []).map((row) =>
      normalizeProduct({ ...row, product_stories: null })
    );
    productListCache = { data: products, expiresAt: Date.now() + CACHE_TTL_MS };
    return products;
  })();
  return productListInFlight;
}

// Targeted "related products" fetch - only pulls the handful of products in
// the same category, instead of the whole catalog filtered client-side.
export async function fetchRelatedProducts(
  categorySlug: string,
  excludeProductId: string,
  limit = 4
): Promise<ProductWithDetails[]> {
  if (!categorySlug) return [];
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, health_benefits, is_featured, stock_status, created_at, categories!inner(slug, name), product_variants(*), product_images(id, product_id, image_url, display_order, is_primary)'
    )
    .eq('categories.slug', categorySlug)
    .neq('id', excludeProductId)
    .order('is_primary', { foreignTable: 'product_images', ascending: false })
    .order('display_order', { foreignTable: 'product_images', ascending: true })
    .limit(2, { foreignTable: 'product_images' })
    .limit(limit);
  if (error) throw error;
  return ((data as unknown as RawProduct[]) || []).map((row) =>
    normalizeProduct({ ...row, product_stories: null })
  );
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

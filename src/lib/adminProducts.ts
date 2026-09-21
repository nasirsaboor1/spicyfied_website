import { supabase } from './supabase';
import { resolveImageUrl } from './products';

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AdminVariant {
  id: string;
  product_id: string;
  variant_name: string;
  weight_value: number;
  weight_unit: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  is_default: boolean;
}

export interface AdminImage {
  id: string;
  product_id: string;
  image_url: string;
  resolved_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface AdminStory {
  id: string;
  product_id: string;
  story_title: string | null;
  story_content: string | null;
  heritage_info: string | null;
  sourcing_details: string | null;
}

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  base_price: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_active: boolean;
  tags: string[] | null;
  origin: string | null;
  usage_instructions: string | null;
  health_benefits: string | null;
  stock_status: string;
  categories: { name: string; slug: string } | null;
  product_variants: AdminVariant[];
  product_images: AdminImage[];
  product_stories: AdminStory[];
}

const ADMIN_PRODUCT_SELECT =
  '*, categories(name, slug), product_variants(*), product_images(*), product_stories(*)';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listCategories(): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('display_order');
  if (error) throw error;
  return data || [];
}

export async function createCategory(name: string): Promise<AdminCategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required');

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: trimmed, slug: slugify(trimmed) })
    .select('id, name, slug')
    .single();
  if (error) throw error;
  return data;
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(ADMIN_PRODUCT_SELECT)
    .order('name');
  if (error) throw error;

  return ((data as any[]) || []).map((row) => ({
    ...row,
    product_images: (row.product_images || []).map((img: AdminImage) => ({
      ...img,
      resolved_url: resolveImageUrl(img.image_url),
    })),
  }));
}

export interface ProductFormValues {
  sku: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  base_price: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_active: boolean;
  tags: string[];
  origin: string;
  usage_instructions: string;
  health_benefits: string;
  stock_status: string;
}

export async function createProduct(values: ProductFormValues): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...values })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<void> {
  const { error } = await supabase.from('products').update({ ...values }).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export interface VariantFormValues {
  variant_name: string;
  weight_value: number;
  weight_unit: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  is_default: boolean;
}

export async function createVariant(productId: string, values: VariantFormValues): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .insert({ product_id: productId, ...values });
  if (error) throw error;
}

export async function updateVariant(id: string, values: VariantFormValues): Promise<void> {
  const { error } = await supabase.from('product_variants').update(values).eq('id', id);
  if (error) throw error;
}

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) throw error;
}

export interface StoryFormValues {
  story_title: string;
  story_content: string;
  heritage_info: string;
  sourcing_details: string;
}

export async function upsertProductStory(
  productId: string,
  existingStoryId: string | null,
  values: StoryFormValues
): Promise<void> {
  const payload = {
    story_title: values.story_title || null,
    story_content: values.story_content || null,
    heritage_info: values.heritage_info || null,
    sourcing_details: values.sourcing_details || null,
  };

  if (existingStoryId) {
    const { error } = await supabase.from('product_stories').update(payload).eq('id', existingStoryId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('product_stories').insert({ product_id: productId, ...payload });
    if (error) throw error;
  }
}

const IMAGE_BUCKET = 'Product Image';

export async function uploadProductImage(
  productId: string,
  file: File,
  isPrimary: boolean,
  displayOrder: number
): Promise<void> {
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(safeName, file, { cacheControl: '31536000', upsert: false });
  if (uploadError) throw uploadError;

  if (isPrimary) {
    await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', productId);
  }

  const { error: insertError } = await supabase.from('product_images').insert({
    product_id: productId,
    image_url: `/${safeName}`,
    alt_text: null,
    display_order: displayOrder,
    is_primary: isPrimary,
  });
  if (insertError) throw insertError;
}

export async function setPrimaryImage(productId: string, imageId: string): Promise<void> {
  await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  const { error } = await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId);
  if (error) throw error;
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
}

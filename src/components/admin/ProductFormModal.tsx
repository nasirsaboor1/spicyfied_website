import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Star, Loader, Upload } from 'lucide-react';
import {
  AdminProduct,
  AdminCategory,
  ProductFormValues,
  VariantFormValues,
  slugify,
  createProduct,
  updateProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  uploadProductImage,
  setPrimaryImage,
  deleteProductImage,
} from '../../lib/adminProducts';

interface ProductFormModalProps {
  product: AdminProduct | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: (savedProductId: string) => void;
}

const emptyForm: ProductFormValues = {
  sku: '',
  name: '',
  slug: '',
  description: '',
  category_id: null,
  base_price: 0,
  is_featured: false,
  is_new_arrival: false,
  is_active: true,
  tags: [],
  origin: '',
  usage_instructions: '',
  health_benefits: '',
  stock_status: 'in_stock',
};

const emptyVariant: VariantFormValues = {
  variant_name: '',
  weight_value: 0,
  weight_unit: 'g',
  price: 0,
  compare_at_price: null,
  sku: '',
  stock_quantity: 0,
  is_default: false,
};

export default function ProductFormModal({ product, categories, onClose, onSaved }: ProductFormModalProps) {
  const [productId, setProductId] = useState<string | null>(product?.id || null);
  const [form, setForm] = useState<ProductFormValues>(
    product
      ? {
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description || '',
          category_id: product.category_id,
          base_price: product.base_price,
          is_featured: product.is_featured,
          is_new_arrival: product.is_new_arrival,
          is_active: product.is_active,
          tags: product.tags || [],
          origin: product.origin || '',
          usage_instructions: product.usage_instructions || '',
          health_benefits: product.health_benefits || '',
          stock_status: product.stock_status,
        }
      : emptyForm
  );
  const [tagsInput, setTagsInput] = useState((product?.tags || []).join(', '));
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [variants, setVariants] = useState(product?.product_variants || []);
  const [newVariant, setNewVariant] = useState<VariantFormValues>(emptyVariant);
  const [savingVariant, setSavingVariant] = useState(false);

  const [images, setImages] = useState(product?.product_images || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugTouched]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const values: ProductFormValues = {
      ...form,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      let id = productId;
      if (id) {
        await updateProduct(id, values);
      } else {
        id = await createProduct(values);
        setProductId(id);
      }
      onSaved(id);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!productId) return;
    if (!newVariant.variant_name || newVariant.price <= 0) {
      setError('Variant needs a name and a price greater than 0');
      return;
    }
    setSavingVariant(true);
    setError('');
    try {
      await createVariant(productId, newVariant);
      setNewVariant(emptyVariant);
      onSaved(productId!);
    } catch (err: any) {
      setError(err.message || 'Failed to add variant');
    } finally {
      setSavingVariant(false);
    }
  };

  const handleUpdateVariant = async (id: string, values: VariantFormValues) => {
    setError('');
    try {
      await updateVariant(id, values);
      onSaved(productId!);
    } catch (err: any) {
      setError(err.message || 'Failed to update variant');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('Delete this variant?')) return;
    setError('');
    try {
      await deleteVariant(id);
      setVariants((v) => v.filter((x) => x.id !== id));
      onSaved(productId!);
    } catch (err: any) {
      setError(err.message || 'Failed to delete variant');
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    setUploading(true);
    setError('');
    try {
      await uploadProductImage(productId, file, images.length === 0, images.length + 1);
      onSaved(productId!);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!productId) return;
    setError('');
    try {
      await setPrimaryImage(productId, imageId);
      onSaved(productId!);
    } catch (err: any) {
      setError(err.message || 'Failed to set primary image');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this photo?')) return;
    setError('');
    try {
      await deleteProductImage(imageId);
      setImages((imgs) => imgs.filter((i) => i.id !== imageId));
      onSaved(productId!);
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    }
  };

  useEffect(() => {
    setVariants(product?.product_variants || []);
    setImages(product?.product_images || []);
  }, [product]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">
            {productId ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input
                  required
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  required
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category_id || ''}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₹, shown before variant selection)
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                <select
                  value={form.stock_status}
                  onChange={(e) => setForm({ ...form, stock_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Benefits</label>
              <textarea
                rows={2}
                value={form.health_benefits}
                onChange={(e) => setForm({ ...form, health_benefits: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                <input
                  type="text"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="premium, whole-spice, gourmet"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Visible on website</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Bestseller</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_new_arrival}
                  onChange={(e) => setForm({ ...form, is_new_arrival: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">New Arrival</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-ink text-white py-3 rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : productId ? 'Save Changes' : 'Create Product & Continue'}
            </button>
          </form>

          {!productId && (
            <p className="text-sm text-gray-500 text-center">
              Save the product first to add sizes/prices and photos.
            </p>
          )}

          {productId && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-bold text-gray-900 mb-4">Sizes &amp; Prices</h3>
                <div className="space-y-3">
                  {variants.map((v) => (
                    <VariantRow
                      key={v.id}
                      variant={v}
                      onSave={(values) => handleUpdateVariant(v.id, values)}
                      onDelete={() => handleDeleteVariant(v.id)}
                    />
                  ))}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Size name</label>
                    <input
                      type="text"
                      placeholder="100g"
                      value={newVariant.variant_name}
                      onChange={(e) => setNewVariant({ ...newVariant, variant_name: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weight</label>
                    <input
                      type="number"
                      value={newVariant.weight_value}
                      onChange={(e) => setNewVariant({ ...newVariant, weight_value: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit</label>
                    <select
                      value={newVariant.weight_unit}
                      onChange={(e) => setNewVariant({ ...newVariant, weight_unit: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={newVariant.price}
                      onChange={(e) => setNewVariant({ ...newVariant, price: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      value={newVariant.stock_quantity}
                      onChange={(e) => setNewVariant({ ...newVariant, stock_quantity: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    disabled={savingVariant}
                    className="flex items-center justify-center gap-1 bg-ink text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-bold text-gray-900 mb-4">Photos</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                  {images.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.resolved_url}
                        alt={img.alt_text || ''}
                        className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                      />
                      {img.is_primary && (
                        <div className="absolute top-1 left-1 bg-saffron-light text-ink p-1 rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img.id)}
                            title="Set as primary"
                            className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                          >
                            <Star className="w-3.5 h-3.5 text-ink" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          title="Delete"
                          className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-ink transition-colors text-gray-500 hover:text-ink">
                    {uploading ? (
                      <Loader className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs">Upload</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadImage}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  onSave,
  onDelete,
}: {
  variant: any;
  onSave: (values: VariantFormValues) => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState<VariantFormValues>({
    variant_name: variant.variant_name,
    weight_value: variant.weight_value,
    weight_unit: variant.weight_unit,
    price: variant.price,
    compare_at_price: variant.compare_at_price,
    sku: variant.sku,
    stock_quantity: variant.stock_quantity,
    is_default: variant.is_default,
  });
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<VariantFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setDirty(true);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center bg-white border border-gray-200 rounded-lg p-3">
      <input
        type="text"
        value={values.variant_name}
        onChange={(e) => update({ variant_name: e.target.value })}
        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
      <input
        type="number"
        value={values.price}
        onChange={(e) => update({ price: Number(e.target.value) })}
        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
      <input
        type="number"
        value={values.stock_quantity}
        onChange={(e) => update({ stock_quantity: Number(e.target.value) })}
        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
      <label className="flex items-center gap-1 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={values.is_default}
          onChange={(e) => update({ is_default: e.target.checked })}
        />
        Default
      </label>
      <button
        type="button"
        onClick={() => {
          onSave(values);
          setDirty(false);
        }}
        disabled={!dirty}
        className="px-2 py-1.5 bg-ink text-white rounded text-sm font-medium disabled:opacity-40"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

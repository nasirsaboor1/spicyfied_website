import { useState, useEffect, useRef } from 'react';
import { Loader, Plus, Trash2, Upload, ChevronUp, ChevronDown, ImageOff, Check } from 'lucide-react';
import {
  AdminCategory,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} from '../../lib/adminProducts';
import { compressImage } from '../../lib/compressImage';

export default function AdminCategoriesView() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setCategories(await listCategories());
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const flashSaved = (id: string) => {
    setSavedId(id);
    setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const created = await createCategory(newName);
      setCategories((prev) => [...prev, created]);
      setNewName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add category');
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (cat: AdminCategory) => {
    setSavingId(cat.id);
    setError('');
    try {
      await updateCategory(cat.id, { name: cat.name });
      flashSaved(cat.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save name');
    } finally {
      setSavingId(null);
    }
  };

  const handleUpload = async (cat: AdminCategory, file: File | undefined) => {
    if (!file) return;
    setUploadingId(cat.id);
    setError('');
    try {
      const compressed = await compressImage(file);
      const url = await uploadCategoryImage(compressed);
      await updateCategory(cat.id, { image_url: url });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, image_url: url } : c)));
      flashSaved(cat.id);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingId(null);
      const input = fileInputs.current[cat.id];
      if (input) input.value = '';
    }
  };

  const handleRemoveImage = async (cat: AdminCategory) => {
    if (!confirm(`Remove the image for "${cat.name}"?`)) return;
    setError('');
    try {
      await updateCategory(cat.id, { image_url: null });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, image_url: null } : c)));
    } catch (err: any) {
      setError(err.message || 'Failed to remove image');
    }
  };

  const handleDelete = async (cat: AdminCategory) => {
    if (!confirm(`Delete the category "${cat.name}"? Products in it will become uncategorised.`)) return;
    setError('');
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);
    setError('');
    try {
      await Promise.all(
        reordered.map((c, i) =>
          c.display_order === i ? Promise.resolve() : updateCategory(c.id, { display_order: i })
        )
      );
      setCategories(reordered.map((c, i) => ({ ...c, display_order: i })));
    } catch (err: any) {
      setError(err.message || 'Failed to reorder');
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Categories</h2>
        <p className="text-sm text-gray-500 mb-4">
          Add a category, give it a picture, and use the arrows to set the order it appears in across the
          shop. The picture shows on the homepage "Shop by Category" circles. Recommended: a square image.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add Category'}
          </button>
        </form>

        <div className="space-y-3">
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              className="flex items-center gap-4 border border-gray-200 rounded-lg p-3"
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-cream-soft flex items-center justify-center flex-shrink-0 border border-gray-200">
                  <ImageOff className="w-6 h-6 text-gray-400" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) =>
                      setCategories((prev) =>
                        prev.map((c) => (c.id === cat.id ? { ...c, name: e.target.value } : c))
                      )
                    }
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-transparent"
                  />
                  <button
                    onClick={() => handleRename(cat)}
                    disabled={savingId === cat.id}
                    className="px-3 py-1.5 text-sm font-medium text-ink border border-gray-300 rounded-lg hover:bg-cream-soft transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {savedId === cat.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : null}
                    {savingId === cat.id ? 'Saving...' : savedId === cat.id ? 'Saved' : 'Save'}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => fileInputs.current[cat.id]?.click()}
                    disabled={uploadingId === cat.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingId === cat.id ? 'Uploading...' : cat.image_url ? 'Replace image' : 'Add image'}
                  </button>
                  {cat.image_url && (
                    <button
                      onClick={() => handleRemoveImage(cat)}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      Remove image
                    </button>
                  )}
                  <input
                    ref={(el) => {
                      fileInputs.current[cat.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(cat, e.target.files?.[0])}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                  className="p-1.5 text-ink hover:bg-cream-soft rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === categories.length - 1}
                  title="Move down"
                  className="p-1.5 text-ink hover:bg-cream-soft rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleDelete(cat)}
                title="Delete category"
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-center py-8 text-gray-500">No categories yet. Add your first one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

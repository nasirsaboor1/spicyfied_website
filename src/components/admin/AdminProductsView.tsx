import { useState, useEffect, useMemo } from 'react';
import {
  Loader,
  Search,
  Package,
  Plus,
  Edit,
  Trash2,
  Star,
  EyeOff,
  AlertTriangle,
  Layers,
  IndianRupee,
  ImageOff,
  Tags,
  Download,
  List,
  LayoutList,
  Check,
} from 'lucide-react';
import {
  AdminProduct,
  AdminCategory,
  listAdminProducts,
  listCategories,
  deleteProduct,
} from '../../lib/adminProducts';
import { exportProductsToExcel } from '../../lib/exportProducts';
import ProductFormModal from './ProductFormModal';

const STOCK_BADGE: Record<string, { label: string; className: string }> = {
  in_stock: { label: 'In Stock', className: 'bg-green-100 text-green-800' },
  low_stock: { label: 'Low Stock', className: 'bg-amber-100 text-amber-800' },
  out_of_stock: { label: 'Out of Stock', className: 'bg-red-100 text-red-800' },
};

export default function AdminProductsView() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | 'new'>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        listAdminProducts(),
        listCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = async (savedProductId: string) => {
    const productsData = await listAdminProducts();
    setProducts(productsData);
    const fresh = productsData.find((p) => p.id === savedProductId);
    if (fresh) setEditingProduct(fresh);
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product.id);
      setProducts((p) => p.filter((x) => x.id !== product.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportProductsToExcel(products, categories);
    } catch (err: any) {
      alert(err.message || 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.is_active).length;
    const hiddenProducts = totalProducts - activeProducts;

    const byCategory = categories
      .map((c) => ({ id: c.id, name: c.name, count: products.filter((p) => p.category_id === c.id).length }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
    const uncategorisedCount = products.filter((p) => !p.category_id).length;

    let totalUnits = 0;
    let inventoryValue = 0;
    for (const p of products) {
      for (const v of p.product_variants) {
        totalUnits += v.stock_quantity || 0;
        inventoryValue += (v.stock_quantity || 0) * v.price;
      }
    }

    return {
      totalProducts,
      activeProducts,
      hiddenProducts,
      byCategory,
      uncategorisedCount,
      totalUnits,
      inventoryValue,
      lowStockCount: products.filter((p) => p.stock_status === 'low_stock').length,
      outOfStockCount: products.filter((p) => p.stock_status === 'out_of_stock').length,
      featuredCount: products.filter((p) => p.is_featured).length,
      newArrivalCount: products.filter((p) => p.is_new_arrival).length,
      missingImageCount: products.filter((p) => p.product_images.length === 0).length,
      missingVariantCount: products.filter((p) => p.product_variants.length === 0).length,
    };
  }, [products, categories]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
    const matchesStock = !lowStockOnly || p.stock_status === 'low_stock' || p.stock_status === 'out_of_stock';
    return matchesSearch && matchesCategory && matchesStock;
  });

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Package className="w-4 h-4" />
            Products
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
          <p className="text-xs text-gray-500">{stats.activeProducts} active · {stats.hiddenProducts} hidden</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <AlertTriangle className="w-4 h-4" />
            Stock Alerts
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount + stats.outOfStockCount}</p>
          <p className="text-xs text-gray-500">{stats.lowStockCount} low · {stats.outOfStockCount} out</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Layers className="w-4 h-4" />
            Units in Stock
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUnits.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500">across all sizes</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <IndianRupee className="w-4 h-4" />
            Inventory Value
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ₹{Math.round(stats.inventoryValue).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-500">at current stock levels</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Star className="w-4 h-4" />
            Marketing
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.featuredCount}</p>
          <p className="text-xs text-gray-500">featured · {stats.newArrivalCount} new arrivals</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <ImageOff className="w-4 h-4" />
            Needs Attention
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.missingImageCount + stats.missingVariantCount}
          </p>
          <p className="text-xs text-gray-500">
            {stats.missingImageCount} no photo · {stats.missingVariantCount} no sizes
          </p>
        </div>
      </div>

      {(stats.byCategory.length > 0 || stats.uncategorisedCount > 0) && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-3">
            <Tags className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">By Category</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.byCategory.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  categoryFilter === c.id
                    ? 'bg-ink text-white border-ink'
                    : 'border-gray-200 text-gray-700 hover:border-ink/40'
                }`}
              >
                {c.name} <span className="opacity-60">({c.count})</span>
              </button>
            ))}
            {stats.uncategorisedCount > 0 && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200 bg-amber-50 text-amber-800">
                Uncategorised <span className="opacity-70">({stats.uncategorisedCount})</span>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors border ${
              lowStockOnly ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Low/Out of Stock
          </button>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-2.5 transition-colors ${
                viewMode === 'list' ? 'bg-ink text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('detail')}
              title="Detail view (shows stock per size)"
              className={`p-2.5 transition-colors border-l border-gray-300 ${
                viewMode === 'detail' ? 'bg-ink text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
          <button
            onClick={() => setEditingProduct('new')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const primaryImage =
              product.product_images.find((i) => i.is_primary) || product.product_images[0];
            const totalStock = product.product_variants.reduce(
              (sum, v) => sum + (v.stock_quantity || 0),
              0
            );
            const totalValue = product.product_variants.reduce(
              (sum, v) => sum + (v.stock_quantity || 0) * v.price,
              0
            );
            return (
              <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-4 p-3">
                  {primaryImage ? (
                    <img
                      src={primaryImage.resolved_url}
                      alt={product.name}
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-cream-soft rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      {product.is_featured && (
                        <Star className="w-3.5 h-3.5 text-saffron flex-shrink-0" />
                      )}
                      {!product.is_active && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      )}
                      {STOCK_BADGE[product.stock_status] && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STOCK_BADGE[product.stock_status].className}`}
                        >
                          {STOCK_BADGE[product.stock_status].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {product.categories?.name || 'Uncategorised'} &middot; ₹
                      {Math.round(product.base_price)} &middot; {product.product_variants.length}{' '}
                      size{product.product_variants.length !== 1 ? 's' : ''} &middot; {totalStock} units in
                      stock
                      {viewMode === 'detail' && (
                        <>
                          {' '}
                          &middot; ₹{Math.round(totalValue).toLocaleString('en-IN')} stock value
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => setEditingProduct(product)}
                    className="p-2 text-ink hover:bg-cream-soft rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {viewMode === 'detail' && (
                  <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 overflow-x-auto">
                    {product.product_variants.length === 0 ? (
                      <p className="text-sm text-gray-400 py-1">No sizes added yet.</p>
                    ) : (
                      <table className="w-full text-sm min-w-[480px]">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="font-medium py-1.5 pr-4">Size</th>
                            <th className="font-medium py-1.5 pr-4">SKU</th>
                            <th className="font-medium py-1.5 pr-4">Price</th>
                            <th className="font-medium py-1.5 pr-4">Stock</th>
                            <th className="font-medium py-1.5 pr-4">Value</th>
                            <th className="font-medium py-1.5">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.product_variants.map((v) => (
                            <tr key={v.id} className="border-t border-gray-200">
                              <td className="py-1.5 pr-4 text-gray-900">{v.variant_name}</td>
                              <td className="py-1.5 pr-4 font-mono text-xs text-gray-500">{v.sku}</td>
                              <td className="py-1.5 pr-4 text-gray-900">₹{Math.round(v.price)}</td>
                              <td
                                className={`py-1.5 pr-4 font-medium ${
                                  v.stock_quantity <= 0
                                    ? 'text-red-600'
                                    : v.stock_quantity <= 10
                                    ? 'text-amber-600'
                                    : 'text-gray-900'
                                }`}
                              >
                                {v.stock_quantity}
                              </td>
                              <td className="py-1.5 pr-4 text-gray-500">
                                ₹{Math.round((v.stock_quantity || 0) * v.price).toLocaleString('en-IN')}
                              </td>
                              <td className="py-1.5">
                                {v.is_default && <Check className="w-4 h-4 text-moss" />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {editingProduct && (
        <ProductFormModal
          product={editingProduct === 'new' ? null : editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={handleSaved}
          onCategoryCreated={(category) => setCategories((prev) => [...prev, category])}
        />
      )}
    </div>
  );
}

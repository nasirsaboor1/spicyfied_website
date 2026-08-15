import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, Search, Package, AlertTriangle, Edit, Plus } from 'lucide-react';

interface ProductWithVariants {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  product_variants: Array<{
    id: string;
    size: string;
    price: number;
    stock_quantity: number;
    low_stock_threshold: number;
  }>;
}

export default function AdminInventoryView() {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [stockUpdate, setStockUpdate] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [categoryFilter]);

  const loadInventory = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_variants(*)
        `)
        .order('name');

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedVariant || !stockUpdate) return;

    setUpdating(true);
    try {
      const newStock = parseInt(stockUpdate);
      if (isNaN(newStock) || newStock < 0) {
        alert('Please enter a valid stock quantity');
        return;
      }

      const { error } = await supabase
        .from('product_variants')
        .update({ stock_quantity: newStock })
        .eq('id', selectedVariant.id);

      if (error) throw error;

      await loadInventory();
      setSelectedVariant(null);
      setStockUpdate('');
    } catch (err: any) {
      console.error('Error updating stock:', err);
      alert('Failed to update stock');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      await loadInventory();
    } catch (err: any) {
      console.error('Error updating product status:', err);
      alert('Failed to update product status');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLowStockCount = () => {
    let count = 0;
    products.forEach((product) => {
      product.product_variants.forEach((variant) => {
        if (variant.stock_quantity <= variant.low_stock_threshold) {
          count++;
        }
      });
    });
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-[#211C17]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {getLowStockCount() > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-sm font-medium text-yellow-800">
              {getLowStockCount()} variant(s) are low on stock
            </p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="whole-spices">Whole Spices</option>
            <option value="dry-fruits">Dry Fruits</option>
            <option value="seeds">Seeds</option>
          </select>
        </div>

        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#211C17]" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{product.category.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {product.product_variants.map((variant) => {
                  const isLowStock = variant.stock_quantity <= variant.low_stock_threshold;
                  return (
                    <div
                      key={variant.id}
                      className={`border rounded-lg p-3 ${
                        isLowStock ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{variant.size}</span>
                        <button
                          onClick={() => {
                            setSelectedVariant(variant);
                            setStockUpdate(variant.stock_quantity.toString());
                          }}
                          className="p-1 text-[#211C17] hover:bg-[#211C17]/10 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-semibold">₹{Math.round(variant.price)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stock:</span>
                          <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.stock_quantity}
                            {isLowStock && (
                              <AlertTriangle className="inline w-3 h-3 ml-1" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Update Stock</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant: {selectedVariant.size}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stock: {selectedVariant.stock_quantity}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockUpdate}
                  onChange={(e) => setStockUpdate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateStock}
                  disabled={updating}
                  className="flex-1 bg-[#211C17] text-white py-2 rounded-lg font-semibold hover:bg-[#140F0C] transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Stock'}
                </button>
                <button
                  onClick={() => {
                    setSelectedVariant(null);
                    setStockUpdate('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

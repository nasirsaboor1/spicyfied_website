import { useState, useEffect } from 'react';
import { fetchProductsWithDetails } from '../lib/products';
import { ProductWithDetails } from '../types';
import ProductCard from '../components/ProductCard';
import { SlidersHorizontal } from 'lucide-react';

interface ShopPageProps {
  onNavigateToProduct: (slug: string) => void;
  initialCategory?: string;
  searchQuery?: string;
}

export default function ShopPage({ onNavigateToProduct, initialCategory, searchQuery }: ShopPageProps) {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, selectedCategory, priceRange, searchQuery]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const fetchProducts = async () => {
    try {
      const productsWithDetails = await fetchProductsWithDetails();
      setProducts(productsWithDetails);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter((p) => {
      if (p.variants.length === 0) return true;
      const minPrice = Math.min(...p.variants.map((v) => v.price));
      return minPrice >= priceRange[0] && minPrice <= priceRange[1];
    });

    setFilteredProducts(filtered);
  };

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'whole-spices', name: 'Whole Spices' },
    { id: 'dry-fruits', name: 'Dry Fruits' },
    { id: 'seeds', name: 'Seeds' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#211C17] to-[#3F5A34] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Shop Our Collection</h1>
          <p className="text-white/90 text-lg">
            {selectedCategory === 'all'
              ? 'Browse all our premium products'
              : `Explore our ${categories.find((c) => c.id === selectedCategory)?.name || ''}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Filters</h2>
                <button
                  className="lg:hidden"
                  onClick={() => setShowFilters(false)}
                >
                  Close
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Category</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-[#211C17] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Price Range</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#211C17]"
                      placeholder="Min"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#211C17]"
                      placeholder="Max"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    ₹{priceRange[0]} - ₹{priceRange[1]}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPriceRange([0, 10000]);
                }}
                className="w-full py-2 text-[#211C17] border border-[#211C17] rounded-lg font-medium hover:bg-[#211C17] hover:text-white transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          <div className="flex-1">
            <h2 className="sr-only">Products</h2>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-[#211C17] text-white rounded-lg"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-[#211C17] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variants={product.variants}
                    images={product.images}
                    onClick={() => onNavigateToProduct(product.slug)}
                    priority={index < 3}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { fetchProductsWithDetails, fetchCategories, StorefrontCategory } from '../lib/products';
import { ProductWithDetails } from '../types';
import ProductCard from '../components/ProductCard';
import { SlidersHorizontal, PackageSearch } from 'lucide-react';

interface ShopPageProps {
  onNavigateToProduct: (slug: string) => void;
  initialCategory?: string;
  searchQuery?: string;
}

const PRICE_BRACKETS = [
  { id: 'all', label: 'All Prices', min: 0, max: Infinity },
  { id: 'under-200', label: 'Under ₹200', min: 0, max: 200 },
  { id: '200-500', label: '₹200 – ₹500', min: 200, max: 500 },
  { id: '500-1000', label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { id: '1000-2000', label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
  { id: '2000-plus', label: '₹2,000+', min: 2000, max: Infinity },
];

export default function ShopPage({ onNavigateToProduct, initialCategory, searchQuery }: ShopPageProps) {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => initialCategory || new URLSearchParams(window.location.search).get('category') || 'all'
  );
  const [priceBracket, setPriceBracket] = useState<string>(
    () => new URLSearchParams(window.location.search).get('price') || 'all'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories()
      .then(setCategories)
      .catch((error) => console.error('Error fetching categories:', error));
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, selectedCategory, priceBracket, searchQuery]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      updateUrlParams({ category: initialCategory });
    }
  }, [initialCategory]);

  // Keeps the URL in sync with in-page filter changes (not full navigations) so
  // browser back/forward and reloads restore whatever filter was actually applied.
  const updateUrlParams = (next: { category?: string; price?: string }) => {
    const params = new URLSearchParams(window.location.search);
    const category = next.category ?? selectedCategory;
    const price = next.price ?? priceBracket;

    if (category && category !== 'all') params.set('category', category);
    else params.delete('category');

    if (price && price !== 'all') params.set('price', price);
    else params.delete('price');

    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `/shop?${qs}` : '/shop');
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    updateUrlParams({ category: id });
  };

  const handlePriceSelect = (id: string) => {
    setPriceBracket(id);
    updateUrlParams({ price: id });
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setPriceBracket('all');
    updateUrlParams({ category: 'all', price: 'all' });
  };

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

    const bracket = PRICE_BRACKETS.find((b) => b.id === priceBracket) || PRICE_BRACKETS[0];
    filtered = filtered.filter((p) => {
      if (p.variants.length === 0) return true;
      const minPrice = Math.min(...p.variants.map((v) => v.price));
      return minPrice >= bracket.min && minPrice < bracket.max;
    });

    setFilteredProducts(filtered);
  };

  const categoryFilterOptions = [{ slug: 'all', name: 'All Products' }, ...categories];

  const selectedCategoryName = categoryFilterOptions.find((c) => c.slug === selectedCategory)?.name;

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink text-cream py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-[28px] md:text-3xl font-semibold mb-2">
            {selectedCategory === 'all' ? 'Whole Spices, Dry Fruits & Seeds' : selectedCategoryName}
          </h1>
          <p className="text-cream/75 text-lg">
            {selectedCategory === 'all'
              ? 'Hand-cleaned and packed to protect their aroma — nothing added, nothing hidden, ready for everyday cooking.'
              : 'Hand-cleaned and packed to protect their aroma, ready for everyday cooking.'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg border border-black/10 p-6 sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-ink">Filters</h2>
                <button
                  className="lg:hidden text-charcoal/60 text-sm"
                  onClick={() => setShowFilters(false)}
                >
                  Close
                </button>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-3">Category</h3>
                <div className="space-y-2">
                  {categoryFilterOptions.map((category) => (
                    <button
                      key={category.slug}
                      onClick={() => handleCategorySelect(category.slug)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.slug
                          ? 'bg-brand-green text-cream'
                          : 'border border-black/10 text-charcoal hover:border-brand-green/40'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-3">Price</h3>
                <div className="flex flex-wrap gap-2">
                  {PRICE_BRACKETS.map((bracket) => (
                    <button
                      key={bracket.id}
                      onClick={() => handlePriceSelect(bracket.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        priceBracket === bracket.id
                          ? 'bg-brand-green text-cream'
                          : 'border border-black/10 text-charcoal hover:border-brand-green/40'
                      }`}
                    >
                      {bracket.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleResetFilters}
                className="w-full py-2 text-sm text-ink border border-ink rounded-lg font-medium hover:bg-ink hover:text-white transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-charcoal/70 text-sm">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-ink border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <PackageSearch className="w-10 h-10 text-charcoal/30 mx-auto mb-4" />
                <p className="text-ink font-medium mb-1">No products found</p>
                <p className="text-charcoal/60 text-sm mb-6">
                  Try clearing your filters, or browse everything we carry.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-sm text-ink border border-ink rounded-lg font-medium hover:bg-ink hover:text-white transition-colors"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-sm bg-brand-green text-cream rounded-lg font-medium hover:bg-brand-green/90 transition-colors"
                  >
                    View All Products
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variants={product.variants}
                    images={product.images}
                    onClick={() => onNavigateToProduct(product.slug)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

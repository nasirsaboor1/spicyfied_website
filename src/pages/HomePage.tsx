import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductWithDetails } from '../types';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import { ChevronRight } from 'lucide-react';

interface HomePageProps {
  onNavigateToProduct: (slug: string) => void;
  onNavigateToShop: (category?: string) => void;
}

export default function HomePage({ onNavigateToProduct, onNavigateToShop }: HomePageProps) {
  const [bestsellers, setBestsellers] = useState<ProductWithDetails[]>([]);
  const [everydayEssentials, setEverydayEssentials] = useState<ProductWithDetails[]>([]);
  const [healthySnacking, setHealthySnacking] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')

      if (productsError) throw productsError;

      const productsWithDetails = await Promise.all(
        products.map(async (product) => {
          const [variantsResult, imagesResult] = await Promise.all([
            supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', product.id)
              .order('sort_order', { ascending: true }),
            supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('sort_order', { ascending: true }),
          ]);

          return {
            ...product,
            variants: variantsResult.data || [],
            images: imagesResult.data || [],
          };
        })
      );

      const bestsellersData = productsWithDetails.filter((p) => p.is_bestseller);
      setBestsellers(bestsellersData.slice(0, 8));

      const wholeSpices = productsWithDetails.filter(
        (p) => p.category === 'whole-spices'
      );
      setEverydayEssentials(wholeSpices.slice(0, 4));

      const seeds = productsWithDetails.filter((p) => p.category === 'seeds');
      setHealthySnacking(seeds.slice(0, 4));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-[#2d5016] to-[#4a7c24] text-white py-20 px-4">
        <div className="max-w-[1600px] mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Welcome to <span className="text-[#d4af37]">Spicyfied</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
            Choose Pure, Choose Us - Your trusted source for premium spices, dry fruits, and seeds
          </p>
          <button
            onClick={() => onNavigateToShop()}
            className="bg-[#d4af37] text-[#2d5016] px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#c49d2e] transition-all transform hover:scale-105 shadow-xl"
          >
            Shop Now
          </button>
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Shop by Category</h2>
          <p className="text-gray-600 text-lg">Explore our premium collection</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
          <CategoryCard
            title="Whole Spices"
            imageUrl="https://raw.githubusercontent.com/nasirsaboor1/Spice/main/Cardamom%20(1)-min.JPG"
            onClick={() => onNavigateToShop('whole-spices')}
          />
          <CategoryCard
            title="Dry Fruits"
            imageUrl="https://raw.githubusercontent.com/nasirsaboor1/Spice/main/Walnut.jpg"
            onClick={() => onNavigateToShop('dry-fruits')}
          />
          <CategoryCard
            title="Seeds"
            imageUrl="https://raw.githubusercontent.com/nasirsaboor1/Spice/main/Chia%20Seeds-min.JPG"
            onClick={() => onNavigateToShop('seeds')}
          />
          <CategoryCard
            title="Blended Spices"
            comingSoon
          />
        </div>
      </section>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-4 border-[#2d5016] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {bestsellers.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Bestsellers</h2>
                  <p className="text-gray-600">Our most popular products</p>
                </div>
                <button
                  onClick={() => onNavigateToShop()}
                  className="flex items-center gap-2 text-[#2d5016] font-semibold hover:gap-3 transition-all"
                >
                  View All <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bestsellers.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variants={product.variants}
                    images={product.images}
                    onClick={() => onNavigateToProduct(product.slug)}
                  />
                ))}
              </div>
            </section>
          )}

          {everydayEssentials.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Everyday Essentials</h2>
                  <p className="text-gray-600">Must-have spices for your kitchen</p>
                </div>
                <button
                  onClick={() => onNavigateToShop('whole-spices')}
                  className="flex items-center gap-2 text-[#2d5016] font-semibold hover:gap-3 transition-all"
                >
                  View All <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {everydayEssentials.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variants={product.variants}
                    images={product.images}
                    onClick={() => onNavigateToProduct(product.slug)}
                  />
                ))}
              </div>
            </section>
          )}

          {healthySnacking.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Healthy Snacking</h2>
                  <p className="text-gray-600">Nutritious seeds and more</p>
                </div>
                <button
                  onClick={() => onNavigateToShop('seeds')}
                  className="flex items-center gap-2 text-[#2d5016] font-semibold hover:gap-3 transition-all"
                >
                  View All <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {healthySnacking.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variants={product.variants}
                    images={product.images}
                    onClick={() => onNavigateToProduct(product.slug)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductWithDetails } from '../types';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SpiceDrift from '../components/SpiceDrift';
import { ChevronRight, Leaf, Gem, Flame, Crown } from 'lucide-react';

interface HomePageProps {
  onNavigateToProduct: (slug: string) => void;
  onNavigateToShop: (category?: string) => void;
}

const PILLARS = [
  {
    icon: Leaf,
    title: 'Purity',
    copy: 'No fillers, no colouring, nothing hidden — every batch is exactly what it says on the label.',
  },
  {
    icon: Gem,
    title: 'Elegance',
    copy: 'Small-batch sourcing and careful hand-cleaning, so nothing but the spice ever reaches your kitchen.',
  },
  {
    icon: Flame,
    title: 'Taste',
    copy: 'Sun-ripened and freshly ground close to harvest, so the aroma survives the journey to your pantry.',
  },
  {
    icon: Crown,
    title: 'Luxury',
    copy: 'The quality of a private spice merchant, priced for the everyday cook, not just special occasions.',
  },
];

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
    <div className="min-h-screen bg-cream">
      <section className="relative overflow-hidden bg-gradient-to-b from-ink via-ink to-[#3A2A1D] text-cream py-28 px-4">
        <SpiceDrift />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #B8860B 0%, transparent 65%)' }}
          aria-hidden="true"
        />

        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-saffron-light text-xs sm:text-sm font-medium tracking-[0.3em] uppercase mb-6">
            Hand-Selected &middot; Small-Batch &middot; Unadulterated
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-semibold leading-[1.1] mb-6">
            Where Purity <br className="hidden sm:block" />
            Meets <span className="italic text-saffron-light">Luxury</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 text-cream/80 max-w-2xl mx-auto leading-relaxed font-light">
            From sun-dried Kashmiri chillies to hand-cracked cardamom, every batch of Spicyfied
            is sourced, cleaned, and packed to honour the taste nature intended — no fillers,
            no shortcuts, no compromise.
          </p>
          <button
            onClick={() => onNavigateToShop()}
            className="bg-saffron-light text-ink px-9 py-4 rounded-full font-semibold text-lg hover:bg-saffron transition-all transform hover:scale-105 shadow-xl shadow-black/30"
          >
            Explore the Collection
          </button>
        </div>
      </section>

      <section className="border-b border-black/5 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="text-center">
              <pillar.icon className="w-7 h-7 text-saffron mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="font-serif text-lg font-semibold text-ink mb-1">{pillar.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed hidden sm:block">{pillar.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Reveal className="text-center mb-12">
          <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-2">Our Collection</p>
          <h2 className="font-serif text-4xl font-semibold text-ink mb-3">Shop by Category</h2>
          <p className="text-gray-600 text-lg">Every jar tells the story of where it came from</p>
        </Reveal>

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
          <div className="inline-block w-12 h-12 border-4 border-ink border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {bestsellers.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-cream-soft rounded-3xl">
              <Reveal className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-1">Most Loved</p>
                  <h2 className="font-serif text-3xl font-semibold text-ink">Bestsellers</h2>
                </div>
                <button
                  onClick={() => onNavigateToShop()}
                  className="flex items-center gap-2 text-ink font-semibold hover:gap-3 hover:text-paprika transition-all"
                >
                  View All <ChevronRight className="w-5 h-5" />
                </button>
              </Reveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bestsellers.map((product, i) => (
                  <Reveal key={product.id} delayMs={Math.min(i, 4) * 80}>
                    <ProductCard
                      product={product}
                      variants={product.variants}
                      images={product.images}
                      onClick={() => onNavigateToProduct(product.slug)}
                    />
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {everydayEssentials.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <Reveal className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-1">Kitchen Staples</p>
                  <h2 className="font-serif text-3xl font-semibold text-ink">Everyday Essentials</h2>
                </div>
                <button
                  onClick={() => onNavigateToShop('whole-spices')}
                  className="flex items-center gap-2 text-ink font-semibold hover:gap-3 hover:text-paprika transition-all"
                >
                  View All <ChevronRight className="w-5 h-5" />
                </button>
              </Reveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {everydayEssentials.map((product, i) => (
                  <Reveal key={product.id} delayMs={Math.min(i, 4) * 80}>
                    <ProductCard
                      product={product}
                      variants={product.variants}
                      images={product.images}
                      onClick={() => onNavigateToProduct(product.slug)}
                    />
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {healthySnacking.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-cream-soft rounded-3xl">
              <Reveal className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-1">Nutrient Rich</p>
                  <h2 className="font-serif text-3xl font-semibold text-ink">Healthy Snacking</h2>
                </div>
                <button
                  onClick={() => onNavigateToShop('seeds')}
                  className="flex items-center gap-2 text-ink font-semibold hover:gap-3 hover:text-paprika transition-all"
                >
                  View All <ChevronRight className="w-5 h-5" />
                </button>
              </Reveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {healthySnacking.map((product, i) => (
                  <Reveal key={product.id} delayMs={Math.min(i, 4) * 80}>
                    <ProductCard
                      product={product}
                      variants={product.variants}
                      images={product.images}
                      onClick={() => onNavigateToProduct(product.slug)}
                    />
                  </Reveal>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { fetchProductsWithDetails } from '../lib/products';
import { ProductWithDetails } from '../types';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SpiceDrift from '../components/SpiceDrift';
import SpiceOrbit from '../components/SpiceElements';
import SpiceLoader from '../components/SpiceLoader';
import SpiceScroll from '../components/SpiceScroll';
import { ChevronRight, Leaf, Gem, Flame, Sparkles } from 'lucide-react';

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
    icon: Sparkles,
    title: 'Richness',
    copy: 'The quality of a private spice merchant, brought to the everyday kitchen without the special-occasion price tag.',
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
      const productsWithDetails = await fetchProductsWithDetails();

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
      <SpiceScroll />
      <section className="relative overflow-hidden bg-gradient-to-b from-ink via-ink to-[#223822] text-cream pt-24 pb-16 px-4">
        <SpiceDrift />
        <SpiceOrbit />

        <div className="relative max-w-[1400px] mx-auto">
          <p className="text-saffron-light text-xs sm:text-sm font-medium tracking-[0.3em] uppercase mb-8">
            Hand-Selected &middot; Small-Batch &middot; Unadulterated
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-end">
            <div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.08] mb-6 max-w-2xl">
                Grown in purity,
                <br />
                refined by hand.
              </h1>
              <p className="text-lg text-cream/75 max-w-xl leading-relaxed font-light">
                Every batch is sourced with care, cleaned by hand, and packed to honour the
                taste nature intended — no fillers, no shortcuts, no compromise.
              </p>
            </div>

            <div className="lg:pb-2">
              <button
                onClick={() => onNavigateToShop()}
                className="group inline-flex items-center gap-3 bg-saffron-light text-ink pl-7 pr-6 py-4 font-semibold text-base hover:bg-saffron transition-colors"
              >
                Explore the Collection
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* The scale beam: three measures the shop holds itself to, hung off one line */}
          <div className="mt-16 lg:mt-20">
            <div className="h-px bg-cream/20" />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="flex items-start gap-3">
                  <pillar.icon className="w-4 h-4 text-saffron-light mt-1 flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <h3 className="font-sans text-xs font-semibold tracking-[0.15em] uppercase text-cream mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-cream/60 leading-relaxed">{pillar.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-ink text-cream rounded-3xl px-8 md:px-14 py-14 md:py-20">
          <Reveal className="max-w-2xl mb-12">
            <p className="text-saffron-light text-xs font-semibold tracking-[0.25em] uppercase mb-3">
              From the shopkeeper's notebook
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
              How to know it's real.
            </h2>
            <p className="text-cream/70 leading-relaxed">
              Adulterated turmeric, cassia sold as cinnamon, papaya seeds passed off as
              pepper — none of it is rare on Indian shelves. These are the tests you can do
              at home in a minute, to see what's actually in the jar.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: 'Turmeric',
                test: 'Add a spoonful to a glass of warm water. Real turmeric sinks and leaves clear yellow water. A muddy residue or swirled colour means additives.',
              },
              {
                name: 'Cinnamon',
                test: 'Real Ceylon cinnamon is thin, brittle, and rolls into layered curls like a cigar. Cassia — often sold as cinnamon — is a single thick, hard bark that snaps flat.',
              },
              {
                name: 'Cardamom',
                test: 'Press a pod between your fingers. It should snap open cleanly and release a sharp camphor-eucalyptus scent. A dry, flat-scented pod has been on a shelf for years.',
              },
              {
                name: 'Black Pepper',
                test: 'Drop whole peppercorns in a glass of water. Real peppercorns sink. Papaya seeds — a common adulterant — float.',
              },
            ].map((t, i) => (
              <Reveal key={t.name} delayMs={i * 80}>
                <div className="border-t border-cream/20 pt-4">
                  <p className="font-sans text-xs font-semibold tracking-[0.15em] uppercase text-saffron-light mb-2">
                    The test
                  </p>
                  <h3 className="font-serif text-2xl font-semibold mb-3">{t.name}</h3>
                  <p className="text-sm text-cream/70 leading-relaxed">{t.test}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <SpiceLoader />
      ) : (
        <>
          {bestsellers.length > 0 && (
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <Reveal className="mb-10">
                <div className="flex items-end justify-between border-b border-ink/10 pb-4">
                  <div>
                    <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-1">Most Loved</p>
                    <h2 className="font-serif text-4xl font-semibold text-ink">Bestsellers</h2>
                  </div>
                  <button
                    onClick={() => onNavigateToShop()}
                    className="hidden sm:flex items-center gap-2 text-ink font-semibold hover:gap-3 hover:text-moss transition-all"
                  >
                    View All <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
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
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-cream-soft">
              <Reveal className="flex items-baseline justify-between mb-8">
                <h2 className="font-sans text-sm font-semibold tracking-[0.2em] uppercase text-ink">
                  Everyday Essentials <span className="text-gray-400 font-normal normal-case tracking-normal">— the kitchen staples people reorder most</span>
                </h2>
                <button
                  onClick={() => onNavigateToShop('whole-spices')}
                  className="flex-shrink-0 flex items-center gap-2 text-sm text-ink font-semibold hover:gap-3 hover:text-moss transition-all"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </Reveal>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
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
            <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <Reveal className="mb-10">
                <div className="flex items-end justify-between border-b border-ochre/30 pb-4">
                  <div>
                    <p className="text-ochre text-xs font-semibold tracking-[0.25em] uppercase mb-1">Nutrient Rich</p>
                    <h2 className="font-serif text-4xl font-semibold text-ink">Healthy Snacking</h2>
                  </div>
                  <button
                    onClick={() => onNavigateToShop('seeds')}
                    className="hidden sm:flex items-center gap-2 text-ink font-semibold hover:gap-3 hover:text-moss transition-all"
                  >
                    View All <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
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

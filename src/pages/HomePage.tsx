import { useState, useEffect } from 'react';
import { fetchProductsWithDetails } from '../lib/products';
import { ProductWithDetails } from '../types';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SpiceDrift from '../components/SpiceDrift';
import SpiceLoader from '../components/SpiceLoader';
import { SCROLL_SPICE_PHOTOS } from '../lib/spicePhotos';
import { SPICE_HERO_PHOTOS } from '../lib/spiceHeroPhotos';
import { ChevronRight, Leaf, Gem, Flame, Sparkles, Stamp } from 'lucide-react';

interface HomePageProps {
  onNavigateToProduct: (slug: string) => void;
  onNavigateToShop: (category?: string) => void;
}

const PILLARS = [
  {
    icon: Leaf,
    title: 'Purity',
    copy: 'No fillers, no colouring, nothing hidden. Every batch is exactly what it says on the label.',
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
      <section className="relative overflow-hidden bg-gradient-to-b from-ink via-ink to-[#223822] text-cream pt-24 pb-16 px-4">
        <SpiceDrift />

        <div className="relative max-w-[1400px] mx-auto">
          <div className="inline-flex items-center gap-3 border border-saffron-light/30 bg-saffron-light/[0.06] px-4 py-2 mb-10">
            <Stamp className="w-3.5 h-3.5 text-saffron-light flex-shrink-0" strokeWidth={1.5} />
            <p className="text-saffron-light text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase">
              Hand-Selected <span className="text-saffron-light/40">/</span> Small-Batch{' '}
              <span className="text-saffron-light/40">/</span> Unadulterated
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-12 items-center">
            <div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-[4.25rem] font-semibold leading-[1.08] mb-6 max-w-2xl">
                Grown in purity,
                <br />
                refined by hand.
              </h1>
              <p className="text-lg text-cream/75 max-w-xl leading-relaxed font-light mb-8">
                Every batch is sourced with care, cleaned by hand, and packed to honour the
                taste nature intended, with no fillers, no shortcuts, no compromise.
              </p>
              <button
                onClick={() => onNavigateToShop()}
                className="group inline-flex items-center gap-3 bg-saffron-light text-ink pl-7 pr-6 py-4 font-semibold text-base hover:bg-saffron transition-colors"
              >
                Explore the Collection
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="hidden lg:flex justify-center">
              <img
                src={SPICE_HERO_PHOTOS.cinnamon}
                alt=""
                aria-hidden="true"
                className="w-full max-w-xs h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
              />
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

      {/* A compact, always-visible look at the actual product - real
          isolated photography in a static grid, not a multi-screen
          scroll-pinned sequence. */}
      <section className="bg-cream">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Reveal className="text-center mb-10">
            <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-3">
              Look closer
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-ink">
              This is what you're actually buying.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                name: 'Cardamom',
                slug: 'cardamom',
                photo: SPICE_HERO_PHOTOS.cardamom,
                caption: 'Hand-sorted pods, plump enough to snap between two fingers.',
              },
              {
                name: 'Cinnamon',
                slug: 'cinnamon',
                photo: SPICE_HERO_PHOTOS.cinnamon,
                caption: 'True Ceylon quills, thin bark rolled by hand into paper-fine layers.',
              },
              {
                name: 'Clove',
                slug: 'clove',
                photo: SPICE_HERO_PHOTOS.clove,
                caption: 'Sun-dried buds, still dark and oily at the stem.',
              },
            ].map((spice, i) => (
              <Reveal key={spice.slug} delayMs={i * 80}>
                <button
                  onClick={() => onNavigateToProduct(spice.slug)}
                  className="group w-full text-left bg-cream-soft border border-black/5 rounded-2xl overflow-hidden h-full flex flex-col"
                >
                  <div className="relative h-56 sm:h-64 flex items-center justify-center p-6">
                    <img
                      src={spice.photo}
                      alt={spice.name}
                      className="max-w-full max-h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-serif text-xl font-semibold text-ink mb-2">
                      {spice.name}
                    </h3>
                    <p className="text-charcoal/70 text-sm leading-relaxed">{spice.caption}</p>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Adulteration is the industry's dirty secret and the real */}
      {/* reason a "premium" spice shop matters. Show it, don't tell it. */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <Reveal className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-saffron text-xs font-semibold tracking-[0.25em] uppercase mb-3">
            The shopkeeper's notebook
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-ink mb-5 leading-tight">
            You'd be surprised what's in the jar.
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Spent cloves resold as fresh. Cassia labelled cinnamon. Papaya seeds
            passed off as pepper. Four one-minute tests you can do at home.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {[
            {
              name: 'Cinnamon',
              photo: SCROLL_SPICE_PHOTOS.cinnamon,
              instruction: 'Look at the end of the stick.',
              tell: 'Ceylon is thin and rolls into multiple paper layers. Cassia is one thick, hard, flat bark.',
            },
            {
              name: 'Cardamom',
              photo: SCROLL_SPICE_PHOTOS.cardamom,
              instruction: 'Squeeze a pod between your fingers.',
              tell: 'Fresh snaps open and releases a sharp camphor scent. Stale is dry, faded, and flat.',
            },
            {
              name: 'Clove',
              photo: SCROLL_SPICE_PHOTOS.clove,
              instruction: 'Press one with a nail, then drop it in water.',
              tell: 'Fresh clove beads oil at the press and floats upright, stem down. A spent, oil-stripped clove floats flat on its side.',
            },
            {
              name: 'Black Pepper',
              photo: SCROLL_SPICE_PHOTOS.pepper,
              instruction: 'Drop the peppercorns in water.',
              tell: 'Real peppercorns sink. Papaya seeds, a common bulking agent, float.',
            },
          ].map((t, i) => (
            <Reveal key={t.name} delayMs={i * 80}>
              <article className="bg-white border border-black/5 rounded-2xl overflow-hidden h-full flex flex-col">
                <div className="relative h-64 sm:h-72 bg-cream-soft overflow-hidden flex items-center justify-center p-6">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="max-w-full max-h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                  />
                  <span className="absolute top-3 left-3 bg-ink/70 text-cream text-[10px] font-semibold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full">
                    {t.name}, unedited
                  </span>
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1">
                  <p className="font-sans text-xs font-semibold tracking-[0.15em] uppercase text-saffron mb-2">
                    The {t.name.toLowerCase()} test
                  </p>
                  <h3 className="font-serif text-2xl font-semibold text-ink mb-2">
                    {t.instruction}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-[15px]">{t.tell}</p>
                </div>
              </article>
            </Reveal>
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
                  Everyday Essentials <span className="text-gray-400 font-normal normal-case tracking-normal">· the kitchen staples people reorder most</span>
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

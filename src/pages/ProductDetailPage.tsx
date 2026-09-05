import { useState, useEffect } from 'react';
import { fetchProductBySlug, fetchProductsWithDetails, fetchProductRatingSummary } from '../lib/products';
import { getDeliveryFee } from '../lib/delivery';
import { supabase } from '../lib/supabase';
import { ProductWithDetails } from '../types';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight, Check, ShoppingCart, Star, BellRing } from 'lucide-react';
import ProductReviews from '../components/ProductReviews';
import BulkPricingNote from '../components/BulkPricingNote';
import SpicePuff from '../components/SpicePuff';
import SpiceLoader from '../components/SpiceLoader';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import StarRating from '../components/StarRating';

interface ProductDetailPageProps {
  productSlug: string;
  onNavigateBack: () => void;
  onNavigateToProduct?: (slug: string) => void;
  onNavigateToCheckout?: () => void;
  onNavigateHome?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'whole-spices': 'Whole Spices',
  'dry-fruits': 'Dry Fruits',
  seeds: 'Seeds',
};

export default function ProductDetailPage({
  productSlug,
  onNavigateBack,
  onNavigateToProduct,
  onNavigateToCheckout,
  onNavigateHome,
}: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithDetails[]>([]);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [pincode, setPincode] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [productSlug]);

  const fetchProduct = async () => {
    setLoading(true);
    setRelatedProducts([]);
    setRating({ average: 0, count: 0 });
    setSelectedVariantIndex(0);
    setQuantity(1);
    setCurrentImageIndex(0);
    setPincode('');
    setDeliveryFee(null);
    setNotifyEmail('');
    setNotifySubmitted(false);

    try {
      const productData = await fetchProductBySlug(productSlug);
      if (!productData) {
        console.error('Product not found');
        setLoading(false);
        return;
      }

      setProduct(productData);
      setLoading(false);

      fetchProductRatingSummary(productData.id).then(setRating);

      const all = await fetchProductsWithDetails();
      const related = all
        .filter((p) => p.category === productData.category && p.id !== productData.id)
        .slice(0, 4);
      setRelatedProducts(related);
    } catch (error) {
      console.error('Error fetching product:', error);
      setLoading(false);
    }
  };

  const buildCartItem = () => {
    if (!product || product.variants.length === 0) return null;
    const selectedVariant = product.variants[selectedVariantIndex];
    const firstImage = product.images.find((img) => img.sort_order === 1) || product.images[0];
    return { product, variant: selectedVariant, quantity, image: firstImage?.image_url };
  };

  const handleAddToCart = () => {
    const item = buildCartItem();
    if (!item) return;
    addToCart(item);
    setAddedToCart(true);
    setBurstKey((k) => k + 1);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    if (!item) return;
    addToCart(item);
    onNavigateToCheckout?.();
  };

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !notifyEmail.trim() || notifySubmitting) return;
    setNotifySubmitting(true);
    try {
      const { error } = await supabase.from('back_in_stock_notifications').insert({
        product_id: product.id,
        variant_id: product.variants[selectedVariantIndex]?.id || null,
        email: notifyEmail.trim(),
      });
      if (error) throw error;
      setNotifySubmitted(true);
    } catch (err) {
      console.error('Error requesting back-in-stock notification:', err);
      alert("Couldn't save your request - please try again.");
    } finally {
      setNotifySubmitting(false);
    }
  };

  const handleCheckDelivery = async () => {
    if (!pincode.trim() || checkingDelivery) return;
    setCheckingDelivery(true);
    try {
      const fee = await getDeliveryFee(pincode.trim());
      setDeliveryFee(fee);
    } finally {
      setCheckingDelivery(false);
    }
  };

  const nextImage = () => {
    if (product && product.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <SpiceLoader />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-semibold text-ink mb-4">Product not found</h2>
          <button
            onClick={onNavigateBack}
            className="text-ink hover:text-moss font-medium underline underline-offset-4"
          >
            Go back to shop
          </button>
        </div>
      </div>
    );
  }

  const selectedVariant = product.variants[selectedVariantIndex];
  const currentImage = product.images[currentImageIndex];
  const categoryLabel = CATEGORY_LABELS[product.category];
  const total = selectedVariant ? Math.round(selectedVariant.price * quantity) : 0;

  return (
    <div className="min-h-screen bg-cream pt-6 pb-24 md:pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-ink/50 mb-6 flex-wrap">
          <button onClick={onNavigateHome} className="hover:text-ink transition-colors">
            Home
          </button>
          <span>/</span>
          <button onClick={onNavigateBack} className="hover:text-ink transition-colors">
            Shop
          </button>
          {categoryLabel && (
            <>
              <span>/</span>
              <span>{categoryLabel}</span>
            </>
          )}
          <span>/</span>
          <span className="text-ink font-medium truncate max-w-[160px] sm:max-w-xs">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="space-y-4">
            <div className="relative aspect-square bg-cream-soft rounded-2xl overflow-hidden border border-black/5">
              {currentImage ? (
                <img
                  src={currentImage.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink to-moss font-serif text-cream text-4xl font-semibold">
                  {product.name[0]}
                </div>
              )}

              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-ink" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-ink" />
                  </button>
                </>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-ink'
                        : 'border-black/10 hover:border-black/30'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-7">
            <div>
              {product.is_bestseller && (
                <div className="inline-flex items-center gap-1 bg-saffron-light text-ink px-3 py-1 rounded-full text-xs font-bold mb-3">
                  <Star className="w-3 h-3 fill-current" />
                  Bestseller
                </div>
              )}
              <h1 className="font-serif text-4xl md:text-5xl font-semibold text-ink leading-tight mb-3">
                {product.name}
              </h1>
              {rating.count > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-2 group">
                  <StarRating rating={rating.average} size="sm" />
                  <span className="text-sm text-gray-600 group-hover:text-ink transition-colors">
                    {rating.average.toFixed(1)} &middot; {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
                  </span>
                </a>
              )}
            </div>

            <p className="font-serif text-3xl font-semibold text-ink">
              ₹{selectedVariant ? Math.round(selectedVariant.price) : '0'}
            </p>

            {product.variants.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron mb-3">
                  Select Size
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {product.variants.map((variant, index) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantIndex(index)}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        selectedVariantIndex === index
                          ? 'border-ink bg-ink text-cream'
                          : 'border-black/10 hover:border-ink/40 text-ink'
                      }`}
                    >
                      <div className="text-sm">{variant.size}</div>
                      <div className="text-xs mt-1 opacity-80">₹{Math.round(variant.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron mb-3">
                Quantity
              </h3>
              <div className="flex items-center gap-3 bg-cream-soft rounded-lg w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-black/5 rounded-l-lg transition-colors font-bold text-ink"
                >
                  -
                </button>
                <span className="px-6 font-semibold text-ink">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-black/5 rounded-r-lg transition-colors font-bold text-ink"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron mb-3">
                Delivery
              </h3>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value.replace(/\D/g, ''));
                    setDeliveryFee(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckDelivery()}
                  placeholder="Enter pincode"
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-black/10 bg-white focus:outline-none focus:border-ink text-ink"
                />
                <button
                  onClick={handleCheckDelivery}
                  disabled={checkingDelivery || pincode.trim().length < 6}
                  className="px-5 py-2.5 rounded-lg border-2 border-ink text-ink font-semibold hover:bg-ink hover:text-cream transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink flex-shrink-0"
                >
                  {checkingDelivery ? 'Checking' : 'Check'}
                </button>
              </div>
              {deliveryFee !== null && (
                <p className="text-sm text-gray-600 mt-2">
                  {deliveryFee === 0
                    ? 'Free delivery to this pincode.'
                    : `Delivery fee for this pincode: ₹${deliveryFee}`}
                </p>
              )}
            </div>

            {product.stock_status === 'out_of_stock' ? (
              <div className="bg-cream-soft border border-black/10 rounded-lg p-5">
                <p className="font-semibold text-ink mb-1">Currently out of stock</p>
                <p className="text-sm text-gray-600 mb-4">
                  Leave your email and we'll let you know the moment it's back.
                </p>
                {notifySubmitted ? (
                  <p className="text-sm text-moss font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    We'll email you when it's back in stock.
                  </p>
                ) : (
                  <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 px-4 py-2.5 rounded-lg border border-black/10 bg-white focus:outline-none focus:border-ink text-ink"
                    />
                    <button
                      type="submit"
                      disabled={notifySubmitting}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-cream font-semibold hover:bg-ink-light transition-colors disabled:opacity-50"
                    >
                      <BellRing className="w-4 h-4" />
                      {notifySubmitting ? 'Saving...' : 'Notify Me'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <>
                {product.stock_status === 'low_stock' && (
                  <p className="text-sm font-medium text-saffron-dark">
                    Only a few left in stock - order soon.
                  </p>
                )}

                <BulkPricingNote />

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <SpicePuff triggerKey={burstKey} />
                      <button
                        onClick={handleAddToCart}
                        className="w-full bg-ink text-cream py-4 rounded-lg font-semibold text-lg hover:bg-ink-light transition-all shadow-lg shadow-ink/10 flex items-center justify-center gap-2"
                      >
                        {addedToCart ? (
                          <>
                            <Check className="w-5 h-5" />
                            Added to Cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={handleBuyNow}
                      className="flex-1 bg-saffron-light text-ink py-4 rounded-lg font-semibold text-lg hover:bg-saffron transition-colors"
                    >
                      Buy Now
                    </button>
                  </div>
                  {addedToCart && (
                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="text-sm text-ink font-medium underline underline-offset-4 hover:text-moss transition-colors"
                    >
                      View Cart
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="border-t border-black/10 pt-6">
              <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron mb-3">
                Description
              </h3>
              <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {product.health_benefits && (
              <div className="border-t border-black/10 pt-6">
                <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron mb-3">
                  Health Benefits
                </h3>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.health_benefits}
                </div>
              </div>
            )}
          </div>
        </div>

        {product.story && (
          <div className="mt-16 relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-[#223822] text-cream p-8 md:p-12">
            <p className="text-saffron-light text-xs font-semibold tracking-[0.25em] uppercase mb-3">
              Origin &amp; Story
            </p>
            {product.story.title && (
              <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-5 max-w-2xl">
                {product.story.title}
              </h2>
            )}
            {product.story.content && (
              <p className="text-cream/80 leading-relaxed max-w-2xl whitespace-pre-line mb-8">
                {product.story.content}
              </p>
            )}
            {(product.story.heritage || product.story.sourcing) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-cream/15 max-w-2xl">
                {product.story.heritage && (
                  <div>
                    <p className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron-light mb-2">
                      Heritage
                    </p>
                    <p className="text-sm text-cream/70 leading-relaxed">{product.story.heritage}</p>
                  </div>
                )}
                {product.story.sourcing && (
                  <div>
                    <p className="text-xs font-semibold tracking-[0.15em] uppercase text-saffron-light mb-2">
                      Sourcing
                    </p>
                    <p className="text-sm text-cream/70 leading-relaxed">{product.story.sourcing}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {relatedProducts.length > 0 && onNavigateToProduct && (
          <Reveal as="section" className="mt-16">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-ink">
                You may also like
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">More from the same shelf</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((p, i) => (
                <Reveal key={p.id} delayMs={Math.min(i, 4) * 80}>
                  <ProductCard
                    product={p}
                    variants={p.variants}
                    images={p.images}
                    onClick={() => onNavigateToProduct(p.slug)}
                  />
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}

        <div id="reviews" className="mt-16 bg-white rounded-2xl border border-black/5 p-6 md:p-8 scroll-mt-24">
          <ProductReviews productId={product.id} />
        </div>
      </div>

      {product.stock_status !== 'out_of_stock' && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-black/10 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="flex-shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Total</p>
            <p className="font-serif text-lg font-semibold text-ink leading-tight">₹{total}</p>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-ink text-cream py-3 rounded-lg font-semibold text-sm"
          >
            Add to Cart
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 bg-saffron-light text-ink py-3 rounded-lg font-semibold text-sm"
          >
            Buy Now
          </button>
        </div>
      )}
    </div>
  );
}

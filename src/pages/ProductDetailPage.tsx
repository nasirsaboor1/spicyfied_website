import { useState, useEffect } from 'react';
import { fetchProductBySlug } from '../lib/products';
import { ProductWithDetails } from '../types';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight, Check, ShoppingCart } from 'lucide-react';
import ProductReviews from '../components/ProductReviews';
import BulkPricingNote from '../components/BulkPricingNote';
import SpicePuff from '../components/SpicePuff';
import SpiceLoader from '../components/SpiceLoader';

interface ProductDetailPageProps {
  productSlug: string;
  onNavigateBack: () => void;
}

export default function ProductDetailPage({ productSlug, onNavigateBack }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [productSlug]);

  const fetchProduct = async () => {
    try {
      const productData = await fetchProductBySlug(productSlug);
      if (!productData) {
        console.error('Product not found');
        setLoading(false);
        return;
      }

      setProduct(productData);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.variants.length === 0) return;

    const selectedVariant = product.variants[selectedVariantIndex];
    const firstImage = product.images.find((img) => img.sort_order === 1) || product.images[0];

    addToCart({
      product,
      variant: selectedVariant,
      quantity,
      image: firstImage?.image_url,
    });

    setAddedToCart(true);
    setBurstKey((k) => k + 1);
    setTimeout(() => setAddedToCart(false), 2000);
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
      <div className="min-h-screen flex items-center justify-center">
        <SpiceLoader />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product not found</h2>
          <button
            onClick={onNavigateBack}
            className="text-[#211C17] hover:underline font-medium"
          >
            Go back to shop
          </button>
        </div>
      </div>
    );
  }

  const selectedVariant = product.variants[selectedVariantIndex];
  const currentImage = product.images[currentImageIndex];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-2 text-[#211C17] hover:underline font-medium mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to shop
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                {currentImage ? (
                  <img
                    src={currentImage.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#211C17] to-[#3F5A34] text-white text-4xl font-bold">
                    {product.name[0]}
                  </div>
                )}

                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-800" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-800" />
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
                          ? 'border-[#211C17]'
                          : 'border-gray-200 hover:border-gray-300'
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

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">{product.name}</h1>
                {product.is_bestseller && (
                  <span className="inline-block bg-[#d4af37] text-[#211C17] px-3 py-1 rounded-full text-sm font-bold">
                    Bestseller
                  </span>
                )}
              </div>

              <div>
                <p className="text-4xl font-bold text-[#211C17]">
                  ₹{selectedVariant ? Math.round(selectedVariant.price) : '0'}
                </p>
              </div>

              {product.variants.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Select Size</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {product.variants.map((variant, index) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantIndex(index)}
                        className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          selectedVariantIndex === index
                            ? 'border-[#211C17] bg-[#211C17] text-white'
                            : 'border-gray-300 hover:border-[#211C17] text-gray-700'
                        }`}
                      >
                        <div className="text-sm">{variant.size}</div>
                        <div className="text-xs mt-1">₹{Math.round(variant.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Quantity</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 hover:bg-gray-200 rounded-l-lg transition-colors font-bold"
                    >
                      -
                    </button>
                    <span className="px-6 font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 hover:bg-gray-200 rounded-r-lg transition-colors font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <BulkPricingNote />

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <SpicePuff triggerKey={burstKey} />
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-ink text-white py-4 rounded-lg font-semibold text-lg hover:bg-ink-light transition-all shadow-lg flex items-center justify-center gap-2"
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
                {addedToCart && (
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="px-6 py-4 bg-saffron-light text-ink rounded-lg font-semibold hover:bg-saffron transition-colors"
                  >
                    View Cart
                  </button>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-800 mb-3 text-xl">Description</h3>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>

              {product.health_benefits && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-800 mb-3 text-xl">Health Benefits</h3>
                  <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {product.health_benefits}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {product.story && (
          <div className="mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-[#223822] text-cream p-8 md:p-12">
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

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <ProductReviews productId={product.id} />
        </div>
      </div>
    </div>
  );
}

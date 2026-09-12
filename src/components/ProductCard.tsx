import { Star } from 'lucide-react';
import { Product, ProductVariant, ProductImage } from '../types';
import ResilientImage from './ResilientImage';

interface ProductCardProps {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
  onClick?: () => void;
  /** True for the first few cards in a grid, i.e. the ones actually visible
   * on load — measured live to be the LCP element on both Home and Shop.
   * Those must not be lazy-loaded (that delays LCP); every other card
   * should be, since it's genuinely off-screen at load time. */
  priority?: boolean;
}

export default function ProductCard({ product, variants, images, onClick, priority = false }: ProductCardProps) {
  const firstImage = images.find(img => img.sort_order === 1) || images[0];
  const secondImage = images.find((img) => img !== firstImage);
  const cheapestVariant = variants.length > 0
    ? variants.reduce((min, v) => (v.price < min.price ? v : min), variants[0])
    : null;
  const minPrice = cheapestVariant?.price ?? 0;
  // Only products genuinely priced per-piece (e.g. Nutmeg) carry this unit;
  // weight-priced products ('g'/'kg') are left exactly as before.
  const isPerPiece = cheapestVariant?.weight_unit === 'pcs';

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl shadow-sm hover:shadow-2xl hover:shadow-ink/10 transition-all duration-500 overflow-hidden cursor-pointer border border-black/5"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-soft">
        {firstImage ? (
          <>
            <ResilientImage
              src={firstImage.thumb_url}
              fallbackSrc={firstImage.image_url}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${
                secondImage ? 'group-hover:opacity-0' : ''
              }`}
              style={secondImage ? { transitionProperty: 'transform, opacity' } : undefined}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding={priority ? 'sync' : 'async'}
            />
            {secondImage && (
              <ResilientImage
                src={secondImage.thumb_url}
                fallbackSrc={secondImage.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-0 scale-110 group-hover:opacity-100 transition-opacity duration-700 ease-out"
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink to-moss font-serif text-cream text-lg font-medium">
            {product.name}
          </div>
        )}
        {product.is_bestseller && (
          <div className="absolute top-3 right-3 bg-saffron-light text-ink px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-current" />
            Bestseller
          </div>
        )}
        {product.stock_status === 'out_of_stock' && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-ink text-cream px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
              Out of Stock
            </span>
          </div>
        )}
        {product.stock_status === 'low_stock' && (
          <div className="absolute top-3 left-3 bg-white text-saffron-dark px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Only a few left
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-serif font-semibold text-lg text-ink mb-2 group-hover:text-moss transition-colors line-clamp-1">
          {product.name}
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1 tracking-wide uppercase">Starting from</p>
            <p className="text-xl font-bold text-ink">
              ₹{Math.round(minPrice)}
              {isPerPiece && <span className="text-sm font-medium text-gray-500"> / pc</span>}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            className="bg-ink text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-saffron-dark transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

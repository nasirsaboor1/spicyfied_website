import { Star } from 'lucide-react';
import { Product, ProductVariant, ProductImage } from '../types';

interface ProductCardProps {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
  onClick?: () => void;
}

export default function ProductCard({ product, variants, images, onClick }: ProductCardProps) {
  const firstImage = images.find(img => img.sort_order === 1) || images[0];
  const minPrice = variants.length > 0 ? Math.min(...variants.map(v => v.price)) : 0;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl shadow-sm hover:shadow-2xl hover:shadow-ink/10 transition-all duration-500 overflow-hidden cursor-pointer border border-black/5"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-soft">
        {firstImage ? (
          <img
            src={firstImage.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
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

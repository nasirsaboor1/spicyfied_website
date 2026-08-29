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
      className="group bg-white hover:shadow-xl hover:shadow-ink/10 transition-shadow duration-500 overflow-hidden cursor-pointer border border-black/5"
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
          <div
            className="absolute top-0 right-4 bg-saffron text-cream px-2.5 pt-1.5 pb-2 text-[11px] font-semibold tracking-wide flex items-center gap-1 shadow-md"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)' }}
          >
            <Star className="w-3 h-3 fill-current" />
            Bestseller
          </div>
        )}
      </div>

      <div className="p-4 border-t border-black/5">
        <h3 className="font-serif font-semibold text-lg text-ink mb-2 group-hover:text-moss transition-colors line-clamp-1">
          {product.name}
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 tracking-[0.1em] uppercase">From</p>
            <p className="font-serif italic text-2xl text-ink leading-tight">
              ₹{Math.round(minPrice)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            className="border border-ink text-ink px-4 py-2 text-sm font-medium hover:bg-ink hover:text-cream transition-colors"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}

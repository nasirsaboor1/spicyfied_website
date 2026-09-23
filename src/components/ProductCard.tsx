import { useState } from 'react';
import { Award, Plus, Check, ChevronRight } from 'lucide-react';
import { Product, ProductVariant, ProductImage } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
  onClick?: () => void;
}

export default function ProductCard({ product, variants, images, onClick }: ProductCardProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const firstImage = images.find((img) => img.sort_order === 1) || images[0];
  const secondImage = images.find((img) => img !== firstImage);
  const sortedVariants = [...variants].sort((a, b) => a.sort_order - b.sort_order);
  const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;
  const isSingleVariant = sortedVariants.length === 1;
  const isOutOfStock = product.stock_status === 'out_of_stock';
  const categoryLabel = product.category_name || product.category;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSingleVariant || isOutOfStock) return;
    const variant = sortedVariants[0];
    addToCart({ product, variant, quantity: 1, image: firstImage?.image_url });
    setJustAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleChooseSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl overflow-hidden cursor-pointer border border-black/10 hover:border-brand-green/40 transition-colors duration-300"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-soft">
        {firstImage && !imageFailed ? (
          <div className="absolute inset-0 p-5 flex items-center justify-center">
            <img
              src={firstImage.image_url}
              alt={product.name}
              onError={() => setImageFailed(true)}
              className={`max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out ${
                secondImage ? 'group-hover:opacity-0' : ''
              }`}
              loading="lazy"
            />
            {secondImage && (
              <img
                src={secondImage.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain p-5 opacity-0 scale-105 group-hover:opacity-100 transition-opacity duration-700 ease-out"
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink to-moss font-serif text-cream text-lg font-medium px-4 text-center">
            {product.name}
          </div>
        )}

        {product.is_bestseller && (
          <div className="absolute top-3 left-3 bg-brand-green text-cream px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1">
            <Award className="w-3 h-3" />
            Bestseller
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-cream/85 flex items-center justify-center">
            <span className="bg-ink text-cream px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide">
              Out of Stock
            </span>
          </div>
        )}
        {!isOutOfStock && product.stock_status === 'low_stock' && (
          <div className="absolute top-3 right-3 bg-white text-saffron-dark px-2.5 py-1 rounded-full text-[11px] font-semibold border border-saffron-dark/30">
            Low Stock
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-serif font-semibold text-lg text-ink mb-1 group-hover:text-brand-green transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-charcoal/50 uppercase tracking-wide mb-3">{categoryLabel}</p>

        <div className="flex items-end justify-between gap-2">
          <div>
            {isSingleVariant ? (
              <>
                <p className="text-[11px] text-charcoal/50 uppercase tracking-wide mb-0.5">
                  {sortedVariants[0].size}
                </p>
                <p className="text-lg font-semibold text-ink">₹{Math.round(sortedVariants[0].price)}</p>
              </>
            ) : (
              <p className="text-lg font-semibold text-ink">From ₹{Math.round(minPrice)}</p>
            )}
          </div>

          {isSingleVariant ? (
            <button
              onClick={handleQuickAdd}
              disabled={isOutOfStock}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isOutOfStock
                  ? 'bg-cream-soft text-charcoal/40 cursor-not-allowed'
                  : justAdded
                  ? 'bg-brand-green text-cream'
                  : 'bg-ink text-cream hover:bg-brand-green'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Quick Add
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleChooseSize}
              disabled={isOutOfStock}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isOutOfStock
                  ? 'bg-cream-soft text-charcoal/40 cursor-not-allowed'
                  : 'border border-ink text-ink hover:bg-ink hover:text-cream'
              }`}
            >
              Choose Size
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

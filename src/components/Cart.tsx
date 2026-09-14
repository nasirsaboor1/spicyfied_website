import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import BulkPricingNote from './BulkPricingNote';

interface CartProps {
  onNavigateToCheckout?: () => void;
}

export default function Cart({ onNavigateToCheckout }: CartProps) {
  const { cart, removeFromCart, updateQuantity, getTotalPrice, isCartOpen, setIsCartOpen } = useCart();

  if (!isCartOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 border-l border-black/10 transform transition-transform">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-black/10">
            <h2 className="font-serif text-2xl font-semibold text-ink flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-ink" />
              Your Cart
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-20 h-20 text-charcoal/20 mb-4" />
                <p className="text-ink text-lg font-medium mb-2">Your cart is empty</p>
                <p className="text-charcoal/50 text-sm">Add some products to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.variant.id}`}
                    className="flex gap-4 p-4 bg-cream-soft rounded-lg border border-black/10"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-ink to-moss rounded-lg flex items-center justify-center text-white font-bold">
                        {item.product.name[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ink truncate">{item.product.name}</h3>
                      <p className="text-sm text-charcoal/60 mt-1">{item.variant.size}</p>
                      <p className="text-lg font-bold text-ink mt-1">
                        ₹{Math.round(item.variant.price)}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-2 bg-white border border-black/10 rounded-lg">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.variant.id, item.quantity - 1)
                            }
                            className="p-1 hover:bg-black/5 rounded-l-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 font-medium">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.variant.id, item.quantity + 1)
                            }
                            className="p-1 hover:bg-black/5 rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id, item.variant.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-black/10 p-6 space-y-4">
              <BulkPricingNote />
              <div className="flex justify-between items-center text-xl font-bold">
                <span className="text-ink">Total:</span>
                <span className="text-ink">₹{Math.round(getTotalPrice())}</span>
              </div>
              <button
                onClick={() => {
                  onNavigateToCheckout?.();
                  setIsCartOpen(false);
                }}
                className="w-full bg-brand-green text-cream py-4 rounded-lg font-semibold text-lg hover:bg-brand-green/90 transition-colors"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-full border border-ink text-ink py-3 rounded-lg font-medium hover:bg-ink hover:text-cream transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

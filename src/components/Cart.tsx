import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ResilientImage from './ResilientImage';

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

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#211C17]" />
              Your Cart
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-20 h-20 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium mb-2">Your cart is empty</p>
                <p className="text-gray-400 text-sm">Add some products to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.variant.id}`}
                    className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {item.image ? (
                      <ResilientImage
                        src={item.image}
                        fallbackSrc={item.imageFallback || item.image}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-[#211C17] to-[#3F5A34] rounded-lg flex items-center justify-center text-white font-bold">
                        {item.product.name[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{item.product.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{item.variant.size}</p>
                      <p className="text-lg font-bold text-[#211C17] mt-1">
                        ₹{Math.round(item.variant.price)}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.variant.id, item.quantity - 1)
                            }
                            aria-label={`Decrease quantity of ${item.product.name}`}
                            className="p-1 hover:bg-gray-100 rounded-l-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 font-medium">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.variant.id, item.quantity + 1)
                            }
                            aria-label={`Increase quantity of ${item.product.name}`}
                            className="p-1 hover:bg-gray-100 rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id, item.variant.id)}
                          aria-label={`Remove ${item.product.name} from cart`}
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
            <div className="border-t border-gray-200 p-6 space-y-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span className="text-gray-800">Total:</span>
                <span className="text-[#211C17]">₹{Math.round(getTotalPrice())}</span>
              </div>
              <button
                onClick={() => {
                  onNavigateToCheckout?.();
                  setIsCartOpen(false);
                }}
                className="w-full bg-[#211C17] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#140F0C] transition-colors shadow-lg"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
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

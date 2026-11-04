import { CartItem, ProductWithDetails, ProductVariant } from '../types';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity?: number;
}

function cartItemToGA4(item: CartItem): GA4Item {
  return {
    item_id: item.variant.id,
    item_name: item.product.name,
    item_category: item.product.category_name || item.product.category,
    price: item.variant.price,
    quantity: item.quantity,
  };
}

function track(eventName: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}

// Fired when a product detail page loads - lets GA4 report which products
// get looked at, independent of whether they're ever added to cart.
export function trackViewItem(product: ProductWithDetails, variant: ProductVariant) {
  track('view_item', {
    currency: 'INR',
    value: variant.price,
    items: [
      {
        item_id: variant.id,
        item_name: product.name,
        item_category: product.category_name || product.category,
        price: variant.price,
      },
    ],
  });
}

// Fired on every add-to-cart, from the product card's quick-add or the
// product detail page.
export function trackAddToCart(item: CartItem) {
  track('add_to_cart', {
    currency: 'INR',
    value: item.variant.price * item.quantity,
    items: [cartItemToGA4(item)],
  });
}

// Fired when the checkout page loads with a non-empty cart - the top of the
// funnel GA4 needs to compute checkout abandonment against.
export function trackBeginCheckout(cart: CartItem[], totalValue: number) {
  if (cart.length === 0) return;
  track('begin_checkout', {
    currency: 'INR',
    value: totalValue,
    items: cart.map(cartItemToGA4),
  });
}

// Fired once, at the same gated moment the order confirmation notifications
// fire (immediately for COD/pickup, only after Razorpay verification for
// online payment) - never for an order that hasn't actually been placed.
// transaction_id is the human-readable order_number (not the internal UUID)
// so it's recognizable against the admin panel and customer-facing emails.
export function trackPurchase(
  orderNumber: string,
  totalValue: number,
  shipping: number,
  cart: CartItem[]
) {
  track('purchase', {
    transaction_id: orderNumber,
    currency: 'INR',
    value: totalValue,
    shipping,
    items: cart.map(cartItemToGA4),
  });
}

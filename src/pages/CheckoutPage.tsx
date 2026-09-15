import { useState, useEffect } from 'react';
import { MapPin, Plus, CreditCard, Loader, CheckCircle, Truck, Store, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { getDeliveryFee } from '../lib/delivery';
import BulkPricingNote from '../components/BulkPricingNote';
import { INDIAN_STATES } from '../lib/indianStates';

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean | null;
}

interface CheckoutPageProps {
  onNavigateToOrders: () => void;
  onNavigateToLogin: () => void;
}

type DeliveryType = 'delivery' | 'pickup';
type PaymentMethod = 'cod' | 'card' | 'upi';

function generateOrderNumber() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SPZ-${ymd}-${random}`;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage({ onNavigateToOrders, onNavigateToLogin }: CheckoutPageProps) {
  const { user, loading: authLoading } = useAuth();
  const { cart, clearCart, getTotalPrice } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');

  const [addressForm, setAddressForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      onNavigateToLogin();
      return;
    }

    if (cart.length === 0) {
      setError('Your cart is empty');
      setLoading(false);
      return;
    }

    loadAddresses();
  }, [user, authLoading, cart]);

  useEffect(() => {
    if (deliveryType === 'pickup') {
      setDeliveryFee(0);
      setPaymentMethod('cod');
      return;
    }

    setPaymentMethod((prev) => (prev === 'cod' ? 'upi' : prev));

    const address = addresses.find((addr) => addr.id === selectedAddress);
    if (!address) {
      setDeliveryFee(null);
      return;
    }

    let cancelled = false;
    setDeliveryFeeLoading(true);
    getDeliveryFee(address.postal_code)
      .then((fee) => {
        if (!cancelled) setDeliveryFee(fee);
      })
      .finally(() => {
        if (!cancelled) setDeliveryFeeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAddress, addresses, deliveryType]);

  const loadAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
      if (data && data.length > 0) {
        const defaultAddress = data.find((addr) => addr.is_default);
        setSelectedAddress(defaultAddress?.id || data[0].id);
      } else {
        setShowAddressForm(true);
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user!.id,
          ...addressForm,
        })
        .select()
        .single();

      if (error) throw error;

      setAddresses([...addresses, data]);
      setSelectedAddress(data.id);
      setShowAddressForm(false);

      setAddressForm({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePlaceOrder = async () => {
    if (deliveryType === 'delivery' && !selectedAddress) {
      setError('Please select a delivery address');
      return;
    }

    if (deliveryType === 'pickup' && (!pickupName.trim() || !pickupPhone.trim())) {
      setError('Please enter your name and phone number for pickup');
      return;
    }

    const address =
      deliveryType === 'delivery' ? addresses.find((addr) => addr.id === selectedAddress) : null;

    if (deliveryType === 'delivery' && !address) {
      setError('Please select a delivery address');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const subtotal = getTotalPrice();
      const taxAmount = subtotal * 0.05;
      const shippingFee = deliveryType === 'pickup' ? 0 : await getDeliveryFee(address!.postal_code);
      const totalAmount = subtotal + taxAmount + shippingFee;

      const orderNotes =
        deliveryType === 'pickup'
          ? `Pickup contact: ${pickupName.trim()}, ${pickupPhone.trim()}${notes ? ` | ${notes}` : ''}`
          : notes;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: generateOrderNumber(),
          user_id: user!.id,
          email: user!.email!,
          status: 'pending',
          subtotal,
          tax_amount: taxAmount,
          shipping_amount: shippingFee,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
          delivery_type: deliveryType,
          shipping_address_id: deliveryType === 'delivery' ? selectedAddress : null,
          notes: orderNotes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant.id,
        product_name: item.product.name,
        variant_name: item.variant.size,
        unit_price: item.variant.price,
        quantity: item.quantity,
        total_price: item.variant.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      // Best-effort WhatsApp confirmation - never let this block or fail checkout.
      supabase.functions
        .invoke('send-whatsapp-message', { body: { orderId: order.id, type: 'order_confirmation' } })
        .catch((err) => console.error('WhatsApp confirmation failed:', err));

      // Best-effort: flush any stock alerts this order just triggered (low stock,
      // out of stock, or a restock notification) - never let this block or fail checkout.
      supabase.functions.invoke('process-stock-alerts').catch((err) => console.error('Stock alert flush failed:', err));

      if (deliveryType === 'delivery' && paymentMethod !== 'cod') {
        const paymentOutcome = await tryRazorpayPayment(order.id);
        if (paymentOutcome === 'verify_failed') {
          setError(
            `Your payment may have gone through, but we couldn't confirm it on our end. Please contact us with your order number (${order.order_number}) so we can check and confirm it for you.`
          );
          setProcessing(false);
          return;
        }
        // 'cancelled' or 'unavailable' - the order is already saved as pending,
        // the customer can complete payment later or we can follow up.
      }

      clearCart();
      onNavigateToOrders();
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  type RazorpayOutcome = 'paid' | 'cancelled' | 'verify_failed' | 'unavailable';

  const tryRazorpayPayment = async (orderId: string): Promise<RazorpayOutcome> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { orderId },
      });

      if (fnError || !data?.razorpay_order_id) {
        return 'unavailable';
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        return 'unavailable';
      }

      return await new Promise<RazorpayOutcome>((resolve) => {
        const rzp = new window.Razorpay({
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'Spicyfied',
          description: 'Order payment',
          order_id: data.razorpay_order_id,
          prefill: { email: user?.email },
          handler: async (response: any) => {
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            resolve(verifyError ? 'verify_failed' : 'paid');
          },
          modal: {
            ondismiss: () => resolve('cancelled'),
          },
          theme: { color: '#1D4F2C' },
        });
        rzp.open();
      });
    } catch (err) {
      console.error('Razorpay payment error:', err);
      return 'unavailable';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (error && cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-charcoal/70 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const taxAmount = subtotal * 0.05;
  const shippingFee = deliveryType === 'pickup' ? 0 : deliveryFee ?? 0;
  const totalAmount = subtotal + taxAmount + shippingFee;
  const canPlaceOrder =
    !processing &&
    !deliveryFeeLoading &&
    (deliveryType === 'pickup'
      ? pickupName.trim() && pickupPhone.trim()
      : !!selectedAddress);

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-serif text-[28px] md:text-3xl font-semibold text-ink mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-black/10 p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">How would you like your order?</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                    deliveryType === 'delivery'
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <Truck className="w-6 h-6 text-ink" />
                  <div className="text-left">
                    <p className="font-semibold text-ink">Delivery</p>
                    <p className="text-xs text-charcoal/50">Card / UPI</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                    deliveryType === 'pickup'
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <Store className="w-6 h-6 text-ink" />
                  <div className="text-left">
                    <p className="font-semibold text-ink">Pickup from Shop</p>
                    <p className="text-xs text-charcoal/50">Cash on pickup</p>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {deliveryType === 'delivery' ? (
              <div className="bg-white rounded-xl border border-black/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-ink" />
                    Delivery Address
                  </h2>
                  {addresses.length > 0 && !showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="flex items-center gap-2 text-ink hover:underline font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add New
                    </button>
                  )}
                </div>

                {showAddressForm ? (
                  <form onSubmit={handleAddAddress} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="addr-full-name" className="block text-sm font-medium text-charcoal mb-2">Full Name</label>
                        <input
                          id="addr-full-name"
                          type="text"
                          required
                          value={addressForm.full_name}
                          onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                          className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="addr-phone" className="block text-sm font-medium text-charcoal mb-2">Phone</label>
                        <input
                          id="addr-phone"
                          type="tel"
                          required
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="addr-line1" className="block text-sm font-medium text-charcoal mb-2">Address Line 1</label>
                      <input
                        id="addr-line1"
                        type="text"
                        required
                        value={addressForm.address_line1}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                        className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="addr-line2" className="block text-sm font-medium text-charcoal mb-2">Address Line 2</label>
                      <input
                        id="addr-line2"
                        type="text"
                        value={addressForm.address_line2}
                        onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                        className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="addr-city" className="block text-sm font-medium text-charcoal mb-2">City</label>
                        <input
                          id="addr-city"
                          type="text"
                          required
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="addr-state" className="block text-sm font-medium text-charcoal mb-2">State</label>
                        <select
                          id="addr-state"
                          required
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent bg-white"
                        >
                          <option value="" disabled>
                            Select state
                          </option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="addr-postal-code" className="block text-sm font-medium text-charcoal mb-2">PIN Code</label>
                        <input
                          id="addr-postal-code"
                          type="text"
                          required
                          pattern="[0-9]{6}"
                          value={addressForm.postal_code}
                          onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                          className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="flex-1 bg-ink text-white py-2 rounded-lg font-semibold hover:bg-ink-light transition-colors"
                      >
                        Save Address
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAddressForm(false)}
                          className="flex-1 border border-ink text-ink py-2 rounded-lg font-semibold hover:bg-ink hover:text-cream transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedAddress === address.id
                            ? 'border-brand-green bg-brand-green/5'
                            : 'border-black/10 hover:border-black/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddress === address.id}
                          onChange={() => setSelectedAddress(address.id)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-ink">{address.full_name}</p>
                              {address.is_default && (
                                <span className="px-2 py-1 bg-ink text-white text-xs rounded">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-charcoal/70">{address.phone}</p>
                            <p className="text-sm text-charcoal/70 mt-1">
                              {address.address_line1}, {address.address_line2 && `${address.address_line2}, `}
                              {address.city}, {address.state} {address.postal_code}
                            </p>
                          </div>
                          {selectedAddress === address.id && (
                            <CheckCircle className="w-5 h-5 text-brand-green" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-black/10 p-6">
                <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-ink" />
                  Pickup Details
                </h2>
                <div className="mb-4 p-4 bg-cream-soft rounded-lg text-sm text-charcoal/70">
                  <p className="font-semibold text-ink mb-1">Spicyfied</p>
                  <p>J-31/95, B-1, Amina Tower, Kachi Bagh, Pili Kothi,</p>
                  <p>Varanasi - 221001, Uttar Pradesh, India</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pickup-name" className="block text-sm font-medium text-charcoal mb-2">Your Name</label>
                    <input
                      id="pickup-name"
                      type="text"
                      required
                      value={pickupName}
                      onChange={(e) => setPickupName(e.target.value)}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="pickup-phone" className="block text-sm font-medium text-charcoal mb-2">Phone</label>
                    <input
                      id="pickup-phone"
                      type="tel"
                      required
                      value={pickupPhone}
                      onChange={(e) => setPickupPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-black/10 p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Order Items</h2>
              <div className="space-y-4">
                {cart.map((item) => {
                  const itemKey = `${item.product.id}-${item.variant.id}`;
                  return (
                  <div key={itemKey} className="flex gap-4 pb-4 border-b border-black/10">
                    {item.image && !failedImages[itemKey] ? (
                      <img
                        src={item.image}
                        alt={item.product.name}
                        onError={() => setFailedImages((prev) => ({ ...prev, [itemKey]: true }))}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-ink to-moss rounded-lg flex items-center justify-center text-white font-bold">
                        {item.product.name[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink">{item.product.name}</h3>
                      <p className="text-sm text-charcoal/50">{item.variant.size}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-charcoal/70">Qty: {item.quantity}</span>
                        <span className="font-semibold text-ink">
                          ₹{Math.round(item.variant.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-black/10 p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Order Notes</h2>
              <textarea
                aria-label="Order notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions?"
                className="w-full px-4 py-3 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-black/10 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-ink mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-charcoal/70">
                  <span>Subtotal</span>
                  <span>₹{Math.round(subtotal)}</span>
                </div>
                <div className="flex justify-between text-charcoal/70">
                  <span>Tax (5%)</span>
                  <span>₹{Math.round(taxAmount)}</span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between text-charcoal/70">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      Delivery
                    </span>
                    <span>
                      {deliveryFeeLoading
                        ? '...'
                        : shippingFee === 0
                        ? 'FREE'
                        : `₹${shippingFee}`}
                    </span>
                  </div>
                )}
                {deliveryType === 'delivery' && (
                  <p className="text-xs text-charcoal/50">
                    Free delivery within 5km of Varanasi (221001) &middot; ₹50 delivery charge
                    elsewhere in India
                  </p>
                )}
                <div className="border-t border-black/10 pt-3 flex justify-between text-lg font-bold text-ink">
                  <span>Total</span>
                  <span className="text-ink">₹{Math.round(totalAmount)}</span>
                </div>
              </div>

              <BulkPricingNote className="mb-4" />

              <div className="mb-4 p-4 bg-cream-soft rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </div>
                {deliveryType === 'pickup' ? (
                  <p className="text-sm text-charcoal/70">Cash on pickup</p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                          paymentMethod === 'upi'
                            ? 'border-brand-green bg-brand-green/5 text-brand-green'
                            : 'border-black/10 text-charcoal/70'
                        }`}
                      >
                        UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                          paymentMethod === 'card'
                            ? 'border-brand-green bg-brand-green/5 text-brand-green'
                            : 'border-black/10 text-charcoal/70'
                        }`}
                      >
                        Card
                      </button>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-charcoal/50">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        You'll be asked to complete {paymentMethod === 'upi' ? 'UPI' : 'card'} payment
                        next. If online payment isn't available yet, we'll reach out to collect it
                        before your order ships.
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!canPlaceOrder}
                className="w-full bg-brand-green text-cream py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>

              <p className="text-xs text-charcoal/50 text-center mt-4">
                By placing this order, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Package, Loader, Eye, X, MapPin, CreditCard, Store, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  order_number: string;
  status: string | null;
  total_amount: number;
  payment_status: string | null;
  payment_method: string | null;
  delivery_type: string;
  created_at: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
}

interface OrderDetails extends Order {
  items: OrderItem[];
  address: Address | null;
  subtotal: number;
  tax_amount: number | null;
  shipping_amount: number | null;
  notes: string | null;
}

interface OrdersPageProps {
  onNavigateToLogin: () => void;
}

export default function OrdersPage({ onNavigateToLogin }: OrdersPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      onNavigateToLogin();
      return;
    }

    loadOrders();
  }, [user, authLoading]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: string) => {
    setDetailsLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, addresses(*)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setSelectedOrder({
        ...order,
        items: items || [],
        address: order.addresses,
      });
    } catch (err) {
      console.error('Error loading order details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending':
        return 'bg-saffron-light/20 text-saffron-dark';
      case 'confirmed':
        return 'bg-saffron-light/35 text-saffron-dark';
      case 'processing':
        return 'bg-ochre/20 text-ink';
      case 'shipped':
        return 'bg-ochre/35 text-ink';
      case 'delivered':
        return 'bg-brand-green text-cream';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      case 'refunded':
        return 'bg-charcoal/10 text-charcoal';
      default:
        return 'bg-charcoal/10 text-charcoal';
    }
  };

  const getStatusText = (status: string | null) => {
    const s = status || 'pending';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const paymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'cod':
        return 'Cash on Pickup';
      case 'upi':
        return 'UPI';
      case 'card':
        return 'Card';
      default:
        return 'Not set';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-8 h-8 text-ink" />
          <h1 className="font-serif text-[28px] md:text-3xl font-semibold text-ink">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-black/10 p-12 text-center">
            <Package className="w-20 h-20 text-charcoal/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-ink mb-2">No orders yet</h2>
            <p className="text-charcoal/70 mb-6">Start shopping to see your orders here</p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-black/10 hover:border-brand-green/40 transition-colors p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-ink">{order.order_number}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-charcoal/50">
                        {order.delivery_type === 'pickup' ? (
                          <Store className="w-3.5 h-3.5" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                        {order.delivery_type === 'pickup' ? 'Pickup' : 'Delivery'}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal/70">
                      Placed on {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-charcoal/70">Total Amount</p>
                      <p className="text-xl font-bold text-ink">
                        ₹{Math.round(order.total_amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => loadOrderDetails(order.id)}
                      className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5 text-charcoal/70" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-black/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {detailsLoading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader className="w-8 h-8 animate-spin text-ink" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-black/10">
                    <div>
                      <h2 className="text-xl font-semibold text-ink">
                        {selectedOrder.order_number}
                      </h2>
                      <p className="text-sm text-charcoal/70 mt-1">
                        Placed on {new Date(selectedOrder.created_at || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-2 hover:bg-black/5 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                            selectedOrder.status
                          )}`}
                        >
                          {getStatusText(selectedOrder.status)}
                        </span>
                        <span className="text-sm text-charcoal/70">
                          Payment: {selectedOrder.payment_status}
                        </span>
                      </div>
                    </div>

                    {selectedOrder.delivery_type === 'pickup' ? (
                      <div className="bg-cream-soft rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Store className="w-5 h-5 text-ink mt-0.5" />
                          <div>
                            <p className="font-semibold text-ink">Pickup from Spicyfied</p>
                            <p className="text-sm text-charcoal/70">
                              J-31/95, B-1, Amina Tower, Kachi Bagh, Pili Kothi, Varanasi - 221001
                            </p>
                            {selectedOrder.notes && (
                              <p className="text-sm text-charcoal/70 mt-1">{selectedOrder.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      selectedOrder.address && (
                        <div className="bg-cream-soft rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="w-5 h-5 text-ink mt-0.5" />
                            <div>
                              <p className="font-semibold text-ink">
                                {selectedOrder.address.full_name}
                              </p>
                              <p className="text-sm text-charcoal/70">{selectedOrder.address.phone}</p>
                              <p className="text-sm text-charcoal/70 mt-1">
                                {selectedOrder.address.address_line1}
                                {selectedOrder.address.address_line2 &&
                                  `, ${selectedOrder.address.address_line2}`}
                                <br />
                                {selectedOrder.address.city}, {selectedOrder.address.state}{' '}
                                {selectedOrder.address.postal_code}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    <div>
                      <h3 className="font-semibold text-ink mb-3">Order Items</h3>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-start p-3 bg-cream-soft rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-ink">{item.product_name}</p>
                              <p className="text-sm text-charcoal/70">{item.variant_name}</p>
                              <p className="text-sm text-charcoal/70">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-semibold text-ink">
                              ₹{Math.round(item.total_price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-black/10 pt-4 space-y-2">
                      <div className="flex justify-between text-charcoal/70">
                        <span>Subtotal</span>
                        <span>₹{Math.round(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-charcoal/70">
                        <span>Tax</span>
                        <span>₹{Math.round(selectedOrder.tax_amount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-charcoal/70">
                        <span>Shipping</span>
                        <span>
                          {!selectedOrder.shipping_amount
                            ? 'FREE'
                            : `₹${Math.round(selectedOrder.shipping_amount)}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold text-ink pt-2 border-t border-black/10">
                        <span>Total</span>
                        <span className="text-ink">
                          ₹{Math.round(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-charcoal/70 p-3 bg-cream-soft rounded-lg">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment Method: {paymentMethodLabel(selectedOrder.payment_method)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

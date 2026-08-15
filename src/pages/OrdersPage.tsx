import { useState, useEffect } from 'react';
import { Package, Loader, Eye, X, MapPin, Calendar, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_size: string;
  price: number;
  quantity: number;
  subtotal: number;
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
  tax_amount: number;
  shipping_fee: number;
  discount_amount: number;
}

interface OrdersPageProps {
  onNavigateToLogin: () => void;
}

export default function OrdersPage({ onNavigateToLogin }: OrdersPageProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      onNavigateToLogin();
      return;
    }

    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user!.id)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#2d5016]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-8 h-8 text-[#2d5016]" />
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-[#2d5016] text-white rounded-lg font-semibold hover:bg-[#1f3910] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {order.estimated_delivery && (
                      <p className="text-sm text-gray-600">
                        Estimated delivery: {new Date(order.estimated_delivery).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-[#2d5016]">
                        ₹{Math.round(order.total_amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => loadOrderDetails(order.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {detailsLoading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader className="w-8 h-8 animate-spin text-[#2d5016]" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedOrder.order_number}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Placed on {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                            selectedOrder.status
                          )}`}
                        >
                          {getStatusText(selectedOrder.status)}
                        </span>
                        <span className="text-sm text-gray-600">
                          Payment: {selectedOrder.payment_status}
                        </span>
                      </div>
                      {selectedOrder.estimated_delivery && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Estimated delivery:{' '}
                            {new Date(selectedOrder.estimated_delivery).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedOrder.address && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="w-5 h-5 text-[#2d5016] mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {selectedOrder.address.full_name}
                            </p>
                            <p className="text-sm text-gray-600">{selectedOrder.address.phone}</p>
                            <p className="text-sm text-gray-600 mt-1">
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
                    )}

                    <div>
                      <h3 className="font-bold text-gray-900 mb-3">Order Items</h3>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{item.product_name}</p>
                              <p className="text-sm text-gray-600">{item.variant_size}</p>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-semibold text-[#2d5016]">
                              ₹{Math.round(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>₹{Math.round(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>₹{Math.round(selectedOrder.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span>
                          {selectedOrder.shipping_fee === 0
                            ? 'FREE'
                            : `₹${Math.round(selectedOrder.shipping_fee)}`}
                        </span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-₹{Math.round(selectedOrder.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-[#2d5016]">
                          ₹{Math.round(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment Method: Cash on Delivery</span>
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

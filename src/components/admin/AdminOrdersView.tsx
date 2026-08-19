import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, Search, Eye } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
  delivery_type: string;
  email: string;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  shipping_address_id: string | null;
  addresses: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  order_items: Array<{
    id: string;
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`*, addresses(*), order_items(*)`)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders((data as any) || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-[#211C17]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by order number or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
          >
            <option value="all">All Orders</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.order_number}</td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.addresses?.full_name || '—'}
                    </div>
                    <div className="text-xs text-gray-500">{order.email}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 capitalize">{order.delivery_type}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                    ₹{Math.round(order.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-[#211C17] hover:bg-[#211C17]/10 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Number</p>
                  <p className="font-semibold text-gray-900">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  disabled={updatingStatus}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Customer & Payment</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                  <p className="text-sm text-gray-900">{selectedOrder.email}</p>
                  <p className="text-sm text-gray-600 capitalize">Fulfillment: {selectedOrder.delivery_type}</p>
                  <p className="text-sm text-gray-600">
                    Payment: {paymentMethodLabel(selectedOrder.payment_method)} ({selectedOrder.payment_status})
                  </p>
                </div>
              </div>

              {selectedOrder.delivery_type === 'pickup' ? (
                selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Pickup Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900">{selectedOrder.notes}</p>
                    </div>
                  </div>
                )
              ) : (
                selectedOrder.addresses && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Shipping Address</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900">{selectedOrder.addresses.full_name}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.addresses.phone}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.addresses.address_line1}</p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.addresses.city}, {selectedOrder.addresses.state}{' '}
                        {selectedOrder.addresses.postal_code}
                      </p>
                    </div>
                  </div>
                )
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-600">
                          {item.variant_name} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{Math.round(item.total_price)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{Math.round(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>₹{Math.round(selectedOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>₹{Math.round(selectedOrder.shipping_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2">
                  <span>Total Amount</span>
                  <span className="text-[#211C17]">₹{Math.round(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

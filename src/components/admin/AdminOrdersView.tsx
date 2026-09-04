import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, Search, Eye, Download, MessageCircle, Truck } from 'lucide-react';
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  normalizeStatus,
  paymentMethodLabel,
  extractOrderPhone,
  toWhatsAppNumber,
} from '../../lib/orderStatus';
import { downloadCsv } from '../../lib/csvExport';

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
  tracking_number: string | null;
  carrier: string | null;
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

const COMMON_CARRIERS = ['India Post', 'Delhivery', 'DTDC', 'Blue Dart', 'Ekart', 'Self-delivery'];

export default function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [carrierDraft, setCarrierDraft] = useState('');
  const [trackingDraft, setTrackingDraft] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  useEffect(() => {
    setCarrierDraft(selectedOrder?.carrier || '');
    setTrackingDraft(selectedOrder?.tracking_number || '');
  }, [selectedOrder?.id]);

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

  const handleSaveShipment = async () => {
    if (!selectedOrder) return;
    setSavingShipment(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          carrier: carrierDraft.trim() || null,
          tracking_number: trackingDraft.trim() || null,
          status: selectedOrder.status === 'shipped' ? selectedOrder.status : 'shipped',
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      const updated = {
        ...selectedOrder,
        carrier: carrierDraft.trim() || null,
        tracking_number: trackingDraft.trim() || null,
        status: 'shipped',
      };
      setSelectedOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error('Error saving shipment details:', err);
      alert('Failed to save shipping details');
    } finally {
      setSavingShipment(false);
    }
  };

  const handleNotifyWhatsApp = (order: Order) => {
    const phone = extractOrderPhone(order);
    const waNumber = phone ? toWhatsAppNumber(phone) : null;
    if (!waNumber) {
      alert("Couldn't find a phone number on this order to message.");
      return;
    }
    const name = order.addresses?.full_name || 'there';
    const lines = [
      `Hi ${name}, your Spicyfied order ${order.order_number} is on its way!`,
      order.carrier ? `Carrier: ${order.carrier}` : null,
      order.tracking_number ? `Tracking number: ${order.tracking_number}` : null,
      `Total: ₹${Math.round(order.total_amount)}`,
      `Thank you for shopping with Spicyfied.`,
    ].filter(Boolean);
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      order.order_number.toLowerCase().includes(q) ||
      order.email.toLowerCase().includes(q) ||
      order.addresses?.full_name?.toLowerCase().includes(q) ||
      order.addresses?.phone?.includes(q)
    );
  });

  const handleExportCsv = () => {
    downloadCsv(
      `orders-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Order #', 'Date', 'Customer', 'Email', 'Phone', 'Type', 'Status', 'Payment', 'Carrier', 'Tracking #', 'Total'],
      filteredOrders.map((o) => [
        o.order_number,
        new Date(o.created_at).toLocaleDateString(),
        o.addresses?.full_name || '',
        o.email,
        extractOrderPhone(o) || '',
        o.delivery_type,
        o.status,
        paymentMethodLabel(o.payment_method),
        o.carrier || '',
        o.tracking_number || '',
        Math.round(o.total_amount),
      ])
    );
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
              placeholder="Search by order #, name, email, or phone..."
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
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
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
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_BADGE_CLASSES[normalizeStatus(order.status)]}`}
                    >
                      {STATUS_LABELS[normalizeStatus(order.status)]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                    ₹{Math.round(order.total_amount)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-[#211C17] hover:bg-[#211C17]/10 rounded-lg transition-colors"
                        title="View details / update status"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => handleNotifyWhatsApp(order)}
                          className="p-2 text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Send WhatsApp shipping update"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
              <h2 className="text-2xl font-bold text-gray-900">Order {selectedOrder.order_number}</h2>
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
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                      disabled={updatingStatus || selectedOrder.status === status}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                        selectedOrder.status === status
                          ? `${STATUS_BADGE_CLASSES[status]} border-transparent cursor-default`
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#211C17] disabled:opacity-50'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Shipping Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Carrier</label>
                      <input
                        list="carrier-options"
                        type="text"
                        value={carrierDraft}
                        onChange={(e) => setCarrierDraft(e.target.value)}
                        placeholder="e.g. India Post"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                      />
                      <datalist id="carrier-options">
                        {COMMON_CARRIERS.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={trackingDraft}
                        onChange={(e) => setTrackingDraft(e.target.value)}
                        placeholder="e.g. EE123456789IN"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveShipment}
                      disabled={savingShipment || (!carrierDraft.trim() && !trackingDraft.trim())}
                      className="px-4 py-2 bg-[#211C17] text-white text-sm font-semibold rounded-lg hover:bg-[#211C17]/90 transition-colors disabled:opacity-50"
                    >
                      {savingShipment ? 'Saving...' : 'Save & mark shipped'}
                    </button>
                    <button
                      onClick={() => handleNotifyWhatsApp(selectedOrder)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Notify via WhatsApp
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Opens a pre-filled WhatsApp message to the customer's number — you press send.
                    Fully automatic sending needs a WhatsApp Business API account (see admin notes).
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Customer & Payment</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                  <p className="text-sm text-gray-900">{selectedOrder.email}</p>
                  {extractOrderPhone(selectedOrder) && (
                    <p className="text-sm text-gray-600">{extractOrderPhone(selectedOrder)}</p>
                  )}
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

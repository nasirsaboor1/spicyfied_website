import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, Search, Eye, Download, MessageCircle, Truck, Printer, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
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
import { printPackingSlip } from '../../lib/packingSlip';

const PAGE_SIZE = 20;

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
  cancellation_reason: string | null;
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

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  created_at: string | null;
}

interface AdminOrdersViewProps {
  initialSearch?: string;
}

export default function AdminOrdersView({ initialSearch }: AdminOrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [searchInput, setSearchInput] = useState(initialSearch || '');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [carrierDraft, setCarrierDraft] = useState('');
  const [trackingDraft, setTrackingDraft] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, page, searchQuery]);

  useEffect(() => {
    setCarrierDraft(selectedOrder?.carrier || '');
    setTrackingDraft(selectedOrder?.tracking_number || '');
    setPendingCancel(false);
    setCancelReason('');
    setStatusHistory([]);
    if (selectedOrder) loadStatusHistory(selectedOrder.id);
  }, [selectedOrder?.id]);

  const loadStatusHistory = async (orderId: string) => {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('id, status, note, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (!error) setStatusHistory(data || []);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`*, addresses(*), order_items(*)`, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/[%,]/g, '');
        query = query.or(`order_number.ilike.%${q}%,email.ilike.%${q}%`);
      }

      query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setOrders((data as any) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const recordStatusHistory = async (orderId: string, status: string, note: string | null) => {
    const { error } = await supabase.from('order_status_history').insert({ order_id: orderId, status, note });
    if (error) console.error('Error recording status history:', error);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, note: string | null = null) => {
    setUpdatingStatus(true);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'cancelled' && note) updates.cancellation_reason = note;

      const { error } = await supabase.from('orders').update(updates).eq('id', orderId);

      if (error) throw error;

      await recordStatusHistory(orderId, newStatus, note);

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, ...updates } : o)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: newStatus, ...updates } : prev));
      setPendingCancel(false);
      setCancelReason('');
      if (selectedOrder?.id === orderId) loadStatusHistory(orderId);
    } catch (err: any) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusButtonClick = (orderId: string, status: string) => {
    if (status === 'cancelled') {
      setPendingCancel(true);
      return;
    }
    handleUpdateStatus(orderId, status);
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

      const note = [carrierDraft.trim() && `Carrier: ${carrierDraft.trim()}`, trackingDraft.trim() && `Tracking: ${trackingDraft.trim()}`]
        .filter(Boolean)
        .join(', ');
      await recordStatusHistory(selectedOrder.id, 'shipped', note || null);
      loadStatusHistory(selectedOrder.id);
    } catch (err) {
      console.error('Error saving shipment details:', err);
      alert('Failed to save shipping details');
    } finally {
      setSavingShipment(false);
    }
  };

  const openWhatsAppFallback = (order: Order) => {
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

  const handleNotifyWhatsApp = async (order: Order) => {
    setSendingWhatsApp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: { orderId: order.id, type: 'order_shipped' },
      });

      if (error || !data?.success) {
        // Not configured yet, or the send failed - fall back to the manual click-to-chat link.
        openWhatsAppFallback(order);
        return;
      }

      alert(`WhatsApp shipping update sent for order ${order.order_number}.`);
    } catch (err) {
      console.error('WhatsApp send error:', err);
      openWhatsAppFallback(order);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      let query = supabase
        .from('orders')
        .select(`*, addresses(*), order_items(*)`)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/[%,]/g, '');
        query = query.or(`order_number.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      downloadCsv(
        `orders-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Order #', 'Date', 'Customer', 'Email', 'Phone', 'Type', 'Status', 'Payment', 'Carrier', 'Tracking #', 'Total'],
        ((data as any as Order[]) || []).map((o) => [
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
    } catch (err) {
      console.error('Error exporting orders:', err);
      alert('Failed to export orders');
    } finally {
      setExportingCsv(false);
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
              placeholder="Search by order # or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
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
            disabled={exportingCsv}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingCsv ? 'Exporting...' : 'Export CSV'}
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
              {orders.map((order) => (
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
                          disabled={sendingWhatsApp}
                          className="p-2 text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Send WhatsApp shipping update"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => printPackingSlip(order)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Print packing slip"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}

        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => (p + 1) * PAGE_SIZE < totalCount ? p + 1 : p)}
                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Order {selectedOrder.order_number}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => printPackingSlip(selectedOrder)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
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
                      onClick={() => handleStatusButtonClick(selectedOrder.id, status)}
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

                {pendingCancel && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-red-800 mb-2">
                      Reason for cancelling (shown in the order record)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="e.g. Customer requested, item out of stock..."
                        className="flex-1 px-3 py-2 text-sm border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', cancelReason.trim() || null)}
                          disabled={updatingStatus}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Confirm Cancel
                        </button>
                        <button
                          onClick={() => {
                            setPendingCancel(false);
                            setCancelReason('');
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'cancelled' && selectedOrder.cancellation_reason && (
                  <p className="mt-2 text-sm text-red-700">
                    Cancelled: {selectedOrder.cancellation_reason}
                  </p>
                )}

                {statusHistory.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-medium text-gray-700">{STATUS_LABELS[normalizeStatus(h.status)]}</span>
                          {h.created_at && ` — ${new Date(h.created_at).toLocaleString()}`}
                          {h.note && ` · ${h.note}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
                      disabled={sendingWhatsApp}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {sendingWhatsApp ? 'Sending...' : 'Notify via WhatsApp'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Sends automatically once WhatsApp is configured; otherwise opens a
                    pre-filled message for you to send by hand.
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

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, Search, Mail, Phone, ShoppingBag } from 'lucide-react';

interface OrderRow {
  id: string;
  email: string;
  total_amount: number;
  created_at: string;
  addresses: { full_name: string; phone: string } | null;
}

interface CustomerSummary {
  email: string;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
}

interface AdminCustomersViewProps {
  onViewOrders: (email: string) => void;
}

export default function AdminCustomersView({ onViewOrders }: AdminCustomersViewProps) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, email, total_amount, created_at, addresses(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as any) || []);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const customers = useMemo(() => {
    const byEmail = new Map<string, CustomerSummary>();
    for (const order of orders) {
      const existing = byEmail.get(order.email);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += Number(order.total_amount);
        if (!existing.phone && order.addresses?.phone) existing.phone = order.addresses.phone;
      } else {
        byEmail.set(order.email, {
          email: order.email,
          name: order.addresses?.full_name || order.email.split('@')[0],
          phone: order.addresses?.phone || null,
          orderCount: 1,
          totalSpent: Number(order.total_amount),
          lastOrderAt: order.created_at,
        });
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone?.includes(q);
  });

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
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#211C17] focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contact</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Orders</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Spent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Order</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.email} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Mail className="w-3 h-3" />
                      {c.email}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-center">{c.orderCount}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                    ₹{Math.round(c.totalSpent).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(c.lastOrderAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onViewOrders(c.email)}
                      className="p-2 text-[#211C17] hover:bg-[#211C17]/10 rounded-lg transition-colors inline-flex"
                      title="View orders"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, ShoppingBag, Package, IndianRupee, Loader, Download } from 'lucide-react';
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_CHART_COLORS, normalizeStatus } from '../../lib/orderStatus';
import { downloadCsv } from '../../lib/csvExport';

interface OrderRow {
  id: string;
  order_number: string;
  email: string;
  created_at: string | null;
  status: string | null;
  total_amount: number;
  order_items: Array<{ product_name: string; total_price: number; quantity: number }>;
}

const LOW_STOCK_THRESHOLD = 10;

const PERIODS = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: '365d', label: '1 Year', days: 365 },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function bucketKeyFor(date: Date, bucketDays: number) {
  if (bucketDays <= 1) return date.toISOString().slice(0, 10);
  if (bucketDays <= 7) {
    const monday = new Date(date);
    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);
    return monday.toISOString().slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function bucketLabel(key: string, bucketDays: number) {
  if (bucketDays <= 1) return new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (bucketDays <= 7) return new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export default function AdminDashboardView() {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [currentOrders, setCurrentOrders] = useState<OrderRow[]>([]);
  const [previousOrders, setPreviousOrders] = useState<OrderRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const periodDef = PERIODS.find((p) => p.key === period)!;

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const periodStart = startOfDay(new Date(now));
      periodStart.setDate(periodStart.getDate() - periodDef.days);
      const previousStart = startOfDay(new Date(periodStart));
      previousStart.setDate(previousStart.getDate() - periodDef.days);

      const ORDER_SELECT = 'id, order_number, email, created_at, status, total_amount, order_items(product_name, total_price, quantity)';

      const [{ data: currentData }, { data: previousData }, { data: pendingData }, { data: lowStockData }, { data: recentData }] =
        await Promise.all([
          supabase.from('orders').select(ORDER_SELECT).gte('created_at', periodStart.toISOString()),
          supabase
            .from('orders')
            .select(ORDER_SELECT)
            .gte('created_at', previousStart.toISOString())
            .lt('created_at', periodStart.toISOString()),
          supabase.from('orders').select('id').eq('status', 'pending'),
          supabase.from('product_variants').select('id').lt('stock_quantity', LOW_STOCK_THRESHOLD),
          supabase
            .from('orders')
            .select(ORDER_SELECT)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

      setCurrentOrders((currentData as any) || []);
      setPreviousOrders((previousData as any) || []);
      setPendingCount(pendingData?.length || 0);
      setLowStockCount(lowStockData?.length || 0);
      setRecentOrders((recentData as any) || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const sum = (orders: OrderRow[]) => orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const revenue = sum(currentOrders);
    const prevRevenue = sum(previousOrders);
    const orderCount = currentOrders.length;
    const prevOrderCount = previousOrders.length;
    const aov = orderCount > 0 ? revenue / orderCount : 0;
    const prevAov = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

    const pctChange = (curr: number, prev: number): number | null => {
      if (prev === 0) return null;
      return ((curr - prev) / prev) * 100;
    };

    return {
      revenue,
      orderCount,
      aov,
      revenueChange: pctChange(revenue, prevRevenue),
      orderChange: pctChange(orderCount, prevOrderCount),
      aovChange: pctChange(aov, prevAov),
    };
  }, [currentOrders, previousOrders]);

  const bucketDays = periodDef.days <= 14 ? 1 : periodDef.days <= 90 ? 7 : 30;

  const trend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const order of currentOrders) {
      if (!order.created_at) continue;
      const key = bucketKeyFor(new Date(order.created_at), bucketDays);
      buckets.set(key, (buckets.get(key) || 0) + Number(order.total_amount));
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, value]) => ({ key, label: bucketLabel(key, bucketDays), value }));
  }, [currentOrders, bucketDays]);

  const maxTrendValue = Math.max(1, ...trend.map((t) => t.value));

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const status of STATUS_OPTIONS) counts[status] = 0;
    for (const order of currentOrders) counts[normalizeStatus(order.status)]++;
    return STATUS_OPTIONS.map((status) => ({ status, count: counts[status] })).filter((s) => s.count > 0);
  }, [currentOrders]);

  const totalStatusCount = statusBreakdown.reduce((s, x) => s + x.count, 0);

  const topProducts = useMemo(() => {
    const revenueByProduct = new Map<string, { revenue: number; quantity: number }>();
    for (const order of currentOrders) {
      for (const item of order.order_items || []) {
        const entry = revenueByProduct.get(item.product_name) || { revenue: 0, quantity: 0 };
        entry.revenue += Number(item.total_price);
        entry.quantity += Number(item.quantity);
        revenueByProduct.set(item.product_name, entry);
      }
    }
    return Array.from(revenueByProduct.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [currentOrders]);

  const maxProductRevenue = Math.max(1, ...topProducts.map((p) => p.revenue));

  const handleExportReport = () => {
    downloadCsv(
      `spicyfied-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Order #', 'Date', 'Email', 'Status', 'Total'],
      currentOrders.map((o) => [
        o.order_number,
        o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
        o.email,
        o.status,
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

  const statCards = [
    {
      label: `Revenue (${periodDef.label})`,
      value: `₹${Math.round(metrics.revenue).toLocaleString('en-IN')}`,
      change: metrics.revenueChange,
      icon: IndianRupee,
      color: 'bg-green-500',
    },
    {
      label: `Orders (${periodDef.label})`,
      value: metrics.orderCount,
      change: metrics.orderChange,
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      label: 'Avg Order Value',
      value: `₹${Math.round(metrics.aov).toLocaleString('en-IN')}`,
      change: metrics.aovChange,
      icon: TrendingUp,
      color: 'bg-violet-500',
    },
    {
      label: 'Pending Orders',
      value: pendingCount,
      change: null,
      icon: ShoppingBag,
      color: 'bg-amber-500',
    },
    {
      label: 'Low Stock Items',
      value: lowStockCount,
      change: null,
      icon: Package,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                period === p.key ? 'bg-[#211C17] text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-[#211C17]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Download Report (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stat.change !== null && stat.change !== undefined && (
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stat.change).toFixed(0)}%
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h2>
          {trend.length === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">No orders in this period</p>
          ) : (
            <div className="flex items-end gap-1.5 h-48">
              {trend.map((t) => (
                <div key={t.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    title={`${t.label}: ₹${Math.round(t.value).toLocaleString('en-IN')}`}
                    className="w-full bg-[#211C17] rounded-t-sm hover:bg-[#B85C2E] transition-colors"
                    style={{ height: `${Math.max(3, (t.value / maxTrendValue) * 100)}%` }}
                  />
                  <span className="text-[10px] text-gray-500 mt-1.5 whitespace-nowrap">{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Orders by Status</h2>
          {totalStatusCount === 0 ? (
            <p className="text-sm text-gray-500 py-12 text-center">No orders in this period</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {statusBreakdown.map((s) => (
                  <div
                    key={s.status}
                    title={`${STATUS_LABELS[s.status]}: ${s.count}`}
                    style={{ width: `${(s.count / totalStatusCount) * 100}%`, backgroundColor: STATUS_CHART_COLORS[s.status] }}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {statusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_CHART_COLORS[s.status] }} />
                      <span className="text-gray-700">{STATUS_LABELS[s.status]}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top Products ({periodDef.label})</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No sales in this period</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-800 font-medium truncate pr-2">{p.name}</span>
                    <span className="text-gray-600 flex-shrink-0">₹{Math.round(p.revenue).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#B85C2E] rounded-full"
                      style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Order #</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Status</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-600">{order.email}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: STATUS_CHART_COLORS[normalizeStatus(order.status)] }}
                      >
                        {STATUS_LABELS[normalizeStatus(order.status)]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sm font-semibold text-gray-900 text-right">
                      ₹{Math.round(order.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

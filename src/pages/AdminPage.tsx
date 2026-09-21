import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader, Package, ShoppingBag, BarChart3, Users, UserCircle, AlertTriangle, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminOrdersView from '../components/admin/AdminOrdersView';
import AdminProductsView from '../components/admin/AdminProductsView';
import AdminDashboardView from '../components/admin/AdminDashboardView';
import AdminTeamView from '../components/admin/AdminTeamView';
import AdminCustomersView from '../components/admin/AdminCustomersView';
import AdminDeliveryView from '../components/admin/AdminDeliveryView';

interface AdminPageProps {
  onNavigateToTeamLogin: () => void;
}

type AdminView = 'dashboard' | 'orders' | 'products' | 'customers' | 'delivery' | 'team';

export default function AdminPage({ onNavigateToTeamLogin }: AdminPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      onNavigateToTeamLogin();
      return;
    }

    checkAdminAccess();
  }, [user, authLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .in('stock_status', ['low_stock', 'out_of_stock'])
      .then(({ count }) => setLowStockCount(count || 0));
  }, [isAdmin]);

  const handleViewCustomerOrders = (email: string) => {
    setOrdersSearch(email);
    setCurrentView('orders');
  };

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      setIsAdmin(!!data);
    } catch (err) {
      console.error('Error checking admin access:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#211C17]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access the admin panel.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-[#211C17] text-white rounded-lg font-semibold hover:bg-[#140F0C] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package, badge: lowStockCount },
    { id: 'customers', label: 'Customers', icon: UserCircle },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'team', label: 'Team', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} low or out of stock.
            </span>
            <button
              onClick={() => setCurrentView('products')}
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Review now
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-md p-4 sticky top-24">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as AdminView)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                      currentView === item.id
                        ? 'bg-[#211C17] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                    {!!item.badge && (
                      <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            {currentView === 'dashboard' && <AdminDashboardView />}
            {currentView === 'orders' && <AdminOrdersView initialSearch={ordersSearch} />}
            {currentView === 'products' && <AdminProductsView />}
            {currentView === 'customers' && <AdminCustomersView onViewOrders={handleViewCustomerOrders} />}
            {currentView === 'delivery' && <AdminDeliveryView />}
            {currentView === 'team' && <AdminTeamView />}
          </main>
        </div>
      </div>
    </div>
  );
}

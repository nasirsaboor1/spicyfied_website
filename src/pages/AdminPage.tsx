import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader, Package, ShoppingBag, Tag, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminOrdersView from '../components/admin/AdminOrdersView';
import AdminInventoryView from '../components/admin/AdminInventoryView';
import AdminCouponsView from '../components/admin/AdminCouponsView';
import AdminDashboardView from '../components/admin/AdminDashboardView';

interface AdminPageProps {
  onNavigateToLogin: () => void;
}

type AdminView = 'dashboard' | 'orders' | 'inventory' | 'coupons';

export default function AdminPage({ onNavigateToLogin }: AdminPageProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  useEffect(() => {
    if (!user) {
      onNavigateToLogin();
      return;
    }

    checkAdminAccess();
  }, [user]);

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
        <Loader className="w-8 h-8 animate-spin text-[#2d5016]" />
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
            className="px-6 py-3 bg-[#2d5016] text-white rounded-lg font-semibold hover:bg-[#1f3910] transition-colors"
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
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'coupons', label: 'Coupons', icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
      </div>

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
                        ? 'bg-[#2d5016] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            {currentView === 'dashboard' && <AdminDashboardView />}
            {currentView === 'orders' && <AdminOrdersView />}
            {currentView === 'inventory' && <AdminInventoryView />}
            {currentView === 'coupons' && <AdminCouponsView />}
          </main>
        </div>
      </div>
    </div>
  );
}

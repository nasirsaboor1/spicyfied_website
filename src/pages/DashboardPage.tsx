import { useState, useEffect } from 'react';
import { User, MapPin, Package, Edit2, Plus, Trash2, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean | null;
}

interface OrderStats {
  total: number;
  pending: number;
  delivered: number;
}

interface DashboardPageProps {
  onNavigateToLogin: () => void;
  onNavigateToOrders: () => void;
}

export default function DashboardPage({ onNavigateToLogin, onNavigateToOrders }: DashboardPageProps) {
  const { user, customer, updateProfile, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({ total: 0, pending: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
  });

  const [addressForm, setAddressForm] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
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

    if (customer) {
      setProfileForm({
        full_name: customer.full_name,
        phone: customer.phone || '',
      });
    }

    loadData();
  }, [user, authLoading, customer]);

  const loadData = async () => {
    try {
      await Promise.all([loadAddresses(), loadOrderStats()]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user!.id)
      .order('is_default', { ascending: false });

    if (error) throw error;
    setAddresses(data || []);
  };

  const loadOrderStats = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('user_id', user!.id);

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter((o) => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status || '')).length,
      delivered: data.filter((o) => o.status === 'delivered').length,
    };

    setOrderStats(stats);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error } = await updateProfile(profileForm.full_name, profileForm.phone);

    if (error) {
      setError(error.message);
    } else {
      setEditingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update(addressForm)
          .eq('id', editingAddress);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('addresses')
          .insert({
            user_id: user!.id,
            ...addressForm,
          });

        if (error) throw error;
      }

      await loadAddresses();
      setShowAddressForm(false);
      setEditingAddress(null);
      resetAddressForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditAddress = (address: Address) => {
    setAddressForm({
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      is_default: address.is_default ?? false,
    });
    setEditingAddress(address.id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      await loadAddresses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user!.id);

      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;
      await loadAddresses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      full_name: customer?.full_name || '',
      phone: customer?.phone || '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
    });
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
        <h1 className="font-serif text-[28px] md:text-3xl font-semibold text-ink mb-8">My Dashboard</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-black/10 p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-ink" />
              <span className="text-3xl font-bold text-ink">{orderStats.total}</span>
            </div>
            <p className="text-charcoal/70 font-medium">Total Orders</p>
          </div>

          <div className="bg-white rounded-xl border border-black/10 p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-saffron-dark" />
              <span className="text-3xl font-bold text-saffron-dark">{orderStats.pending}</span>
            </div>
            <p className="text-charcoal/70 font-medium">Active Orders</p>
          </div>

          <div className="bg-white rounded-xl border border-black/10 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-brand-green" />
              <span className="text-3xl font-bold text-brand-green">{orderStats.delivered}</span>
            </div>
            <p className="text-charcoal/70 font-medium">Delivered</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-black/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <User className="w-5 h-5 text-ink" />
                Profile Information
              </h2>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-charcoal/70" />
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Phone</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-ink text-white py-2 rounded-lg font-semibold hover:bg-ink-light transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="flex-1 border border-ink text-ink py-2 rounded-lg font-semibold hover:bg-ink hover:text-cream transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-charcoal/70">Email</p>
                  <p className="font-semibold text-ink">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-charcoal/70">Full Name</p>
                  <p className="font-semibold text-ink">{customer?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-charcoal/70">Phone</p>
                  <p className="font-semibold text-ink">{customer?.phone || 'Not provided'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-black/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <MapPin className="w-5 h-5 text-ink" />
                Saved Addresses
              </h2>
              {!showAddressForm && (
                <button
                  onClick={() => {
                    resetAddressForm();
                    setShowAddressForm(true);
                  }}
                  className="flex items-center gap-2 text-ink hover:underline font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              )}
            </div>

            {showAddressForm ? (
              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={addressForm.full_name}
                      onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Phone</label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Address Line 1</label>
                  <input
                    type="text"
                    required
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                    className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">City</label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">State</label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">PIN</label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{6}"
                      value={addressForm.postal_code}
                      onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-ink text-white py-2 rounded-lg font-semibold hover:bg-ink-light transition-colors"
                  >
                    {editingAddress ? 'Update' : 'Save'} Address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                      resetAddressForm();
                    }}
                    className="flex-1 border border-ink text-ink py-2 rounded-lg font-semibold hover:bg-ink hover:text-cream transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : addresses.length === 0 ? (
              <p className="text-charcoal/70 text-center py-4">No saved addresses yet</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="p-4 border border-black/10 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-ink">{address.full_name}</p>
                          {address.is_default && (
                            <span className="px-2 py-0.5 bg-ink text-white text-xs rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-charcoal/70">{address.phone}</p>
                        <p className="text-sm text-charcoal/70 mt-1">
                          {address.address_line1}, {address.city}, {address.state} {address.postal_code}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="p-2 hover:bg-black/5 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-charcoal/70" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="p-2 hover:bg-black/5 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    {!address.is_default && (
                      <button
                        onClick={() => handleSetDefaultAddress(address.id)}
                        className="text-sm text-ink hover:underline"
                      >
                        Set as default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNavigateToOrders}
            className="w-full bg-white rounded-xl border border-black/10 hover:border-brand-green/40 transition-colors text-left p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-ink" />
                <div>
                  <h3 className="font-semibold text-ink">View All Orders</h3>
                  <p className="text-sm text-charcoal/70">Track and manage your orders</p>
                </div>
              </div>
              <span className="text-ink font-semibold">View →</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Loader, UserPlus, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminAccount, listAdmins, addAdminByEmail, setAdminActive } from '../../lib/adminTeam';

export default function AdminTeamView() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setAdmins(await listAdmins());
    } catch (err: any) {
      setError(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await addAdminByEmail(newEmail.trim());
      setNewEmail('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (admin: AdminAccount) => {
    setError('');
    try {
      await setAdminActive(admin.id, !admin.is_active);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Add a teammate</h2>
        <p className="text-sm text-gray-500 mb-4">
          They need an account first — have them sign up at{' '}
          <span className="font-mono text-xs bg-cream-soft px-1.5 py-0.5 rounded">/signup</span>{' '}
          with their email, then add that same email here to grant admin access.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="teammate@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add as Admin'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Admin accounts</h2>
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-3"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {admin.email}
                  {admin.id === user?.id && (
                    <span className="ml-2 text-xs text-gray-500">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {admin.is_active ? 'Active' : 'Access revoked'}
                </p>
              </div>
              <button
                onClick={() => handleToggle(admin)}
                disabled={admin.id === user?.id}
                title={admin.id === user?.id ? "You can't revoke your own access" : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  admin.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {admin.is_active ? (
                  <>
                    <ShieldOff className="w-4 h-4" />
                    Revoke
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Reactivate
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

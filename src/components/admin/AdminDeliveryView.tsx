import { useState, useEffect } from 'react';
import { Loader, Truck, Plus, Trash2, Save } from 'lucide-react';
import {
  DeliverySettings,
  DeliveryZone,
  getDeliverySettings,
  updateDeliverySettings,
  listDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
} from '../../lib/adminDelivery';

const emptyNewZone = { pincode: '', label: '', delivery_fee: 0 };

export default function AdminDeliveryView() {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [newZone, setNewZone] = useState(emptyNewZone);
  const [addingZone, setAddingZone] = useState(false);
  const [savingPincode, setSavingPincode] = useState<string | null>(null);
  const [deletingPincode, setDeletingPincode] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [settingsData, zonesData] = await Promise.all([getDeliverySettings(), listDeliveryZones()]);
      setSettings(settingsData);
      setZones(zonesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setError('');
    try {
      await updateDeliverySettings(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveZone = async (zone: DeliveryZone) => {
    setSavingPincode(zone.pincode);
    setError('');
    try {
      await updateDeliveryZone(zone.pincode, { label: zone.label || '', delivery_fee: zone.delivery_fee });
    } catch (err: any) {
      setError(err.message || 'Failed to save pincode');
    } finally {
      setSavingPincode(null);
    }
  };

  const handleDeleteZone = async (pincode: string) => {
    if (!confirm(`Remove the special delivery rule for pincode ${pincode}? It will fall back to the default fee.`)) {
      return;
    }
    setDeletingPincode(pincode);
    setError('');
    try {
      await deleteDeliveryZone(pincode);
      setZones((prev) => prev.filter((z) => z.pincode !== pincode));
    } catch (err: any) {
      setError(err.message || 'Failed to delete pincode');
    } finally {
      setDeletingPincode(null);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZone.pincode.trim()) return;
    setAddingZone(true);
    setError('');
    try {
      const zone = {
        pincode: newZone.pincode.trim(),
        label: newZone.label.trim(),
        delivery_fee: newZone.delivery_fee,
      };
      await createDeliveryZone(zone);
      setZones((prev) => [...prev, { ...zone, created_at: new Date().toISOString() }]);
      setNewZone(emptyNewZone);
    } catch (err: any) {
      setError(err.message || 'Failed to add pincode');
    } finally {
      setAddingZone(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
        {error || 'Could not load delivery settings'}
      </div>
    );
  }

  // The base pincode's own fee is controlled by the settings card below, not by
  // its row in delivery_zones - hide it here so there's only one place to edit it.
  const overrideZones = zones.filter((z) => z.pincode !== settings.base_pincode);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-5 h-5 text-ink" />
          <h2 className="text-lg font-bold text-gray-900">Delivery Settings</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Your home pincode gets a lower, order-value-based fee. Every other pincode in India pays a flat
          default fee.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Home Pincode</label>
            <input
              type="text"
              value={settings.base_pincode}
              onChange={(e) => setSettings({ ...settings, base_pincode: e.target.value.trim() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Free Delivery Above (₹)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.free_shipping_threshold}
              onChange={(e) =>
                setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Home Pincode Fee Below Threshold (₹)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.base_zone_fee}
              onChange={(e) => setSettings({ ...settings, base_zone_fee: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Fee - All Other Pincodes (₹)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.outside_zone_fee}
              onChange={(e) => setSettings({ ...settings, outside_zone_fee: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Example with the values above: an order to {settings.base_pincode || 'your home pincode'} under ₹
          {settings.free_shipping_threshold} pays ₹{settings.base_zone_fee} delivery; ₹
          {settings.free_shipping_threshold} or more is free. Every other pincode pays a flat ₹
          {settings.outside_zone_fee}, unless it has its own rule below.
        </p>

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink-light transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {savingSettings ? 'Saving...' : settingsSaved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Special Pincode Overrides</h2>
        <p className="text-sm text-gray-500 mb-4">
          Give a specific pincode its own flat delivery fee instead of the default above - for example,
          another free-delivery area, or a surcharge for a hard-to-reach location.
        </p>

        <div className="space-y-2 mb-4">
          {overrideZones.map((zone) => (
            <div
              key={zone.pincode}
              className="flex flex-col sm:flex-row sm:items-center gap-2 border border-gray-200 rounded-lg p-3"
            >
              <span className="font-mono text-sm font-semibold text-gray-900 sm:w-24 flex-shrink-0">
                {zone.pincode}
              </span>
              <input
                type="text"
                value={zone.label || ''}
                placeholder="Label (optional)"
                onChange={(e) =>
                  setZones((prev) =>
                    prev.map((z) => (z.pincode === zone.pincode ? { ...z, label: e.target.value } : z))
                  )
                }
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-transparent"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-sm text-gray-500">₹</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={zone.delivery_fee}
                  onChange={(e) =>
                    setZones((prev) =>
                      prev.map((z) =>
                        z.pincode === zone.pincode ? { ...z, delivery_fee: Number(e.target.value) } : z
                      )
                    )
                  }
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSaveZone(zone)}
                  disabled={savingPincode === zone.pincode}
                  className="px-3 py-1.5 text-sm font-medium text-ink border border-gray-300 rounded-lg hover:bg-cream-soft transition-colors disabled:opacity-50"
                >
                  {savingPincode === zone.pincode ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => handleDeleteZone(zone.pincode)}
                  disabled={deletingPincode === zone.pincode}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {overrideZones.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No special pincode overrides yet.</p>
          )}
        </div>

        <form onSubmit={handleAddZone} className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
          <input
            type="text"
            required
            placeholder="Pincode"
            value={newZone.pincode}
            onChange={(e) => setNewZone({ ...newZone, pincode: e.target.value.replace(/\D/g, '') })}
            maxLength={6}
            className="sm:w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={newZone.label}
            onChange={(e) => setNewZone({ ...newZone, label: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-transparent"
          />
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">₹</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={newZone.delivery_fee}
              onChange={(e) => setNewZone({ ...newZone, delivery_fee: Number(e.target.value) })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={addingZone || newZone.pincode.trim().length !== 6}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-ink text-white rounded-lg font-semibold text-sm hover:bg-ink-light transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Pincode
          </button>
        </form>
      </div>
    </div>
  );
}

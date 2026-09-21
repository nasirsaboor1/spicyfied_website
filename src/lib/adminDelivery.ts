import { supabase } from './supabase';

export interface DeliverySettings {
  base_pincode: string;
  free_shipping_threshold: number;
  base_zone_fee: number;
  outside_zone_fee: number;
}

export interface DeliveryZone {
  pincode: string;
  label: string | null;
  delivery_fee: number;
  created_at: string | null;
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const { data, error } = await supabase
    .from('delivery_settings')
    .select('base_pincode, free_shipping_threshold, base_zone_fee, outside_zone_fee')
    .eq('id', true)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDeliverySettings(values: DeliverySettings): Promise<void> {
  const { error } = await supabase
    .from('delivery_settings')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) throw error;
}

export async function listDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createDeliveryZone(zone: {
  pincode: string;
  label: string;
  delivery_fee: number;
}): Promise<void> {
  const { error } = await supabase.from('delivery_zones').insert(zone);
  if (error) throw error;
}

export async function updateDeliveryZone(
  pincode: string,
  updates: { label: string; delivery_fee: number }
): Promise<void> {
  const { error } = await supabase.from('delivery_zones').update(updates).eq('pincode', pincode);
  if (error) throw error;
}

export async function deleteDeliveryZone(pincode: string): Promise<void> {
  const { error } = await supabase.from('delivery_zones').delete().eq('pincode', pincode);
  if (error) throw error;
}

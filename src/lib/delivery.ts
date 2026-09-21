import { supabase } from './supabase';

const DEFAULT_OUTSIDE_ZONE_FEE = 50;

export async function getDeliveryFee(postalCode: string, subtotal?: number): Promise<number> {
  if (!postalCode || postalCode.trim().length === 0) {
    return DEFAULT_OUTSIDE_ZONE_FEE;
  }

  const { data, error } = await supabase.rpc('get_delivery_fee', {
    p_postal_code: postalCode.trim(),
    p_subtotal: subtotal ?? null,
  });

  if (error) {
    console.error('Error fetching delivery fee:', error);
    return DEFAULT_OUTSIDE_ZONE_FEE;
  }

  const fee = Number(data);
  return Number.isFinite(fee) ? fee : DEFAULT_OUTSIDE_ZONE_FEE;
}

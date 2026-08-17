import { supabase } from './supabase';

export interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

export async function listAdmins(): Promise<AdminAccount[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function addAdminByEmail(email: string): Promise<AdminAccount> {
  const { data, error } = await supabase.rpc('promote_to_admin', { target_email: email });
  if (error) throw error;
  return data as AdminAccount;
}

export async function setAdminActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('admin_users').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

import { supabase } from '@/lib/supabase/client';

export async function accountFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('AUTH_REQUIRED');
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers, Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({})) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) throw new Error(payload.error?.code ?? payload.error?.message ?? 'ACCOUNT_REQUEST_FAILED');
  return payload;
}

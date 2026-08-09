import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export type AuthenticatedAccountRequest = { user: User; supabase: SupabaseClient<Database> };

export async function authenticateAccountRequest(request: Request): Promise<AuthenticatedAccountRequest | NextResponse> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return accountError('ACCOUNT_NOT_CONFIGURED', 'Account services are not configured.', 503);
  if (!token) return accountError('AUTH_REQUIRED', 'Please sign in to continue.', 401);
  const verifier = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) return accountError('INVALID_SESSION', 'Your session has expired. Please sign in again.', 401);
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { user: data.user, supabase };
}

export function accountError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

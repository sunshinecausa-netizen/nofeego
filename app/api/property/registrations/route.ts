import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { data: role } = await auth.supabase.rpc('current_account_role');
  if (role !== 'property') return accountError('PROPERTY_REQUIRED', 'Property access required.', 403);

  const { data, error } = await auth.supabase.from('rental_case_property_registrations').select('*').order('created_at', { ascending: false });
  if (error) return accountError('PROPERTY_REGISTRATIONS_READ_FAILED', 'Unable to load Property registrations.', 500);
  return NextResponse.json({ items: data ?? [] });
}

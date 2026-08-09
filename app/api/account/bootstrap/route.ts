import { NextResponse } from 'next/server';
import { authenticateAccountRequest } from '@/lib/account/server';

export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;
  const metadata = auth.user.user_metadata ?? {};
  const displayName = [metadata.display_name, metadata.full_name, metadata.name].find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? '';
  const { error } = await auth.supabase.from('profiles').upsert({ id: auth.user.id, email: auth.user.email ?? null, display_name: displayName }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: { code: 'PROFILE_BOOTSTRAP_FAILED', message: 'Unable to prepare your account.' } }, { status: 500 });
  return NextResponse.json({ ok: true });
}

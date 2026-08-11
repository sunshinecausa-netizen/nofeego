import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const updateSchema = z.object({ status: z.enum(['active','paused','withdrawn']) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return accountError('INVALID_INTEREST', 'Invalid roommate interest.');
  const parsed = updateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return accountError('INVALID_STATUS', 'Invalid roommate interest status.');
  const { data, error } = await auth.supabase.from('roommate_interests').update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq('id', id).select('id, status').single();
  if (error) return accountError('ROOMMATE_INTEREST_UPDATE_FAILED', 'Unable to update this roommate interest.', 500);
  await auth.supabase.from('roommate_events').insert({ user_id: auth.user.id, interest_id: id, event_type: parsed.data.status === 'active' ? 'resumed' : parsed.data.status, metadata: {} });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return accountError('INVALID_INTEREST', 'Invalid roommate interest.');
  const { data, error } = await auth.supabase.from('roommate_interests').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', id).select('id, status').single();
  if (error) return accountError('ROOMMATE_INTEREST_DELETE_FAILED', 'Unable to remove this roommate interest.', 500);
  await auth.supabase.from('roommate_events').insert({ user_id: auth.user.id, interest_id: id, event_type: 'withdrawn', metadata: {} });
  return NextResponse.json({ item: data });
}


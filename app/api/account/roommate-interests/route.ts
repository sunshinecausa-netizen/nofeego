import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
import { roommateDraftSchema } from '@/lib/roommate/schemas';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { data, error } = await auth.supabase.from('roommate_interests').select('*').order('created_at', { ascending: false });
  if (error) return accountError('ROOMMATE_INTERESTS_READ_FAILED', 'Unable to load roommate interests.', 500);
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = roommateDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return accountError('INVALID_ROOMMATE_INTEREST', parsed.error.issues[0]?.message ?? 'Please review your answers.');
  const { data, error } = await auth.supabase.rpc('submit_roommate_interest_mvp', { payload: parsed.data });
  if (error) {
    const message = error.message;
    if (message.includes('roommate_interest_limit_reached')) return accountError('ROOMMATE_INTEREST_LIMIT', 'You can add up to 5 active homes.', 409);
    if (message.includes('rate_limit_exceeded')) return accountError('RATE_LIMITED', 'Please wait before submitting again.', 429);
    if (message.includes('floor_plan_capacity_exceeded')) return accountError('INVALID_CAPACITY', 'Too many roommates for this floor plan.');
    return accountError('ROOMMATE_INTEREST_SAVE_FAILED', 'Unable to register your interest.', 500);
  }
  return NextResponse.json(data, { status: 201 });
}

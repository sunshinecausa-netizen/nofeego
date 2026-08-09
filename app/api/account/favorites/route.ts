import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
const bodySchema = z.object({ buildingId: z.string().uuid() }).strict();

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { data, error } = await auth.supabase.from('favorites').select('building_id, created_at').not('building_id', 'is', null).order('created_at', { ascending: false });
  if (error) return accountError('FAVORITES_READ_FAILED', 'Unable to load saved buildings.', 500);
  return NextResponse.json({ items: data ?? [] });
}
export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return accountError('INVALID_FAVORITE', 'A valid building is required.');
  const { error } = await auth.supabase.from('favorites').upsert({ user_id: auth.user.id, building_id: parsed.data.buildingId, listing_id: null }, { onConflict: 'user_id,building_id', ignoreDuplicates: true });
  if (error) return accountError('FAVORITE_SAVE_FAILED', 'Unable to save this building.', 500);
  return NextResponse.json({ saved: true });
}
export async function DELETE(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return accountError('INVALID_FAVORITE', 'A valid building is required.');
  const { error } = await auth.supabase.from('favorites').delete().eq('building_id', parsed.data.buildingId);
  if (error) return accountError('FAVORITE_REMOVE_FAILED', 'Unable to remove this building.', 500);
  return NextResponse.json({ saved: false });
}

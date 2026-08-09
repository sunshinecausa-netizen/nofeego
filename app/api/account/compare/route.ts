import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
const bodySchema = z.object({ buildingId: z.string().uuid() }).strict();

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { data, error } = await auth.supabase.from('building_comparisons').select('building_id, created_at').order('created_at');
  if (error) return accountError('COMPARE_READ_FAILED', 'Unable to load your comparison list.', 500);
  return NextResponse.json({ items: data ?? [], limit: 10 });
}
export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return accountError('INVALID_COMPARISON', 'A valid building is required.');
  const { error } = await auth.supabase.from('building_comparisons').upsert({ user_id: auth.user.id, building_id: parsed.data.buildingId }, { onConflict: 'user_id,building_id', ignoreDuplicates: true });
  if (error?.message.includes('comparison_limit_reached')) return accountError('COMPARE_LIMIT', 'You can compare up to 10 buildings.', 409);
  if (error) return accountError('COMPARE_SAVE_FAILED', 'Unable to add this building.', 500);
  return NextResponse.json({ saved: true, limit: 10 });
}
export async function DELETE(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const payload = await request.json().catch(() => null);
  if (payload?.clearAll === true) { const { error } = await auth.supabase.from('building_comparisons').delete().eq('user_id', auth.user.id); if (error) return accountError('COMPARE_CLEAR_FAILED', 'Unable to clear your comparison list.', 500); return NextResponse.json({ saved: false }); }
  const parsed = bodySchema.safeParse(payload); if (!parsed.success) return accountError('INVALID_COMPARISON', 'A valid building is required.');
  const { error } = await auth.supabase.from('building_comparisons').delete().eq('building_id', parsed.data.buildingId);
  if (error) return accountError('COMPARE_REMOVE_FAILED', 'Unable to remove this building.', 500);
  return NextResponse.json({ saved: false });
}

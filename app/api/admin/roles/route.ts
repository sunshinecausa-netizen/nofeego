import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({ profileId: z.string().uuid(), role: z.enum(['tenant','agent','property','admin']), status: z.enum(['active','pending','suspended']).default('active') }).strict();
export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return accountError('INVALID_ROLE_CHANGE', 'Review the role change.');
  const { data, error } = await auth.supabase.rpc('admin_set_profile_authorization', { p_profile_id: parsed.data.profileId, p_role: parsed.data.role, p_status: parsed.data.status });
  if (error) return accountError('ROLE_CHANGE_REJECTED', 'The authorization change was rejected.', 403);
  return NextResponse.json({ item: data });
}

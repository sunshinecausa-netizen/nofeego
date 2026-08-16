import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({
  status: z.enum(['reviewed','interested','property_acknowledged','tour_scheduled','application_started','application_submitted','lease_signed','closed_lost','cancelled']),
  reason: z.string().trim().max(500).nullable().optional(),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return accountError('INVALID_TRANSITION', 'Review the requested transition.');
  const { data, error } = await auth.supabase.rpc('transition_rental_case', { p_case_id: id, p_to_status: parsed.data.status, p_reason: parsed.data.reason ?? null });
  if (error) return accountError('TRANSITION_REJECTED', 'This status change is not allowed.', 403);
  return NextResponse.json({ item: data });
}

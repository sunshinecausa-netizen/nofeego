import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({ agentId: z.string().uuid() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return accountError('INVALID_ASSIGNMENT', 'Review the assignment.');
  const { data, error } = await auth.supabase.rpc('admin_assign_rental_case', { p_case_id: id, p_agent_id: parsed.data.agentId });
  if (error) return accountError('ASSIGNMENT_REJECTED', 'Only an authorized Admin can assign an active Agent.', 403);
  return NextResponse.json({ item: data });
}

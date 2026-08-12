import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { data, error } = await auth.supabase.rpc('create_roommate_rental_lead', { target_interest_id: id });
  if (error) return accountError('ROOMMATE_LEAD_FAILED', 'Unable to create a follow-up request.', 500);
  return NextResponse.json({ inquiryId: data });
}

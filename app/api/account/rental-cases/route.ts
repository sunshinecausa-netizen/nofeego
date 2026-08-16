import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const search = new URL(request.url).searchParams;
  const inquiryId = search.get('inquiryId'); const caseId = search.get('caseId');
  if (!inquiryId && !caseId) return accountError('CASE_REFERENCE_REQUIRED', 'A Rental Case reference is required.');
  let query = auth.supabase.from('rental_cases').select('*');
  query = caseId ? query.eq('id', caseId) : query.eq('inquiry_id', inquiryId!);
  const { data: rentalCase, error } = await query.maybeSingle();
  if (error) return accountError('RENTAL_CASE_READ_FAILED', 'Unable to load this Rental Case.', 500);
  if (!rentalCase) return accountError('RENTAL_CASE_NOT_FOUND', 'Rental Case not found.', 404);
  const [{ data: recommendations, error: recommendationsError }, { data: history, error: historyError }, { data: registrations, error: registrationsError }] = await Promise.all([
    auth.supabase.from('rental_case_recommendation_snapshots').select('*').eq('rental_case_id', rentalCase.id).order('sent_at'),
    auth.supabase.from('rental_case_status_history').select('*').eq('rental_case_id', rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_property_registrations').select('*').eq('rental_case_id', rentalCase.id).order('created_at'),
  ]);
  if (recommendationsError || historyError || registrationsError) return accountError('RENTAL_CASE_DETAIL_FAILED', 'Unable to load the complete Rental Case.', 500);
  return NextResponse.json({ rentalCase, recommendations: recommendations ?? [], history: history ?? [], registrations: registrations ?? [] });
}

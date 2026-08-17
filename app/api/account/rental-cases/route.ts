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
  const buildingPromise = rentalCase.building_id
    ? auth.supabase.from('buildings').select('id,name,address,slug').eq('id', rentalCase.building_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const [{ data: recommendations, error: recommendationsError }, { data: history, error: historyError }, { data: registrations, error: registrationsError }, {data:feedback,error:feedbackError},{data:notifications,error:notificationsError},{data:inquiry,error:inquiryError},{data:building,error:buildingError},{data:outbox,error:outboxError},{data:tours,error:toursError},{data:applications,error:applicationsError}] = await Promise.all([
    auth.supabase.from('rental_case_recommendation_snapshots').select('*').eq('rental_case_id', rentalCase.id).order('sent_at'),
    auth.supabase.from('rental_case_status_history').select('*').eq('rental_case_id', rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_property_registrations').select('*').eq('rental_case_id', rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_recommendation_feedback').select('*').eq('rental_case_id',rentalCase.id),
    auth.supabase.from('rental_case_notifications').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
    auth.supabase.from('inquiries').select('move_in_date,monthly_budget,bedrooms,message').eq('id',rentalCase.inquiry_id).maybeSingle(),
    buildingPromise,
    auth.supabase.from('property_contact_outbox').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_tours').select('*').eq('rental_case_id',rentalCase.id).order('starts_at'),
    auth.supabase.from('applications').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
  ]);
  if (recommendationsError || historyError || registrationsError || feedbackError || notificationsError || inquiryError || buildingError || outboxError || toursError || applicationsError) return accountError('RENTAL_CASE_DETAIL_FAILED', 'Unable to load the complete Rental Case.', 500);
  return NextResponse.json({ rentalCase, inquiry, building, recommendations: recommendations ?? [], history: history ?? [], registrations: registrations ?? [], feedback:feedback??[],notifications:notifications??[],outbox:outbox??[],tours:tours??[],applications:applications??[] });
}

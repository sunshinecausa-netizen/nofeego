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
  const {data:role,error:roleError}=await auth.supabase.rpc('current_account_role');
  if(roleError)return accountError('ROLE_READ_FAILED','Unable to verify Rental Case access.',500);
  const tenantProgressPromise=role==='tenant'?auth.supabase.rpc('get_tenant_case_progress',{p_case_id:rentalCase.id}):Promise.resolve({data:null,error:null});
  const buildingPromise = rentalCase.building_id
    ? auth.supabase.from('buildings').select('id,name,address,slug').eq('id', rentalCase.building_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const [{ data: recommendations, error: recommendationsError }, { data: history, error: historyError }, { data: registrations, error: registrationsError }, {data:feedback,error:feedbackError},{data:notifications,error:notificationsError},{data:inquiry,error:inquiryError},{data:building,error:buildingError},{data:outbox,error:outboxError},{data:tours,error:toursError},{data:applications,error:applicationsError},{data:applicationHistory,error:applicationHistoryError},{data:tenantProgress,error:tenantProgressError}] = await Promise.all([
    auth.supabase.from('rental_case_recommendation_snapshots').select('*').eq('rental_case_id', rentalCase.id).order('sent_at'),
    auth.supabase.from('rental_case_status_history').select('*').eq('rental_case_id', rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_property_registrations').select('*').eq('rental_case_id', rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_recommendation_feedback').select('*').eq('rental_case_id',rentalCase.id),
    auth.supabase.from('rental_case_notifications').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
    auth.supabase.from('inquiries').select('move_in_date,monthly_budget,bedrooms,message,lease_term_months,contact_preference,contact_name').eq('id',rentalCase.inquiry_id).maybeSingle(),
    buildingPromise,
    role==='tenant'?Promise.resolve({data:[],error:null}):auth.supabase.from('property_contact_outbox').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
    auth.supabase.from('rental_case_tours').select('*').eq('rental_case_id',rentalCase.id).order('starts_at'),
    role==='tenant'?Promise.resolve({data:[],error:null}):auth.supabase.from('applications').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
    role==='tenant'?Promise.resolve({data:[],error:null}):auth.supabase.from('application_status_history').select('*').eq('rental_case_id',rentalCase.id).order('created_at'),
    tenantProgressPromise,
  ]);
  if (recommendationsError || historyError || registrationsError || feedbackError || notificationsError || inquiryError || buildingError || outboxError || toursError || applicationsError || applicationHistoryError || tenantProgressError) return accountError('RENTAL_CASE_DETAIL_FAILED', 'Unable to load the complete Rental Case.', 500);
  const safeTenantProgress=(tenantProgress??{}) as {applications?:unknown[];application_history?:unknown[]};
  return NextResponse.json({ rentalCase, inquiry, building, recommendations: recommendations ?? [], history: history ?? [], registrations: registrations ?? [], feedback:feedback??[],notifications:notifications??[],outbox:outbox??[],tours:tours??[],applications:role==='tenant'?(safeTenantProgress.applications??[]):(applications??[]),applicationHistory:role==='tenant'?(safeTenantProgress.application_history??[]):(applicationHistory??[]) });
}

import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { data: role } = await auth.supabase.rpc('current_account_role');
  if (role !== 'agent') return accountError('AGENT_REQUIRED', 'Agent access required.', 403);

  const { data, error } = await auth.supabase.from('rental_cases').select('*').order('created_at', { ascending: false });
  if (error) return accountError('AGENT_CASES_READ_FAILED', 'Unable to load assigned Cases.', 500);
  const cases=data??[],inquiryIds=cases.map(item=>item.inquiry_id),buildingIds=[...new Set(cases.map(item=>item.building_id).filter((value):value is string=>Boolean(value)))];
  if(!cases.length)return NextResponse.json({items:[]});
  const [{data:inquiries},{data:buildings},{data:feedback},{data:history}]=await Promise.all([
    auth.supabase.from('inquiries').select('id,move_in_date,monthly_budget,bedrooms,message,contact_name,lease_term_months,contact_preference').in('id',inquiryIds),
    auth.supabase.from('buildings').select('id,name,address').in('id',buildingIds),
    auth.supabase.from('rental_case_recommendation_feedback').select('*').in('rental_case_id',cases.map(item=>item.id)),
    auth.supabase.from('rental_case_status_history').select('*').in('rental_case_id',cases.map(item=>item.id)).order('created_at',{ascending:false}),
  ]);
  return NextResponse.json({items:cases.map(item=>({rentalCase:item,inquiry:(inquiries??[]).find(value=>value.id===item.inquiry_id)??null,building:(buildings??[]).find(value=>value.id===item.building_id)??null,interestCount:(feedback??[]).filter(value=>value.rental_case_id===item.id&&value.decision==='interested').length,lastActivity:(history??[]).find(value=>value.rental_case_id===item.id)?.created_at??item.updated_at}))});
}

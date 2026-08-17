import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function GET(request:Request){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;
  const {data:role}=await auth.supabase.rpc('current_account_role');if(role!=='admin')return accountError('ADMIN_REQUIRED','Admin access required.',403);
  const [{data:cases,error:caseError},{data:attributions,error:attributionError},{data:outbox,error:outboxError}]=await Promise.all([
    auth.supabase.from('rental_cases').select('status'),
    auth.supabase.from('acquisition_attributions').select('utm_source,utm_campaign'),
    auth.supabase.from('property_contact_outbox').select('status'),
  ]);
  if(caseError||attributionError||outboxError)return accountError('FUNNEL_READ_FAILED','Unable to load funnel metrics.',500);
  const byStatus=Object.fromEntries([...new Set((cases??[]).map(item=>item.status))].map(status=>[status,(cases??[]).filter(item=>item.status===status).length]));
  const bySource=Object.fromEntries([...new Set((attributions??[]).map(item=>item.utm_source??'direct'))].map(source=>[source,(attributions??[]).filter(item=>(item.utm_source??'direct')===source).length]));
  const outboxByStatus=Object.fromEntries([...new Set((outbox??[]).map(item=>item.status))].map(status=>[status,(outbox??[]).filter(item=>item.status===status).length]));
  return NextResponse.json({totalCases:cases?.length??0,attributedCases:attributions?.length??0,byStatus,bySource,outboxByStatus});
}

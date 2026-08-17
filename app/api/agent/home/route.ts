import {NextResponse} from 'next/server';
import {accountError,authenticateAccountRequest} from '@/lib/account/server';

export async function GET(request:Request){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;
  const {data:role}=await auth.supabase.rpc('current_account_role');if(role!=='agent')return accountError('AGENT_REQUIRED','Agent access required.',403);
  const {data:cases,error}=await auth.supabase.from('rental_cases').select('*').order('updated_at',{ascending:false});
  if(error)return accountError('AGENT_HOME_FAILED','Unable to load Agent work.',500);
  const items=cases??[],ids=items.map(item=>item.id),buildingIds=[...new Set(items.map(item=>item.building_id).filter((value):value is string=>Boolean(value)))];
  if(!items.length)return NextResponse.json({needsAttention:[],activeCases:[],recentHistory:[]});
  const [{data:feedback},{data:registrations},{data:outbox},{data:history},{data:buildings},{data:inventory}]=await Promise.all([
    auth.supabase.from('rental_case_recommendation_feedback').select('*').in('rental_case_id',ids),
    auth.supabase.from('rental_case_property_registrations').select('*').in('rental_case_id',ids),
    auth.supabase.from('property_contact_outbox').select('*').in('rental_case_id',ids),
    auth.supabase.from('rental_case_status_history').select('*').in('rental_case_id',ids).order('created_at',{ascending:false}),
    auth.supabase.from('buildings').select('id,name,address').in('id',buildingIds),
    auth.supabase.from('inventory_snapshots').select('building_id,captured_at,valid_until').in('building_id',buildingIds).order('captured_at',{ascending:false}),
  ]);
  const buildingMap=new Map((buildings??[]).map(item=>[item.id,item]));
  const needsAttention=items.filter(item=>!['lease_signed','closed_lost','cancelled'].includes(item.status)).map(item=>{
    const selected=(feedback??[]).some(value=>value.rental_case_id===item.id&&value.decision==='interested');
    const registration=(registrations??[]).find(value=>value.rental_case_id===item.id);
    const contact=(outbox??[]).find(value=>value.rental_case_id===item.id);
    const latest=(inventory??[]).find(value=>value.building_id===item.building_id);
    const stale=!latest||(latest.valid_until?Date.parse(latest.valid_until)<Date.now():Date.now()-Date.parse(latest.captured_at)>86400000);
    const action=selected&&!registration?['Register client',`/agent/cases/${item.id}`]:selected&&!contact?['Contact property',`/agent/property-outreach?case=${item.id}`]:stale?['Confirm inventory',`/agent/inventory?case=${item.id}`]:item.status==='agent_assigned'?['Add recommendation',`/agent/inventory?case=${item.id}`]:['Review case',`/agent/cases/${item.id}`];
    return {caseId:item.id,status:item.status,building:item.building_id?buildingMap.get(item.building_id)??null:null,title:selected?'Tenant selected a recommendation':stale?'Inventory needs confirmation':'Rental Case needs review',action:action[0],href:action[1],updatedAt:item.updated_at};
  });
  return NextResponse.json({needsAttention,activeCases:items.filter(item=>!['lease_signed','closed_lost','cancelled'].includes(item.status)),recentHistory:(history??[]).slice(0,10)});
}

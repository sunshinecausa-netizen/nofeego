import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({ buildingId:z.string().uuid(),unitId:z.string().uuid().nullable().optional(),unitLabel:z.string().trim().max(120).nullable().optional(),grossRent:z.number().positive().nullable().optional(),netEffectiveRent:z.number().positive().nullable().optional(),availableDate:z.string().date().nullable().optional(),leaseTermMonths:z.number().int().min(1).max(36).nullable().optional(),concession:z.string().trim().max(500).nullable().optional(),sourceFreshness:z.string().datetime().nullable().optional() }).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!z.string().uuid().safeParse(id).success)return accountError('INVALID_RECOMMENDATION','Review the recommendation snapshot.');const v=parsed.data;
  const {data,error}=await auth.supabase.rpc('agent_send_recommendation',{p_case_id:id,p_building_id:v.buildingId,p_unit_id:v.unitId??null,p_unit_label:v.unitLabel??null,p_gross_rent:v.grossRent??null,p_net_effective_rent:v.netEffectiveRent??null,p_available_date:v.availableDate??null,p_lease_term_months:v.leaseTermMonths??null,p_concession:v.concession??null,p_source_freshness:v.sourceFreshness??null});
  if(error)return accountError('RECOMMENDATION_REJECTED','Only the assigned Agent can send a snapshot.',403);return NextResponse.json({item:data},{status:201});
}

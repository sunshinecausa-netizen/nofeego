import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema=z.object({recommendationId:z.string().uuid(),decision:z.enum(['interested','not_interested'])}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;
  const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!z.string().uuid().safeParse(id).success)return accountError('INVALID_RECOMMENDATION_FEEDBACK','Choose a valid recommendation.');
  const {data,error}=await auth.supabase.rpc('tenant_record_recommendation_feedback',{p_case_id:id,p_recommendation_id:parsed.data.recommendationId,p_decision:parsed.data.decision});
  if(error)return accountError('RECOMMENDATION_FEEDBACK_REJECTED','This recommendation can no longer be changed.',409);
  return NextResponse.json({item:data});
}

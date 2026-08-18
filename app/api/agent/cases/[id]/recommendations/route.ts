import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({ idempotencyKey:z.string().uuid(),buildingId:z.string().uuid(),inventorySnapshotId:z.string().uuid() }).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!z.string().uuid().safeParse(id).success)return accountError('INVALID_RECOMMENDATION','Review the recommendation snapshot.');const v=parsed.data;
  const {data,error}=await auth.supabase.rpc('agent_send_verified_recommendation',{p_case_id:id,p_building_id:v.buildingId,p_inventory_snapshot_id:v.inventorySnapshotId,p_idempotency_key:v.idempotencyKey});
  if(error)return accountError('RECOMMENDATION_REJECTED','Only the assigned Agent can send a snapshot.',403);return NextResponse.json({item:data},{status:201});
}

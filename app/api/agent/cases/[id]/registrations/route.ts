import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema=z.object({organizationId:z.string().uuid(),buildingId:z.string().uuid(),recommendationId:z.string().uuid().nullable().optional(),propertyEmail:z.string().email()}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const webhook=process.env.PROPERTY_INVITE_DELIVERY_WEBHOOK;if(!webhook)return accountError('INVITATION_DELIVERY_NOT_CONFIGURED','Property invitation delivery is not configured.',503);
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;const {id}=await params;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return accountError('INVALID_REGISTRATION','Review the Property registration.');const v=parsed.data;
  const {data:registration,error}=await auth.supabase.rpc('agent_register_with_property',{p_case_id:id,p_organization_id:v.organizationId,p_building_id:v.buildingId,p_recommendation_id:v.recommendationId??null});if(error||!registration)return accountError('REGISTRATION_REJECTED','The Property registration was rejected.',403);
  const token=randomBytes(32).toString('base64url');const hash=createHash('sha256').update(token).digest('hex');const expiresAt=new Date(Date.now()+48*60*60*1000).toISOString();
  const {error:inviteError}=await auth.supabase.rpc('agent_create_property_invitation',{p_registration_id:registration.id,p_email:v.propertyEmail,p_token_hash:hash,p_expires_at:expiresAt});if(inviteError)return accountError('INVITATION_SAVE_FAILED','The registration was saved, but invitation creation failed.',500);
  const delivery=await fetch(webhook,{method:'POST',headers:{'content-type':'application/json',...(process.env.PROPERTY_INVITE_DELIVERY_TOKEN?{authorization:`Bearer ${process.env.PROPERTY_INVITE_DELIVERY_TOKEN}`}:{})},body:JSON.stringify({email:v.propertyEmail,invitationUrl:`${new URL(request.url).origin}/property/invitations/${token}`,expiresAt})});
  if(!delivery.ok)return accountError('INVITATION_DELIVERY_FAILED','The registration was saved, but delivery failed. Contact an Admin.',502);return NextResponse.json({item:registration},{status:201});
}

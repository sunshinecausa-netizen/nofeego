import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const createSchema=z.object({action:z.literal('create'),registrationId:z.string().uuid(),recipientEmail:z.string().email().max(254),subject:z.string().trim().min(1).max(200),bodyText:z.string().trim().min(1).max(10000),idempotencyKey:z.string().uuid()}).strict();
const outreachSchema=z.object({action:z.literal('create_outreach'),buildingId:z.string().uuid(),organizationId:z.string().uuid(),propertyContactId:z.string().uuid(),unitId:z.string().uuid().nullable().optional(),recommendationId:z.string().uuid().nullable().optional(),subject:z.string().trim().min(1).max(200),bodyText:z.string().trim().min(1).max(10000),idempotencyKey:z.string().uuid()}).strict();
const emailSchema=z.object({action:z.literal('create_email'),purpose:z.enum(['availability','leasing','registration','tour','application','general']),subject:z.string().trim().min(1).max(200),bodyText:z.string().trim().min(1).max(10000),idempotencyKey:z.string().uuid()}).strict();
const actionSchema=z.object({action:z.enum(['approve','mark_sent']),outboxId:z.string().uuid()}).strict();

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return accountError('INVALID_CASE','Review the Case reference.');
  const {data,error}=await auth.supabase.from('property_contact_outbox').select('*').eq('rental_case_id',id).order('created_at',{ascending:false});
  if(error)return accountError('OUTBOX_READ_FAILED','Unable to load Property contact drafts.',500);
  return NextResponse.json({items:data??[]});
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return accountError('INVALID_CASE','Review the Case reference.');
  const body=await request.json().catch(()=>null);const outreach=outreachSchema.safeParse(body);
  const email=emailSchema.safeParse(body);if(email.success){const v=email.data;const {data,error}=await auth.supabase.rpc('create_case_property_email_draft',{p_case_id:id,p_purpose:v.purpose,p_subject:v.subject,p_body_text:v.bodyText,p_idempotency_key:v.idempotencyKey});if(error)return accountError('EMAIL_DRAFT_REJECTED','A current reviewed Leasing Team email is required for this Building.',403);return NextResponse.json({item:data},{status:201})}
  if(outreach.success){const v=outreach.data;const {data,error}=await auth.supabase.rpc('create_property_outreach_draft',{p_case_id:id,p_building_id:v.buildingId,p_organization_id:v.organizationId,p_property_contact_id:v.propertyContactId,p_unit_id:v.unitId??null,p_recommendation_id:v.recommendationId??null,p_subject:v.subject,p_body_text:v.bodyText,p_idempotency_key:v.idempotencyKey});if(error)return accountError('OUTREACH_DRAFT_REJECTED','The assigned Agent must select a reviewed contact authorized for this Building.',403);return NextResponse.json({item:data},{status:201})}
  const create=createSchema.safeParse(body);
  if(create.success){const v=create.data;const {data,error}=await auth.supabase.rpc('create_property_contact_draft',{p_registration_id:v.registrationId,p_recipient_email:v.recipientEmail,p_subject:v.subject,p_body_text:v.bodyText,p_idempotency_key:v.idempotencyKey});if(error)return accountError('OUTBOX_DRAFT_REJECTED','Only the assigned Agent or Admin can create this draft.',403);return NextResponse.json({item:data},{status:201})}
  const parsed=actionSchema.safeParse(body);if(!parsed.success)return accountError('INVALID_OUTBOX_ACTION','Review the Property contact action.');
  const v=parsed.data;
  if(v.action==='approve'){const {data,error}=await auth.supabase.rpc('approve_property_contact',{p_outbox_id:v.outboxId});if(error)return accountError('OUTBOX_APPROVAL_REJECTED','This draft cannot be approved.',403);return NextResponse.json({item:data})}
  const {data,error}=await auth.supabase.rpc('mark_property_contact_sent',{p_outbox_id:v.outboxId});
  if(error)return accountError('OUTBOX_MARK_SENT_REJECTED','Only the assigned Agent or Admin can confirm this manual send.',403);
  return NextResponse.json({item:data,externalDelivery:false,manualConfirmation:true});
}

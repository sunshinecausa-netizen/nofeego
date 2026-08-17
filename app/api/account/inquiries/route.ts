import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
const attributionSchema=z.object({sessionId:z.string().uuid(),landingPath:z.string().max(300),referrerHost:z.string().max(255).nullable(),utmSource:z.string().max(120).nullable(),utmMedium:z.string().max(120).nullable(),utmCampaign:z.string().max(160).nullable(),utmContent:z.string().max(160).nullable(),utmTerm:z.string().max(160).nullable()}).strict();
const inquirySchema = z.object({ idempotencyKey: z.string().uuid(), buildingId: z.union([z.string().uuid(), z.literal('')]).transform((value) => value || null), requestType: z.enum(['entire_place', 'roommate']), message: z.string().trim().max(3000).optional().default(''), moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), monthlyBudget: z.number().positive().max(1_000_000).nullable().optional(), contactName: z.string().trim().max(120).optional().default(''), contactEmail: z.string().email().max(254), contactPhone: z.string().trim().max(40).optional().default(''), bedrooms: z.string().trim().max(30).optional().default(''), roommatePreferences: z.string().trim().max(3000).optional().default(''), selectedFloorPlan: z.string().trim().max(120).optional().default(''), displayedStartingRent: z.number().positive().max(1_000_000).nullable().optional(), preferredUnitType: z.string().trim().max(60).optional().default(''), attribution:attributionSchema.nullable().optional() }).strict();

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const { data, error } = await auth.supabase.from('inquiries').select('id, building_id, request_type, message, move_in_date, monthly_budget, contact_name, contact_email, contact_phone, status, created_at, updated_at').order('created_at', { ascending: false });
  if (error) return accountError('INQUIRIES_READ_FAILED', 'Unable to load your requests.', 500);
  return NextResponse.json({ items: data ?? [] });
}
export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = inquirySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return accountError('INVALID_INQUIRY', 'Please review the request details.');
  const input = parsed.data;
  const saveAttribution=async(caseId:string)=>{if(!input.attribution)return;const a=input.attribution;await auth.supabase.from('acquisition_attributions').upsert({rental_case_id:caseId,tenant_id:auth.user.id,session_id:a.sessionId,landing_path:a.landingPath,referrer_host:a.referrerHost,utm_source:a.utmSource,utm_medium:a.utmMedium,utm_campaign:a.utmCampaign,utm_content:a.utmContent,utm_term:a.utmTerm},{onConflict:'rental_case_id',ignoreDuplicates:true})};
  const { data: existing } = await auth.supabase.from('inquiries').select('id,status,created_at').eq('idempotency_key', input.idempotencyKey).maybeSingle();
  let data = existing;
  if (!data) {
    const saved = await auth.supabase.from('inquiries').insert({ user_id: auth.user.id, idempotency_key: input.idempotencyKey, building_id: input.buildingId, request_type: input.requestType, message: input.message || null, move_in_date: input.moveInDate ?? null, monthly_budget: input.monthlyBudget ?? null, contact_name: input.contactName, contact_email: input.contactEmail, contact_phone: input.contactPhone || null, bedrooms: input.bedrooms || null, roommate_preferences: input.roommatePreferences || null, status: 'Submitted' }).select('id, status, created_at').single();
    if (saved.error) return accountError('INQUIRY_SAVE_FAILED', 'Unable to submit your request.', 500);
    data = saved.data;
  }
  if (input.requestType === 'entire_place') {
    const { data: priorCase } = await auth.supabase.from('rental_cases').select('id,status').eq('inquiry_id',data.id).maybeSingle();
    if (priorCase) { await saveAttribution(priorCase.id); return NextResponse.json({ item: data, rentalCase: priorCase, recovered: Boolean(existing) }, { status: existing ? 200 : 201 }); }
    const { data: rentalCase, error: caseError } = await auth.supabase.rpc('create_rental_case_from_inquiry', { p_inquiry_id: data.id, p_building_id: input.buildingId, p_selected_floor_plan: input.selectedFloorPlan, p_displayed_starting_rent: input.displayedStartingRent ?? null, p_preferred_unit_type: input.preferredUnitType || input.bedrooms });
    if (caseError) return accountError('RENTAL_CASE_SAVE_FAILED', 'Your request was saved, but its Rental Case could not be created.', 500);
    await saveAttribution(rentalCase.id);
    return NextResponse.json({ item: data, rentalCase }, { status: 201 });
  }
  return NextResponse.json({ item: data }, { status: existing ? 200 : 201 });
}

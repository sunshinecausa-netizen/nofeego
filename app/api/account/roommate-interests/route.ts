import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({
  buildingId: z.string().uuid(), unitId: z.string().uuid().nullable().optional(), floorPlan: z.string().trim().min(1).max(120),
  maxMonthlyBudget: z.number().positive().max(100_000), moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moveInFlexibility: z.enum(['exact','plus_minus_1_week','plus_minus_2_weeks','plus_minus_1_month']),
  leaseTerm: z.enum(['12_months','short_term','other']), roommatesWanted: z.number().int().min(1).max(4),
  eligibilityStatus: z.enum(['likely_meets_income','guarantor_available','confirming_eligibility']),
  creditRange: z.enum(['under_600','600_649','650_699','700_749','750_plus','unknown']),
  smoking: z.enum(['no','outside_only','yes']), pets: z.enum(['none','cat','dog','other']),
  schedule: z.enum(['early','standard','late','flexible']), workFromHome: z.enum(['never','sometimes','most_days']),
  cleanliness: z.enum(['relaxed','balanced','very_tidy']), bio: z.string().trim().max(300),
  notificationMethod: z.enum(['email','sms']), contactEmail: z.string().email().max(254), contactPhone: z.string().trim().max(40),
  consent: z.literal(true),
}).strict();

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const [{ data, error }, { data: profile }, { data: preferences }] = await Promise.all([
    auth.supabase.from('roommate_interests').select('id, building_id, unit_id, floor_plan, status, created_at, updated_at').order('created_at', { ascending: false }),
    auth.supabase.from('roommate_profiles').select('bio, notification_method, contact_email, contact_phone').maybeSingle(),
    auth.supabase.from('roommate_preferences').select('max_monthly_budget, move_in_date, move_in_flexibility, lease_term, roommates_wanted, eligibility_status, credit_range, smoking, pets, schedule, work_from_home, cleanliness').maybeSingle(),
  ]);
  if (error) return accountError('ROOMMATE_INTERESTS_READ_FAILED', 'Unable to load roommate interests.', 500);
  return NextResponse.json({ items: data ?? [], profile, preferences });
}

export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return accountError('INVALID_ROOMMATE_INTEREST', 'Please complete all required roommate details.');
  const input = parsed.data; const now = new Date().toISOString();

  const { error: profileError } = await auth.supabase.from('roommate_profiles').upsert({
    user_id: auth.user.id, bio: input.bio || null, notification_method: input.notificationMethod,
    contact_email: input.contactEmail, contact_phone: input.contactPhone || null, contact_sharing_enabled: false,
    is_paused: false, updated_at: now,
  }, { onConflict: 'user_id' });
  if (profileError) return accountError('ROOMMATE_PROFILE_SAVE_FAILED', 'Unable to save your roommate profile.', 500);

  const { error: preferenceError } = await auth.supabase.from('roommate_preferences').upsert({
    user_id: auth.user.id, max_monthly_budget: input.maxMonthlyBudget, move_in_date: input.moveInDate,
    move_in_flexibility: input.moveInFlexibility, lease_term: input.leaseTerm, roommates_wanted: input.roommatesWanted,
    eligibility_status: input.eligibilityStatus, credit_range: input.creditRange, smoking: input.smoking, pets: input.pets,
    schedule: input.schedule, work_from_home: input.workFromHome, cleanliness: input.cleanliness, updated_at: now,
  }, { onConflict: 'user_id' });
  if (preferenceError) return accountError('ROOMMATE_PREFERENCES_SAVE_FAILED', 'Unable to save your roommate preferences.', 500);

  const { data: interest, error: interestError } = await auth.supabase.from('roommate_interests').upsert({
    user_id: auth.user.id, building_id: input.buildingId, unit_id: input.unitId ?? null, floor_plan: input.floorPlan,
    status: 'active', updated_at: now,
  }, { onConflict: 'user_id,building_id,floor_plan' }).select('id, building_id, floor_plan, status, created_at').single();
  if (interestError) {
    if (interestError.message.includes('roommate_interest_limit_reached')) return accountError('ROOMMATE_INTEREST_LIMIT', 'You can add this request to up to 5 active homes.', 409);
    return accountError('ROOMMATE_INTEREST_SAVE_FAILED', 'Unable to register your roommate interest.', 500);
  }

  await auth.supabase.from('roommate_consents').insert({ user_id: auth.user.id, interest_id: interest.id, terms_version: '2026-08-11', privacy_accepted: true, safety_accepted: true, disclaimer_accepted: true });
  await auth.supabase.from('roommate_events').insert({ user_id: auth.user.id, interest_id: interest.id, event_type: 'submitted', metadata: { building_id: input.buildingId, floor_plan: input.floorPlan } });
  const { data: publicCount } = await auth.supabase.from('public_roommate_interest_counts').select('interested_count').eq('building_id', input.buildingId).maybeSingle();
  return NextResponse.json({ item: interest, hasPotentialMatches: Number(publicCount?.interested_count ?? 0) >= 3 }, { status: 201 });
}

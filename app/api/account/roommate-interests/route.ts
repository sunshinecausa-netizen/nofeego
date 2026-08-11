import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const schema = z.object({
  buildingId: z.string().uuid(), unitId: z.string().uuid().nullable().optional(), floorPlan: z.string().trim().min(1).max(120),
  maxMonthlyBudget: z.number().positive().max(100_000), moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moveInFlexibility: z.enum(['exact','plus_minus_1_week','plus_minus_2_weeks','plus_minus_1_month']),
  leaseTerm: z.enum(['12_months','short_term','other']), roommatesWanted: z.number().int().min(1).max(4),
  utilitiesBudget: z.enum(['included','not_included','flexible']), qualificationStatus: z.enum(['self_reported_eligible','still_confirming']),
  guarantorStatus: z.enum(['none','has_guarantor','consider_third_party']), roomArrangement: z.enum(['private_bedroom','primary_bedroom','flex_room']),
  smoking: z.enum(['none','smoking','vaping','both']), pets: z.enum(['none','cat','dog','other']), petAllergies: z.enum(['none','cats','dogs','all_pets']),
  noisePreference: z.enum(['quiet','moderate','social']), guestFrequency: z.enum(['rarely','occasionally','frequently']),
  overnightGuests: z.enum(['not_comfortable','discuss_first','comfortable']), temperaturePreference: z.enum(['cool','moderate','warm']),
  schedule: z.enum(['early_riser','standard_daytime','night_schedule','varies']), workFromHome: z.enum(['never','sometimes','most_days']),
  cleanliness: z.enum(['relaxed','regularly_tidy','very_tidy']), language: z.string().trim().max(80), bio: z.string().trim().max(300),
  notificationMethod: z.enum(['email','sms']), contactEmail: z.string().email().max(254), contactPhone: z.string().trim().max(40),
  ageConfirmed: z.literal(true), requiredAgreement: z.literal(true), communityAgreement: z.literal(true), optionalMatchConsent: z.boolean(),
}).strict();

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const [{ data, error }, { data: profile }, { data: preferences }] = await Promise.all([
    auth.supabase.from('roommate_interests').select('id, building_id, unit_id, floor_plan, status, created_at, updated_at').order('created_at', { ascending: false }),
    auth.supabase.from('roommate_profiles').select('bio, notification_method, contact_email, contact_phone').maybeSingle(),
    auth.supabase.from('roommate_preferences').select('max_monthly_budget, move_in_date, move_in_flexibility, lease_term, roommates_wanted, utilities_budget, qualification_status, guarantor_status, room_arrangement, smoking, pets, pet_allergies, noise_preference, guest_frequency, overnight_guests, temperature_preference, schedule, work_from_home, cleanliness, language').maybeSingle(),
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
    eligibility_status: 'confirming_eligibility', credit_range: 'unknown', utilities_budget: input.utilitiesBudget,
    qualification_status: input.qualificationStatus, guarantor_status: input.guarantorStatus, room_arrangement: input.roomArrangement,
    smoking: input.smoking, pets: input.pets, pet_allergies: input.petAllergies, noise_preference: input.noisePreference,
    guest_frequency: input.guestFrequency, overnight_guests: input.overnightGuests, temperature_preference: input.temperaturePreference,
    schedule: input.schedule, work_from_home: input.workFromHome, cleanliness: input.cleanliness, language: input.language || null, updated_at: now,
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

  await auth.supabase.from('roommate_consents').insert({ user_id: auth.user.id, interest_id: interest.id, terms_version: '2026-08-11-v2', privacy_accepted: true, safety_accepted: true, disclaimer_accepted: true, age_confirmed: true, community_guidelines_accepted: true, optional_matching_consent: input.optionalMatchConsent });
  await auth.supabase.from('roommate_events').insert({ user_id: auth.user.id, interest_id: interest.id, event_type: 'submitted', metadata: { building_id: input.buildingId, floor_plan: input.floorPlan } });
  const { data: publicCount } = await auth.supabase.from('public_roommate_interest_counts').select('interested_count').eq('building_id', input.buildingId).maybeSingle();
  return NextResponse.json({ item: interest, hasPotentialMatches: Number(publicCount?.interested_count ?? 0) >= 3 }, { status: 201 });
}

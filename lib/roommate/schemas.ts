import { z } from 'zod';

export const conversationStageSchema = z.enum(['home', 'lifestyle', 'readiness', 'profile', 'preview']);
export type ConversationStage = z.infer<typeof conversationStageSchema>;

export const roommateDraftSchema = z.object({
  buildingId: z.string().uuid(), buildingName: z.string().trim().min(1).max(200),
  buildingSlug: z.string().trim().min(1).max(200), unitId: z.string().uuid().nullable(),
  floorPlan: z.string().trim().min(1).max(120), bedroomCount: z.number().int().min(1).max(8).nullable(),
  homeConfirmed: z.literal(true), moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flexibilityDaysBefore: z.number().int().min(0).max(90), flexibilityDaysAfter: z.number().int().min(0).max(90),
  leaseTerm: z.enum(['12_months', '18_plus_months', 'short_term', 'not_sure']),
  personalMonthlyBudget: z.number().positive().max(100_000), roommatesNeeded: z.number().int().min(1).max(7),
  smokingStatus: z.enum(['never', 'outside_only', 'occasionally', 'prefer_not_to_say']),
  petStatus: z.enum(['no_pets', 'cat', 'dog', 'open_to_pets', 'allergies']), petAllergies: z.string().trim().max(120),
  workPattern: z.enum(['on_site', 'hybrid', 'work_from_home', 'variable']), sleepSchedule: z.string().trim().min(1).max(120),
  noisePreference: z.enum(['quiet', 'moderate', 'social', 'flexible']),
  cleaningHabits: z.enum(['very_tidy', 'regularly_clean', 'relaxed', 'discuss']),
  guestFrequency: z.enum(['rarely', 'occasionally', 'frequently', 'discuss']),
  temperaturePreference: z.enum(['cooler', 'moderate', 'warmer', 'flexible']),
  qualificationStatus: z.enum(['ready', 'preparing_documents', 'need_guarantor', 'figuring_out']),
  creditCategory: z.enum(['excellent', 'good', 'fair']).nullable(),
  guarantorStatus: z.enum(['independent', 'personal_guarantor', 'guarantor_service', 'not_sure']),
  identityVerificationWillingness: z.enum(['yes', 'maybe_later', 'no']),
  displayName: z.string().trim().min(1).max(80), bio: z.string().trim().min(1).max(300),
  contactEmail: z.string().email().max(254), termsAccepted: z.literal(true),
  matchNotifications: z.boolean(), marketingConsent: z.boolean(),
}).superRefine((draft, ctx) => {
  if (draft.bedroomCount && draft.roommatesNeeded >= draft.bedroomCount) ctx.addIssue({ code: 'custom', path: ['roommatesNeeded'], message: `This floor plan supports at most ${Math.max(1, draft.bedroomCount - 1)} additional roommate(s).` });
});

export type RoommateDraft = z.infer<typeof roommateDraftSchema>;
export type RoommateDraftInput = z.input<typeof roommateDraftSchema>;

export const extractRequestSchema = z.object({
  field: z.enum(['move_in_timing', 'lifestyle', 'bio']), text: z.string().trim().min(1).max(1000),
  current: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();

export const moveInExtractionSchema = z.object({ moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), flexibilityDaysBefore: z.number().int().min(0).max(90), flexibilityDaysAfter: z.number().int().min(0).max(90) });
export const lifestyleExtractionSchema = z.object({ workPattern: z.enum(['on_site', 'hybrid', 'work_from_home', 'variable']).optional(), sleepSchedule: z.string().max(120).optional(), noisePreference: z.enum(['quiet', 'moderate', 'social', 'flexible']).optional() });
export const bioExtractionSchema = z.object({ bio: z.string().trim().min(1).max(300) });


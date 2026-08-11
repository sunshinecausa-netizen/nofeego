-- Expand roommate preferences without collecting or exposing exact credit information.
ALTER TABLE public.roommate_preferences
  ADD COLUMN IF NOT EXISTS utilities_budget text NOT NULL DEFAULT 'not_included',
  ADD COLUMN IF NOT EXISTS qualification_status text NOT NULL DEFAULT 'still_confirming',
  ADD COLUMN IF NOT EXISTS guarantor_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS room_arrangement text NOT NULL DEFAULT 'private_bedroom',
  ADD COLUMN IF NOT EXISTS pet_allergies text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS noise_preference text NOT NULL DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS guest_frequency text NOT NULL DEFAULT 'occasionally',
  ADD COLUMN IF NOT EXISTS overnight_guests text NOT NULL DEFAULT 'discuss_first',
  ADD COLUMN IF NOT EXISTS temperature_preference text NOT NULL DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS language text;

ALTER TABLE public.roommate_consents
  ADD COLUMN IF NOT EXISTS age_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_guidelines_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optional_matching_consent boolean NOT NULL DEFAULT false;

DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_utilities_check CHECK (utilities_budget IN ('included','not_included','flexible')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_qualification_check CHECK (qualification_status IN ('self_reported_eligible','verified_eligibility','still_confirming')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_guarantor_check CHECK (guarantor_status IN ('none','has_guarantor','consider_third_party')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_room_check CHECK (room_arrangement IN ('private_bedroom','primary_bedroom','flex_room')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_allergy_check CHECK (pet_allergies IN ('none','cats','dogs','all_pets')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_noise_check CHECK (noise_preference IN ('quiet','moderate','social')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_guest_frequency_check CHECK (guest_frequency IN ('rarely','occasionally','frequently')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_overnight_check CHECK (overnight_guests IN ('not_comfortable','discuss_first','comfortable')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.roommate_preferences ADD CONSTRAINT roommate_preferences_temperature_check CHECK (temperature_preference IN ('cool','moderate','warm')) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


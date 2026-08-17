-- Reusable roommate interest and matching foundation.
-- Contact details remain owner-only; public counts begin at three active interests.

CREATE TABLE IF NOT EXISTS public.roommate_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio varchar(300), notification_method text NOT NULL DEFAULT 'email' CHECK (notification_method IN ('email','sms')),
  contact_email text, contact_phone text, contact_sharing_enabled boolean NOT NULL DEFAULT false,
  is_paused boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roommate_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  max_monthly_budget numeric(12,2) NOT NULL CHECK (max_monthly_budget > 0), move_in_date date NOT NULL,
  move_in_flexibility text NOT NULL, lease_term text NOT NULL, roommates_wanted integer NOT NULL CHECK (roommates_wanted BETWEEN 1 AND 4),
  eligibility_status text NOT NULL CHECK (eligibility_status IN ('likely_meets_income','guarantor_available','confirming_eligibility')),
  credit_range text NOT NULL CHECK (credit_range IN ('under_600','600_649','650_699','700_749','750_plus','unknown')),
  smoking text NOT NULL, pets text NOT NULL, schedule text NOT NULL, work_from_home text NOT NULL, cleanliness text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roommate_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT, unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  floor_plan text NOT NULL DEFAULT 'Any available floor plan', status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','withdrawn','home_unavailable')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roommate_interests_user_home_key UNIQUE (user_id, building_id, floor_plan)
);

CREATE TABLE IF NOT EXISTS public.roommate_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), first_interest_id uuid NOT NULL REFERENCES public.roommate_interests(id) ON DELETE CASCADE,
  second_interest_id uuid NOT NULL REFERENCES public.roommate_interests(id) ON DELETE CASCADE, score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'potential' CHECK (status IN ('potential','notified','connected','declined','closed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (first_interest_id <> second_interest_id), UNIQUE (first_interest_id, second_interest_id)
);

CREATE TABLE IF NOT EXISTS public.roommate_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES public.roommate_interests(id) ON DELETE SET NULL, terms_version text NOT NULL,
  privacy_accepted boolean NOT NULL, safety_accepted boolean NOT NULL, disclaimer_accepted boolean NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roommate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES public.roommate_interests(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('submitted','matched','connected','paused','resumed','withdrawn','home_unavailable','leased')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roommate_interests_building_status_idx ON public.roommate_interests(building_id, status);
CREATE INDEX IF NOT EXISTS roommate_interests_user_status_idx ON public.roommate_interests(user_id, status);
CREATE INDEX IF NOT EXISTS roommate_events_interest_created_idx ON public.roommate_events(interest_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_roommate_interest_limit() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  IF NEW.status = 'active' AND (SELECT count(*) FROM public.roommate_interests WHERE user_id = NEW.user_id AND status = 'active' AND id IS DISTINCT FROM NEW.id) >= 5 THEN
    RAISE EXCEPTION 'roommate_interest_limit_reached' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_roommate_interest_limit() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS roommate_interest_limit ON public.roommate_interests;
CREATE TRIGGER roommate_interest_limit BEFORE INSERT OR UPDATE OF status ON public.roommate_interests FOR EACH ROW EXECUTE FUNCTION public.enforce_roommate_interest_limit();

ALTER TABLE public.roommate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY roommate_profiles_own ON public.roommate_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY roommate_preferences_own ON public.roommate_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY roommate_interests_own ON public.roommate_interests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY roommate_consents_own ON public.roommate_consents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY roommate_consents_insert_own ON public.roommate_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY roommate_events_own ON public.roommate_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY roommate_events_insert_own ON public.roommate_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY roommate_matches_participant ON public.roommate_matches FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.roommate_interests i WHERE i.user_id = auth.uid() AND i.id IN (first_interest_id, second_interest_id))
);

CREATE OR REPLACE VIEW public.public_roommate_interest_counts AS
SELECT building_id, count(*)::integer AS interested_count FROM public.roommate_interests WHERE status = 'active' GROUP BY building_id HAVING count(*) >= 3;
REVOKE ALL ON public.public_roommate_interest_counts FROM anon, authenticated;
GRANT SELECT ON public.public_roommate_interest_counts TO anon, authenticated;

/*
  Tenant accounts phase 1.

  Additive migration only. It preserves existing profiles, favorites and inquiries,
  adds building-level favorites and comparisons, and gives renters owner-scoped RLS.
  Apply only after reviewing the target Supabase migration history.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_role text NOT NULL DEFAULT 'tenant';

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_role_check
    CHECK (account_role IN ('tenant', 'admin')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, account_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    'tenant'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    display_name = CASE
      WHEN COALESCE(public.profiles.display_name, '') = '' THEN EXCLUDED.display_name
      ELSE public.profiles.display_name
    END,
    updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

ALTER TABLE public.favorites ALTER COLUMN listing_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.favorites
    ADD CONSTRAINT favorites_has_target_check
    CHECK (listing_id IS NOT NULL OR building_id IS NOT NULL OR unit_id IS NOT NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_building_unique
  ON public.favorites(user_id, building_id);

CREATE INDEX IF NOT EXISTS favorites_building_idx
  ON public.favorites(building_id)
  WHERE building_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.building_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT building_comparisons_user_building_key UNIQUE (user_id, building_id)
);

CREATE INDEX IF NOT EXISTS building_comparisons_user_created_idx
  ON public.building_comparisons(user_id, created_at DESC);

ALTER TABLE public.building_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS building_comparisons_select_own ON public.building_comparisons;
CREATE POLICY building_comparisons_select_own
  ON public.building_comparisons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS building_comparisons_insert_own ON public.building_comparisons;
CREATE POLICY building_comparisons_insert_own
  ON public.building_comparisons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS building_comparisons_delete_own ON public.building_comparisons;
CREATE POLICY building_comparisons_delete_own
  ON public.building_comparisons FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_building_comparison_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.building_comparisons
    WHERE user_id = NEW.user_id AND building_id = NEW.building_id
  ) THEN
    RETURN NEW;
  END IF;
  IF (SELECT count(*) FROM public.building_comparisons WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'comparison_limit_reached' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_building_comparison_limit() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS building_comparisons_limit ON public.building_comparisons;
CREATE TRIGGER building_comparisons_limit
  BEFORE INSERT ON public.building_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.enforce_building_comparison_limit();

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS move_in_date date,
  ADD COLUMN IF NOT EXISTS monthly_budget numeric(12,2),
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS bedrooms text,
  ADD COLUMN IF NOT EXISTS roommate_preferences text;

ALTER TABLE public.inquiries ALTER COLUMN status SET DEFAULT 'Submitted';

DO $$ BEGIN
  ALTER TABLE public.inquiries
    ADD CONSTRAINT inquiries_request_type_check
    CHECK (request_type IS NULL OR request_type IN ('entire_place', 'roommate')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inquiries
    ADD CONSTRAINT inquiries_status_check
    CHECK (status IN ('new', 'Submitted', 'In Review', 'Responded', 'Closed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inquiries
    ADD CONSTRAINT inquiries_budget_check
    CHECK (monthly_budget IS NULL OR monthly_budget > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS inquiries_user_created_idx
  ON public.inquiries(user_id, created_at DESC);

DROP POLICY IF EXISTS inquiries_select_own ON public.inquiries;
CREATE POLICY inquiries_select_own
  ON public.inquiries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS inquiries_insert_own ON public.inquiries;
CREATE POLICY inquiries_insert_own
  ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'Submitted');

-- No renter UPDATE or DELETE policy is intentionally created. Status remains
-- controlled by trusted operational/admin paths outside this phase.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.id AND (
    NEW.is_admin IS DISTINCT FROM OLD.is_admin OR
    NEW.account_role IS DISTINCT FROM OLD.account_role
  ) THEN
    RAISE EXCEPTION 'profile_privileged_fields_are_read_only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_protect_privileged_fields ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

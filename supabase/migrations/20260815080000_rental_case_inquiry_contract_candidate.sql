-- DEPLOYMENT PAUSED: Rental Case inquiry contract extracted from the reviewed
-- 20260809000100 tenant-account candidate after the canonical reconciliation.
-- Additive schema only. Do not apply to production without separate approval.

BEGIN;

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
  ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_request_type_check
    CHECK (request_type IS NULL OR request_type IN ('entire_place','roommate')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_status_check
    CHECK (status IN ('new','Submitted','In Review','Responded','Closed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_budget_check
    CHECK (monthly_budget IS NULL OR monthly_budget > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS inquiries_user_created_idx ON public.inquiries(user_id,created_at DESC);

DROP POLICY IF EXISTS inquiries_select_own ON public.inquiries;
CREATE POLICY inquiries_select_own ON public.inquiries FOR SELECT TO authenticated USING(auth.uid()=user_id);
DROP POLICY IF EXISTS inquiries_insert_own ON public.inquiries;
CREATE POLICY inquiries_insert_own ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK(auth.uid()=user_id AND status='Submitted');

COMMIT;

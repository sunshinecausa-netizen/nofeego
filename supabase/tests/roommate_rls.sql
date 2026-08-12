-- Run with: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/roommate_rls.sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.roommate_profiles WHERE user_id='10000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'RLS failure: tenant can read another profile';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
  IF NOT public.is_current_admin() THEN RAISE EXCEPTION 'RLS failure: admin helper denied admin'; END IF;
END $$;
ROLLBACK;

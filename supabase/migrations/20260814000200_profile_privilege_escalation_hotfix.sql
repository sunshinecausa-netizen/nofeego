-- DEPLOYMENT PAUSED: security hotfix candidate; do not push or mark applied without explicit approval.
-- Removes direct profile mutation from browser roles and exposes two narrow, bounded operations:
-- self-service profile display-name maintenance and administrator-only authorization changes.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Profile security hotfix requires public.profiles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.profiles'::regclass
      AND attname = 'is_admin' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Profile security hotfix requires public.profiles.is_admin';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

DROP POLICY IF EXISTS admin_read_profiles ON public.profiles;
CREATE POLICY admin_read_profiles
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS update_own_profile ON public.profiles;
DROP POLICY IF EXISTS insert_own_profile ON public.profiles;

-- Reconciliation granted ALL on every public table. Remove every direct mutation
-- capability from browser roles; RLS is not used as a column-permission system.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_authorization_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() = OLD.id
     AND (
       to_jsonb(NEW) - ARRAY['display_name', 'email', 'updated_at']::text[]
       IS DISTINCT FROM
       to_jsonb(OLD) - ARRAY['display_name', 'email', 'updated_at']::text[]
     ) THEN
    RAISE EXCEPTION 'profile_authorization_fields_are_read_only'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_authorization_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_protect_authorization_fields ON public.profiles;
CREATE TRIGGER profiles_protect_authorization_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_authorization_fields();

CREATE OR REPLACE FUNCTION public.upsert_own_profile(p_display_name text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  normalized_display_name text := NULLIF(btrim(p_display_name), '');
  result public.profiles;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF normalized_display_name IS NOT NULL AND char_length(normalized_display_name) > 120 THEN
    RAISE EXCEPTION 'display_name_too_long' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (id, email, display_name, is_admin)
  SELECT caller_id, users.email, normalized_display_name, false
  FROM auth.users
  WHERE users.id = caller_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'authenticated_user_not_found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_own_profile(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_own_profile(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_profile_authorization(
  p_profile_id uuid,
  p_is_admin boolean
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  result public.profiles;
BEGIN
  IF caller_id IS NULL OR NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_profile_id IS NULL OR p_is_admin IS NULL THEN
    RAISE EXCEPTION 'invalid_authorization_request' USING ERRCODE = 'not_null_violation';
  END IF;
  IF p_profile_id = caller_id THEN
    RAISE EXCEPTION 'admin_cannot_change_own_authorization' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('public.profiles.admin_authorization', 0));
  IF p_is_admin = false
     AND (SELECT count(*) FROM public.profiles WHERE is_admin = true) <= 1 THEN
    RAISE EXCEPTION 'cannot_remove_last_admin' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.profiles
  SET is_admin = p_is_admin
  WHERE id = p_profile_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'no_data_found';
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_authorization(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_authorization(uuid, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.upsert_own_profile(text) IS
  'Authenticated self-service profile allowlist. Updates display_name and auth-derived email only.';
COMMENT ON FUNCTION public.admin_set_profile_authorization(uuid, boolean) IS
  'Admin-only authorization boundary. Ordinary users cannot mutate profile authorization fields.';

COMMIT;

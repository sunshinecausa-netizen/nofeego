/*
# Fix security issues: search_path, RLS policy, and function execution grants

1. Overview
   Fixes four security vulnerabilities flagged by Supabase's security advisor:
   - Function `set_updated_at` has a mutable `search_path` (search path injection risk).
   - RLS policy `auth_insert_listings` on `listings` uses `WITH CHECK (true)`, allowing
     unrestricted inserts by any authenticated user.
   - SECURITY DEFINER function `handle_new_user()` is executable by `anon` and `authenticated`
     via the REST RPC endpoint, which is unnecessary since it is only meant to run as a trigger.

2. Changes
   a. Recreate `set_updated_at()` with an explicit `search_path = public` to prevent
      search path injection.
   b. Replace the `auth_insert_listings` INSERT policy with a restricted version:
      regular authenticated users may only insert listings with `status = 'pending'`
      (the "List Your Property" flow). Admins (profiles.is_admin = true) may insert
      listings with any status. This closes the unrestricted-access hole while
      preserving both user submissions and admin-created listings.
   c. Revoke EXECUTE on `handle_new_user()` from `anon`, `authenticated`, and `public`
      so it cannot be invoked via `/rest/v1/rpc/handle_new_user`. The trigger still
      works because trigger functions run with the privileges of the table owner.
   d. Also recreate `handle_new_user()` with an explicit `search_path = public` for
      defense-in-depth (it already had it, but this ensures idempotency).

3. Security
   - No data is lost; only function definitions and policies are modified.
   - All changes are idempotent (DROP ... IF EXISTS before CREATE).
*/

-- ==========================================
-- Fix 1: set_updated_at() — pin search_path
-- ==========================================
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Re-attach triggers (CASCADE above dropped them)
DROP TRIGGER IF EXISTS neighborhoods_updated_at ON neighborhoods;
CREATE TRIGGER neighborhoods_updated_at
BEFORE UPDATE ON neighborhoods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS buildings_updated_at ON buildings;
CREATE TRIGGER buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS listings_updated_at ON listings;
CREATE TRIGGER listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- Fix 2: handle_new_user() — pin search_path + revoke EXECUTE
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE from all roles — only the trigger (running as table owner) should call this
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;

-- ==========================================
-- Fix 3: Tighten auth_insert_listings INSERT policy
-- ==========================================
-- Old policy allowed WITH CHECK (true) — any authenticated user could insert
-- a listing with any status (including 'active'), bypassing the pending-approval
-- workflow. Replace with: non-admin users may only insert 'pending' listings;
-- admins may insert any status.
DROP POLICY IF EXISTS "auth_insert_listings" ON listings;

CREATE POLICY "auth_insert_listings"
ON listings FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

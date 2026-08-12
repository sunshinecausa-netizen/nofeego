-- Local-only fixture. Run after migrations against an isolated Supabase project.
-- Replace the UUIDs only if they conflict with local auth fixtures.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('10000000-0000-4000-8000-000000000001','roommate-owner@example.test'),
 ('10000000-0000-4000-8000-000000000002','roommate-other@example.test'),
 ('10000000-0000-4000-8000-000000000003','roommate-admin@example.test') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles(id,email,is_admin,account_role) VALUES
 ('10000000-0000-4000-8000-000000000001','roommate-owner@example.test',false,'tenant'),
 ('10000000-0000-4000-8000-000000000002','roommate-other@example.test',false,'tenant'),
 ('10000000-0000-4000-8000-000000000003','roommate-admin@example.test',true,'admin') ON CONFLICT (id) DO UPDATE SET is_admin=excluded.is_admin,account_role=excluded.account_role;
COMMIT;

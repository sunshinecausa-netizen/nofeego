\set ON_ERROR_STOP on
BEGIN;

-- Run only in a disposable, seed-disabled local Supabase database after all candidate migrations.
INSERT INTO auth.users(id,email) VALUES
('30000000-0000-0000-0000-000000000001','tenant@example.invalid'),
('30000000-0000-0000-0000-000000000002','agent@example.invalid'),
('30000000-0000-0000-0000-000000000003','property@example.invalid'),
('30000000-0000-0000-0000-000000000004','admin@example.invalid'),
('30000000-0000-0000-0000-000000000005','outsider@example.invalid');
INSERT INTO public.profiles(id,email,is_admin,account_role,authorization_status) VALUES
('30000000-0000-0000-0000-000000000001','tenant@example.invalid',false,'tenant','active'),
('30000000-0000-0000-0000-000000000002','agent@example.invalid',false,'agent','active'),
('30000000-0000-0000-0000-000000000003','property@example.invalid',false,'property','active'),
('30000000-0000-0000-0000-000000000004','admin@example.invalid',true,'admin','active'),
('30000000-0000-0000-0000-000000000005','outsider@example.invalid',false,'tenant','active');
INSERT INTO public.buildings(id,building_id,slug,name,address,city,state,is_active)
VALUES('31000000-0000-0000-0000-000000000001','candidate-building','candidate-building','Candidate Building','1 Test Street','New York','NY',true);
INSERT INTO public.units(id,building_id,unit_number,is_active)
VALUES('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','1A',true);
INSERT INTO public.inquiries(id,user_id,building_id,request_type,contact_email,status)
VALUES
('33000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','entire_place','tenant@example.invalid','Submitted'),
('33000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','entire_place','tenant@example.invalid','Submitted');
INSERT INTO public.property_organizations(id,name) VALUES('34000000-0000-0000-0000-000000000001','Candidate Property');
INSERT INTO public.property_organization_members(organization_id,profile_id) VALUES('34000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003');
INSERT INTO public.property_building_access(organization_id,building_id,granted_by) VALUES('34000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000004');
INSERT INTO public.rental_cases(id,inquiry_id,user_id,building_id,status,contact_share_consent)
VALUES
('35000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','submitted',true),
('35000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','submitted',false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'outsider_read_case'; END IF; END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','reviewed','complete');
SELECT public.admin_assign_rental_case('35000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002');
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000002','reviewed','complete');
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000002','closed_lost','tenant_withdrew');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT id AS recommendation_id FROM public.agent_send_recommendation('35000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','1A',4000,3800,current_date+10,12,'One month free',now()) \gset
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','interested',NULL);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT id AS registration_id FROM public.agent_register_with_property('35000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',:'recommendation_id') \gset
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
SELECT public.property_acknowledge_registration(:'registration_id',true,4100,3900,current_date+10,'Updated concession','Contact leasing','https://example.invalid/apply');
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','tour_scheduled',NULL);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','application_started',NULL);
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','application_submitted',NULL);
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','lease_signed',NULL);
RESET ROLE;

DO $$ DECLARE expected text[]:=ARRAY['submitted','reviewed','agent_assigned','options_sent','interested','registered_with_property','property_acknowledged','tour_scheduled','application_started','application_submitted','lease_signed']; actual text[]; BEGIN
  SELECT array_agg(to_status ORDER BY created_at,id) INTO actual FROM public.rental_case_status_history WHERE rental_case_id='35000000-0000-0000-0000-000000000001';
  IF actual<>expected THEN RAISE EXCEPTION 'status_history_mismatch expected %, got %',expected,actual; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_recommendation_snapshots WHERE rental_case_id='35000000-0000-0000-0000-000000000001' AND gross_rent=4000 AND net_effective_rent=3800 AND concession='One month free') THEN RAISE EXCEPTION 'immutable_snapshot_missing'; END IF;
  IF (SELECT status FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000001')<>'lease_signed' THEN RAISE EXCEPTION 'case_not_lease_signed'; END IF;
  IF (SELECT status FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000002')<>'closed_lost' THEN RAISE EXCEPTION 'closed_lost_path_failed'; END IF;
END $$;

ROLLBACK;
SELECT 'FOUR_ROLE_RENTAL_CASE_CANDIDATE=PASS';

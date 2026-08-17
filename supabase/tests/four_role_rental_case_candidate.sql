\set ON_ERROR_STOP on
BEGIN;

-- Run only in a disposable, seed-disabled local Supabase database after all candidate migrations.
INSERT INTO auth.users(id,email) VALUES
('30000000-0000-0000-0000-000000000001','tenant@example.invalid'),
('30000000-0000-0000-0000-000000000002','agent@example.invalid'),
('30000000-0000-0000-0000-000000000003','property@example.invalid'),
('30000000-0000-0000-0000-000000000004','admin@example.invalid'),
('30000000-0000-0000-0000-000000000005','property-outsider@example.invalid'),
('30000000-0000-0000-0000-000000000006','tenant-outsider@example.invalid');
INSERT INTO public.profiles(id,email,is_admin,account_role,authorization_status) VALUES
('30000000-0000-0000-0000-000000000001','tenant@example.invalid',false,'tenant','active'),
('30000000-0000-0000-0000-000000000002','agent@example.invalid',false,'agent','active'),
('30000000-0000-0000-0000-000000000003','property@example.invalid',false,'property','active'),
('30000000-0000-0000-0000-000000000004','admin@example.invalid',true,'admin','active'),
('30000000-0000-0000-0000-000000000005','property-outsider@example.invalid',false,'property','active'),
('30000000-0000-0000-0000-000000000006','tenant-outsider@example.invalid',false,'tenant','active');
INSERT INTO public.buildings(id,building_id,slug,name,address,city,state,is_active)
VALUES('31000000-0000-0000-0000-000000000001','candidate-building','candidate-building','Candidate Building','1 Test Street','New York','NY',true);
INSERT INTO public.units(id,building_id,unit_number,is_active)
VALUES('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','1A',true);
INSERT INTO public.inquiries(id,user_id,building_id,request_type,contact_email,status)
VALUES
('33000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','entire_place','tenant@example.invalid','Submitted'),
('33000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','entire_place','tenant@example.invalid','Submitted'),
('33000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001',NULL,'entire_place','tenant@example.invalid','Submitted');
INSERT INTO public.property_organizations(id,name) VALUES('34000000-0000-0000-0000-000000000001','Candidate Property');
INSERT INTO public.property_organization_members(organization_id,profile_id) VALUES('34000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003');
INSERT INTO public.property_building_access(organization_id,building_id,granted_by) VALUES('34000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000004');
INSERT INTO public.rental_cases(id,inquiry_id,user_id,building_id,status,contact_share_consent)
VALUES
('35000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','submitted',true),
('35000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','submitted',false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000006","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'outsider_read_case'; END IF; END $$;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.inquiries WHERE id='33000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'outsider_read_case_inquiry'; END IF; END $$;
DO $$ DECLARE privilege_blocked boolean:=false; BEGIN
  BEGIN PERFORM public.transition_rental_case('35000000-0000-0000-0000-000000000001','reviewed',NULL); RAISE EXCEPTION 'illegal_transition_allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET account_role='admin',is_admin=true WHERE id=auth.uid();
  EXCEPTION WHEN OTHERS THEN privilege_blocked:=true; END;
  IF NOT privilege_blocked THEN RAISE EXCEPTION 'profile_privilege_mutation_allowed'; END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.inquiries WHERE id='33000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'admin_cannot_read_case_inquiry'; END IF; END $$;
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','reviewed','complete');
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000001','reviewed','complete');
SELECT public.admin_assign_rental_case('35000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002');
SELECT public.admin_assign_rental_case('35000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002');
DO $$ BEGIN
  BEGIN PERFORM public.admin_set_profile_authorization(auth.uid(),'tenant','active'); RAISE EXCEPTION 'last_admin_or_self_protection_failed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000002','reviewed','complete');
SELECT public.transition_rental_case('35000000-0000-0000-0000-000000000002','closed_lost','tenant_withdrew');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'assigned_agent_cannot_read_case'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.inquiries WHERE id='33000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'assigned_agent_cannot_read_case_inquiry'; END IF;
  IF EXISTS(SELECT 1 FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'agent_read_unassigned_case'; END IF;
END $$;
SELECT id AS recommendation_id FROM public.agent_send_recommendation('35000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','1A',4000,3800,current_date+10,12,'One month free',now()) \gset
SELECT public.agent_send_recommendation('35000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','1A',4000,3800,current_date+10,12,'One month free',now());
DO $$ BEGIN
  BEGIN UPDATE public.rental_case_recommendation_snapshots SET gross_rent=1 WHERE rental_case_id='35000000-0000-0000-0000-000000000001'; RAISE EXCEPTION 'snapshot_mutation_allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SELECT public.create_rental_case_from_inquiry(
  '33000000-0000-0000-0000-000000000003',NULL,'',NULL,'1 Bed'
) ;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.rental_cases WHERE inquiry_id='33000000-0000-0000-0000-000000000003' AND building_id IS NULL)
  THEN RAISE EXCEPTION 'generic_acquisition_case_not_created'; END IF;
END $$;
SELECT public.tenant_record_recommendation_feedback('35000000-0000-0000-0000-000000000001',:'recommendation_id','interested');
SELECT public.tenant_record_recommendation_feedback('35000000-0000-0000-0000-000000000001',:'recommendation_id','interested');
INSERT INTO public.acquisition_attributions(rental_case_id,tenant_id,session_id,landing_path,utm_source,utm_medium,utm_campaign)
VALUES('35000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','36000000-0000-4000-8000-000000000001','/student-rentals','campus_ambassador','referral','first_rental_case');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT id AS registration_id FROM public.agent_register_with_property('35000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',:'recommendation_id') \gset
SELECT public.agent_register_with_property('35000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',:'recommendation_id');
SELECT id AS outbox_id FROM public.create_property_contact_draft(:'registration_id','leasing@example.invalid','Availability confirmation','Please confirm current terms.','37000000-0000-4000-8000-000000000001') \gset
SELECT public.create_property_contact_draft(:'registration_id','leasing@example.invalid','Availability confirmation','Please confirm current terms.','37000000-0000-4000-8000-000000000001');
SELECT public.approve_property_contact(:'outbox_id');
SELECT public.simulate_property_contact_send(:'outbox_id',true);
SELECT public.simulate_property_contact_send(:'outbox_id',false);
SELECT public.simulate_property_contact_send(:'outbox_id',false);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.rental_case_property_registrations WHERE rental_case_id='35000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'unauthorized_property_read_registration'; END IF; END $$;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.property_contact_outbox WHERE rental_case_id='35000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'unauthorized_property_read_outbox'; END IF; END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_property_registrations WHERE rental_case_id='35000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'authorized_property_cannot_read_registration';
  END IF;
END $$;
SELECT public.property_acknowledge_registration(:'registration_id',true,4100,3900,current_date+10,'Updated concession','Contact leasing','https://example.invalid/apply');
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
  IF (SELECT selected_recommendation_id FROM public.rental_cases WHERE id='35000000-0000-0000-0000-000000000001')<>
     (SELECT id FROM public.rental_case_recommendation_snapshots WHERE rental_case_id='35000000-0000-0000-0000-000000000001' LIMIT 1) THEN
    RAISE EXCEPTION 'selected_recommendation_missing';
  END IF;
  IF (SELECT count(*) FROM public.rental_case_recommendation_feedback WHERE rental_case_id='35000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'feedback_not_idempotent'; END IF;
  IF (SELECT count(*) FROM public.rental_case_recommendation_snapshots WHERE rental_case_id='35000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'recommendation_not_idempotent'; END IF;
  IF (SELECT count(*) FROM public.rental_case_property_registrations WHERE rental_case_id='35000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'registration_not_idempotent'; END IF;
  IF (SELECT count(*) FROM public.property_contact_outbox WHERE rental_case_id='35000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'outbox_not_idempotent'; END IF;
  IF (SELECT status FROM public.property_contact_outbox WHERE rental_case_id='35000000-0000-0000-0000-000000000001')<>'simulated_sent' THEN RAISE EXCEPTION 'outbox_simulation_failed'; END IF;
  IF (SELECT attempt_count FROM public.property_contact_outbox WHERE rental_case_id='35000000-0000-0000-0000-000000000001')<>2 THEN RAISE EXCEPTION 'outbox_repeat_send_not_idempotent'; END IF;
  IF (SELECT count(*) FROM public.acquisition_attributions WHERE rental_case_id='35000000-0000-0000-0000-000000000001' AND utm_source='campus_ambassador')<>1 THEN RAISE EXCEPTION 'acquisition_attribution_missing'; END IF;
  IF (SELECT count(*) FROM pg_constraint c
      CROSS JOIN LATERAL regexp_matches(pg_get_constraintdef(c.oid),'''(submitted|reviewed|agent_assigned|options_sent|interested|registered_with_property|property_acknowledged|tour_scheduled|application_started|application_submitted|lease_signed|closed_lost|cancelled)''','g') m
      WHERE c.conname='rental_cases_status_four_role_check')<>13 THEN RAISE EXCEPTION 'thirteen_status_constraint_missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_notifications WHERE rental_case_id='35000000-0000-0000-0000-000000000001' AND status='manual_required') THEN RAISE EXCEPTION 'handoff_notification_missing'; END IF;
END $$;

ROLLBACK;
SELECT 'FOUR_ROLE_RENTAL_CASE_CANDIDATE=PASS';

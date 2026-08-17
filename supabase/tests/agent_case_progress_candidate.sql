\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
('51000000-0000-0000-0000-000000000001','progress-tenant@example.invalid'),
('51000000-0000-0000-0000-000000000002','progress-agent@example.invalid'),
('51000000-0000-0000-0000-000000000003','progress-outsider@example.invalid'),
('51000000-0000-0000-0000-000000000004','progress-admin@example.invalid');
INSERT INTO public.profiles(id,email,is_admin,account_role,authorization_status) VALUES
('51000000-0000-0000-0000-000000000001','progress-tenant@example.invalid',false,'tenant','active'),
('51000000-0000-0000-0000-000000000002','progress-agent@example.invalid',false,'agent','active'),
('51000000-0000-0000-0000-000000000003','progress-outsider@example.invalid',false,'agent','active'),
('51000000-0000-0000-0000-000000000004','progress-admin@example.invalid',true,'admin','active');
INSERT INTO public.buildings(id,building_id,slug,name,building_name,address,street_address,city,state,is_active)
VALUES('52000000-0000-0000-0000-000000000001','progress-building','progress-building','Progress Building','Progress Building','2 Test Street','2 Test Street','New York','NY',true);
INSERT INTO public.units(id,building_id,unit_number,is_active) VALUES('53000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','12B',true);
INSERT INTO public.inquiries(id,user_id,building_id,status) VALUES('54000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','Submitted');
INSERT INTO public.rental_cases(id,inquiry_id,user_id,building_id,status,assigned_agent_id)
VALUES('55000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','property_acknowledged','51000000-0000-0000-0000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
DO $$ BEGIN
  BEGIN PERFORM public.agent_record_case_tour('55000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001',NULL,now()+interval '1 day','America/New_York',NULL,NULL,NULL,'proposed','proposed','proposed',NULL,NULL,NULL); RAISE EXCEPTION 'outsider_recorded_tour';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT public.agent_record_case_tour('55000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001',now()+interval '1 day','America/New_York','Lobby','Leasing',NULL,'confirmed','confirmed','confirmed','Bring photo ID',NULL,'internal-safe-note');
SELECT public.agent_upsert_case_application('55000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','started','https://example.invalid/application','Started','{}',now()+interval '2 days','internal-safe-note');
SELECT public.agent_upsert_case_application('55000000-0000-0000-0000-000000000001','53000000-0000-0000-0000-000000000001','submitted','https://example.invalid/application','Under review','{}',now()+interval '2 days','internal-safe-note');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rental_case_tours WHERE rental_case_id='55000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'tour_missing_or_duplicate'; END IF;
  IF (SELECT count(*) FROM public.applications WHERE rental_case_id='55000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'application_not_idempotent'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_audit_logs WHERE rental_case_id='55000000-0000-0000-0000-000000000001' AND event_type='rental_case.tour_recorded') THEN RAISE EXCEPTION 'tour_audit_missing'; END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.rental_case_tours) OR EXISTS(SELECT 1 FROM public.applications WHERE rental_case_id IS NOT NULL) THEN RAISE EXCEPTION 'tenant_read_internal_progress'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'AGENT_CASE_PROGRESS_CANDIDATE=PASS';

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users(id,email) VALUES
('41000000-0000-0000-0000-000000000001','outreach-tenant@example.invalid'),
('41000000-0000-0000-0000-000000000002','outreach-agent@example.invalid'),
('41000000-0000-0000-0000-000000000003','outreach-agent-outsider@example.invalid'),
('41000000-0000-0000-0000-000000000004','outreach-property@example.invalid'),
('41000000-0000-0000-0000-000000000005','outreach-admin@example.invalid');
INSERT INTO public.profiles(id,email,is_admin,account_role,authorization_status) VALUES
('41000000-0000-0000-0000-000000000001','outreach-tenant@example.invalid',false,'tenant','active'),
('41000000-0000-0000-0000-000000000002','outreach-agent@example.invalid',false,'agent','active'),
('41000000-0000-0000-0000-000000000003','outreach-agent-outsider@example.invalid',false,'agent','active'),
('41000000-0000-0000-0000-000000000004','outreach-property@example.invalid',false,'property','active'),
('41000000-0000-0000-0000-000000000005','outreach-admin@example.invalid',true,'admin','active');
INSERT INTO public.buildings(id,building_id,slug,name,building_name,address,street_address,city,state,is_active)
VALUES('42000000-0000-0000-0000-000000000001','outreach-building','outreach-building','Outreach Test Building','Outreach Test Building','1 Test Street','1 Test Street','New York','NY',true);
INSERT INTO public.units(id,building_id,unit_number,is_active)
VALUES('43000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','10A',true);
INSERT INTO public.inquiries(id,user_id,building_id,request_type,contact_email,contact_phone,contact_name,move_in_date,monthly_budget,status)
VALUES('44000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','entire_place','private-tenant@example.invalid','2125550000','Private Tenant',current_date+30,4500,'Submitted');
INSERT INTO public.rental_cases(id,inquiry_id,user_id,building_id,status,assigned_agent_id)
VALUES('45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','interested','41000000-0000-0000-0000-000000000002');
INSERT INTO public.rental_case_recommendation_snapshots(id,rental_case_id,agent_id,building_id,unit_id,unit_label,gross_rent,sent_at)
VALUES('46000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000002','42000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','10A',4500,now());
UPDATE public.rental_cases SET selected_recommendation_id='46000000-0000-0000-0000-000000000001' WHERE id='45000000-0000-0000-0000-000000000001';
INSERT INTO public.rental_case_recommendation_feedback(rental_case_id,recommendation_id,tenant_id,decision)
VALUES('45000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','interested');
INSERT INTO public.property_organizations(id,name) VALUES
('47000000-0000-0000-0000-000000000001','Outreach Leasing Team'),
('47000000-0000-0000-0000-000000000002','Unrelated Leasing Team');
INSERT INTO public.property_building_access(organization_id,building_id,granted_by)
VALUES('47000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000005');
INSERT INTO public.property_organization_members(organization_id,profile_id)
VALUES('47000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000004');
INSERT INTO public.property_contacts(id,building_id,organization_id,name,purpose,email,phone,visibility,last_verified_at,is_active,needs_review)
VALUES
('48000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','Verified Availability','availability','leasing@example.invalid','2125550100','agent_only',now(),true,false),
('48000000-0000-0000-0000-000000000002','42000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','Unreviewed Contact','availability','leasing-review@example.invalid',NULL,'agent_only',now(),true,true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.property_contacts WHERE id='48000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'property_read_agent_only_contact'; END IF;
  IF EXISTS(SELECT 1 FROM public.property_contact_outbox) THEN RAISE EXCEPTION 'property_read_unrelated_outbox'; END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.property_contacts WHERE id='48000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'admin_cannot_read_contact'; END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.property_contacts) THEN RAISE EXCEPTION 'tenant_read_property_contacts'; END IF;
  IF EXISTS(SELECT 1 FROM public.property_contact_outbox) THEN RAISE EXCEPTION 'tenant_read_outbox'; END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.property_contacts) THEN RAISE EXCEPTION 'unassigned_agent_read_contacts'; END IF;
  BEGIN
    PERFORM public.create_property_outreach_draft('45000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0000-000000000001',NULL,NULL,'No','No','49000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'unassigned_agent_created_outreach';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.property_contacts WHERE id='48000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'assigned_agent_cannot_read_contact'; END IF; END $$;
DO $$ BEGIN
  BEGIN
    PERFORM public.create_property_outreach_draft('45000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0000-000000000002',NULL,NULL,'Review','Review','49000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'unreviewed_contact_accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='unreviewed_contact_accepted' THEN RAISE; END IF; END;
END $$;
SELECT id AS outreach_id FROM public.create_property_outreach_draft(
  '45000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001',
  'Availability update request — Outreach Test Building',
  'Please confirm floor plan, rent, concessions, move-in date, lease terms, application requirements, registration policy, and commission policy.',
  '49000000-0000-4000-8000-000000000003') \gset
SELECT public.create_property_outreach_draft(
  '45000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0000-000000000001',NULL,NULL,
  'Duplicate','Duplicate','49000000-0000-4000-8000-000000000004');
SELECT public.approve_property_contact(:'outreach_id');
SELECT public.simulate_property_contact_send(:'outreach_id',true);
SELECT public.simulate_property_contact_send(:'outreach_id',false);
SELECT public.simulate_property_contact_send(:'outreach_id',false);
RESET ROLE;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.property_contact_outbox WHERE rental_case_id='45000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'outreach_not_idempotent'; END IF;
  IF EXISTS(SELECT 1 FROM public.property_contact_outbox WHERE body_text ILIKE '%private-tenant%' OR body_text LIKE '%2125550000%' OR body_text ILIKE '%Private Tenant%') THEN RAISE EXCEPTION 'tenant_pii_leaked'; END IF;
  IF (SELECT status FROM public.property_contact_outbox WHERE rental_case_id='45000000-0000-0000-0000-000000000001')<>'simulated_sent' THEN RAISE EXCEPTION 'outreach_simulation_failed'; END IF;
  IF (SELECT attempt_count FROM public.property_contact_outbox WHERE rental_case_id='45000000-0000-0000-0000-000000000001')<>2 THEN RAISE EXCEPTION 'outreach_retry_not_idempotent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_audit_logs WHERE rental_case_id='45000000-0000-0000-0000-000000000001' AND event_type='property_outreach.draft_created') THEN RAISE EXCEPTION 'outreach_audit_missing'; END IF;
END $$;

ROLLBACK;
SELECT 'PROPERTY_OUTREACH_CANDIDATE=PASS';

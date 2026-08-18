\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users(id,email) VALUES
('61000000-0000-0000-0000-000000000001','p0-tenant@example.invalid'),
('61000000-0000-0000-0000-000000000002','p0-agent@example.invalid'),
('61000000-0000-0000-0000-000000000003','p0-property@example.invalid'),
('61000000-0000-0000-0000-000000000004','p0-admin@example.invalid'),
('61000000-0000-0000-0000-000000000005','p0-outsider@example.invalid');
INSERT INTO public.profiles(id,email,is_admin,account_role,authorization_status,business_email,business_email_verified_at) VALUES
('61000000-0000-0000-0000-000000000001','p0-tenant@example.invalid',false,'tenant','active',NULL,NULL),
('61000000-0000-0000-0000-000000000002','p0-agent@example.invalid',false,'agent','active','p0-agent@example.invalid',now()),
('61000000-0000-0000-0000-000000000003','p0-property@example.invalid',false,'property','active',NULL,NULL),
('61000000-0000-0000-0000-000000000004','p0-admin@example.invalid',true,'admin','active',NULL,NULL),
('61000000-0000-0000-0000-000000000005','p0-outsider@example.invalid',false,'tenant','active',NULL,NULL);

INSERT INTO public.buildings(id,building_id,slug,name,address,city,state,is_active)
VALUES('62000000-0000-0000-0000-000000000001','p0-building','p0-building','P0 Building','100 Test Avenue','New York','NY',true);
INSERT INTO public.units(id,building_id,unit_number,floorplan_name,bedrooms,bathrooms,lease_term,status,is_active)
VALUES('63000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','12A','1 Bedroom',1,1,12,'active',true);
INSERT INTO public.inventory_snapshots(id,building_id,unit_id,source_record_id,rent,net_effective_rent,concession_text,available_date,inventory_status,captured_at,valid_until)
VALUES('64000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000001','p0-snapshot',4500,4200,'One month free',current_date+14,'available',now(),now()+interval '7 days');
INSERT INTO public.inquiries(id,user_id,building_id,request_type,contact_name,contact_email,status,move_in_date,monthly_budget,bedrooms,lease_term_months,contact_preference)
VALUES('65000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','entire_place','P0 Tenant','p0-tenant@example.invalid','Submitted',current_date+30,5000,'1','12','email');
INSERT INTO public.rental_cases(id,inquiry_id,user_id,building_id,status,assigned_agent_id,contact_share_consent,selected_floor_plan,preferred_unit_type)
VALUES('66000000-0000-0000-0000-000000000001','65000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','agent_assigned','61000000-0000-0000-0000-000000000002',false,'1 Bedroom','1');
INSERT INTO public.agent_building_inventory_access(agent_id,building_id,granted_by,status)
VALUES('61000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000004','active');
INSERT INTO public.property_organizations(id,name) VALUES('67000000-0000-0000-0000-000000000001','P0 Property');
INSERT INTO public.property_organization_members(organization_id,profile_id) VALUES('67000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000003');
INSERT INTO public.property_building_access(organization_id,building_id,granted_by)
VALUES('67000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000004');
INSERT INTO public.property_contacts(id,building_id,organization_id,name,email,purpose,visibility,last_verified_at,verification_expires_at,is_active,needs_review)
VALUES('68000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000001','P0 Leasing','p0-leasing@example.invalid','application','agent_only',now(),now()+interval '30 days',true,false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT id AS recommendation_id FROM public.agent_send_verified_recommendation(
  '66000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001',
  '64000000-0000-0000-0000-000000000001','69000000-0000-4000-8000-000000000001') \gset
SELECT public.agent_send_verified_recommendation(
  '66000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001',
  '64000000-0000-0000-0000-000000000001','69000000-0000-4000-8000-000000000001');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SELECT public.tenant_record_recommendation_feedback('66000000-0000-0000-0000-000000000001',:'recommendation_id','interested');
SELECT public.tenant_record_recommendation_feedback('66000000-0000-0000-0000-000000000001',:'recommendation_id','interested');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT id AS registration_id FROM public.agent_register_with_property(
  '66000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001',:'recommendation_id') \gset
SELECT id AS outbox_id FROM public.create_case_property_email_draft(
  '66000000-0000-0000-0000-000000000001','application','P0 application follow-up',
  'Please confirm the next application step.','69000000-0000-4000-8000-000000000002') \gset
SELECT public.create_case_property_email_draft(
  '66000000-0000-0000-0000-000000000001','application','P0 application follow-up',
  'Please confirm the next application step.','69000000-0000-4000-8000-000000000002');
SELECT public.mark_property_contact_sent(:'outbox_id');
SELECT public.mark_property_contact_sent(:'outbox_id');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
SELECT public.property_acknowledge_registration(:'registration_id',true,4500,4200,current_date+14,'One month free','Lobby','https://example.invalid/apply');
SELECT public.transition_rental_case('66000000-0000-0000-0000-000000000001','tour_scheduled',NULL);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT public.transition_case_application('66000000-0000-0000-0000-000000000001','started','Application opened',NULL);
SELECT public.transition_case_application('66000000-0000-0000-0000-000000000001','submitted','Submitted to Property',NULL);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
SELECT public.transition_case_application('66000000-0000-0000-0000-000000000001','under_review','Property review',NULL);
SELECT public.transition_case_application('66000000-0000-0000-0000-000000000001','approved','Approved',NULL);
SELECT public.transition_case_application('66000000-0000-0000-0000-000000000001','lease_sent','Lease issued',NULL);
SELECT public.transition_case_application('66000000-0000-0000-0000-000000000001','lease_signed','Signed','LEASE-P0-REFERENCE');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
DO $$ DECLARE progress jsonb:=public.get_tenant_case_progress('66000000-0000-0000-0000-000000000001'); BEGIN
  IF progress::text LIKE '%internal_note%' OR progress::text LIKE '%recipient_email%' OR progress::text LIKE '%property_contact%' THEN
    RAISE EXCEPTION 'tenant_progress_leaks_internal_fields';
  END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.rental_cases WHERE id='66000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'outsider_case_read_allowed'; END IF;
  BEGIN PERFORM public.get_tenant_case_progress('66000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'outsider_progress_read_allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.rental_case_recommendation_snapshots WHERE rental_case_id='66000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'recommendation_not_idempotent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_recommendation_snapshots WHERE rental_case_id='66000000-0000-0000-0000-000000000001' AND gross_rent=4500 AND net_effective_rent=4200 AND concession='One month free') THEN RAISE EXCEPTION 'verified_inventory_snapshot_not_preserved'; END IF;
  IF (SELECT count(*) FROM public.property_contact_outbox WHERE rental_case_id='66000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'outbox_not_idempotent'; END IF;
  IF (SELECT attempt_count FROM public.property_contact_outbox WHERE rental_case_id='66000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'mark_sent_not_idempotent'; END IF;
  IF (SELECT status FROM public.rental_cases WHERE id='66000000-0000-0000-0000-000000000001')<>'lease_signed' THEN RAISE EXCEPTION 'case_not_lease_signed'; END IF;
  IF (SELECT status FROM public.applications WHERE rental_case_id='66000000-0000-0000-0000-000000000001')<>'lease_signed' THEN RAISE EXCEPTION 'application_not_lease_signed'; END IF;
  IF (SELECT count(*) FROM public.application_status_history WHERE rental_case_id='66000000-0000-0000-0000-000000000001')<>6 THEN RAISE EXCEPTION 'application_history_not_immutable'; END IF;
END $$;

ROLLBACK;

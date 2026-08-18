-- DEPLOYMENT PAUSED: Agent P0 close-loop reconciliation candidate.
-- Additive/rollback-aware. Validate only in the approved isolated database.
-- Never apply to Production or repair the Production migration ledger without approval.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS business_email_verified_at timestamptz;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_business_email_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_business_email_check
  CHECK (business_email IS NULL OR business_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') NOT VALID;

CREATE OR REPLACE FUNCTION public.admin_set_agent_business_email(p_agent_id uuid,p_email text,p_verified boolean DEFAULT false)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.profiles; normalized text:=lower(NULLIF(btrim(p_email),''));
BEGIN
  IF public.current_account_role()<>'admin' THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF normalized IS NULL OR normalized !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'invalid_business_email'; END IF;
  UPDATE public.profiles SET business_email=normalized,business_email_verified_at=CASE WHEN p_verified THEN now() ELSE NULL END,updated_at=now()
    WHERE id=p_agent_id AND account_role='agent' RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'active_agent_not_found'; END IF;
  INSERT INTO public.rental_case_audit_logs(actor_id,actor_role,event_type,metadata)
  VALUES(auth.uid(),'admin','agent.business_email_changed',jsonb_build_object('agent_id',p_agent_id,'verified',p_verified));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_agent_business_email(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_agent_business_email(uuid,text,boolean) TO authenticated;

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS lease_term_months integer,
  ADD COLUMN IF NOT EXISTS contact_preference text;
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_lease_term_months_check;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_lease_term_months_check
  CHECK (lease_term_months IS NULL OR lease_term_months BETWEEN 1 AND 36) NOT VALID;
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_contact_preference_check;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_contact_preference_check
  CHECK (contact_preference IS NULL OR contact_preference IN ('email','phone','text')) NOT VALID;

ALTER TABLE public.rental_case_recommendation_snapshots
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS rental_case_recommendation_idempotency_idx
  ON public.rental_case_recommendation_snapshots(rental_case_id,agent_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS property_organization_id uuid REFERENCES public.property_organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_contact_id uuid REFERENCES public.property_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_recommendation_id uuid REFERENCES public.rental_case_recommendation_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lease_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_reference text,
  ADD COLUMN IF NOT EXISTS last_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_p0_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_p0_check CHECK(status IN (
  'draft','started','submitted','additional_information_requested','under_review','approved',
  'lease_sent','lease_signed','declined','withdrawn')) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS applications_one_active_per_case_idx
  ON public.applications(rental_case_id)
  WHERE rental_case_id IS NOT NULL AND status NOT IN ('declined','withdrawn','lease_signed');

CREATE TABLE IF NOT EXISTS public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS application_status_history_case_idx
  ON public.application_status_history(rental_case_id,created_at,id);
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.application_status_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.application_status_history TO authenticated;

DROP POLICY IF EXISTS application_history_participant_select ON public.application_status_history;
CREATE POLICY application_history_participant_select ON public.application_status_history
FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND (
    c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin'
    OR (public.current_account_role()='property' AND EXISTS(
      SELECT 1 FROM public.rental_case_property_registrations r
      JOIN public.property_organization_members m ON m.organization_id=r.organization_id
      JOIN public.property_building_access a ON a.organization_id=r.organization_id AND a.building_id=r.building_id
      WHERE r.rental_case_id=c.id AND m.profile_id=auth.uid()
    ))
  )
));

ALTER TABLE public.property_contact_outbox
  ADD COLUMN IF NOT EXISTS manual_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.rental_cases DROP CONSTRAINT IF EXISTS rental_cases_status_four_role_check;
ALTER TABLE public.rental_cases DROP CONSTRAINT IF EXISTS rental_cases_status_p0_check;
ALTER TABLE public.rental_cases ADD CONSTRAINT rental_cases_status_p0_check CHECK(status IN (
  'submitted','reviewed','agent_assigned','options_sent','interested','registered_with_property',
  'property_acknowledged','tour_scheduled','application_started','application_submitted',
  'additional_documents_requested','approved','lease_sent','lease_signed','closed_lost','cancelled')) NOT VALID;

CREATE OR REPLACE FUNCTION public.agent_send_verified_recommendation(
  p_case_id uuid,p_building_id uuid,p_inventory_snapshot_id uuid,p_idempotency_key uuid
) RETURNS public.rental_case_recommendation_snapshots
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; inv public.inventory_snapshots; u public.units; existing public.rental_case_recommendation_snapshots; result public.rental_case_recommendation_snapshots;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF c.id IS NULL OR public.current_account_role()<>'agent' OR c.assigned_agent_id<>auth.uid() THEN
    RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF c.status NOT IN ('agent_assigned','options_sent') THEN RAISE EXCEPTION 'recommendation_not_allowed_for_case_status'; END IF;
  IF c.building_id IS DISTINCT FROM p_building_id THEN RAISE EXCEPTION 'building_not_in_case'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.agent_building_inventory_access a WHERE a.agent_id=auth.uid() AND a.building_id=p_building_id AND a.status='active' AND (a.expires_at IS NULL OR a.expires_at>now())) THEN
    RAISE EXCEPTION 'agent_inventory_access_required' USING ERRCODE='insufficient_privilege'; END IF;
  SELECT * INTO inv FROM public.inventory_snapshots
    WHERE id=p_inventory_snapshot_id AND building_id=p_building_id AND inventory_status='available'
      AND (valid_until IS NULL OR valid_until>now());
  IF inv.id IS NULL THEN RAISE EXCEPTION 'current_inventory_snapshot_required'; END IF;
  SELECT * INTO u FROM public.units WHERE id=inv.unit_id AND building_id=p_building_id;
  IF u.id IS NULL THEN RAISE EXCEPTION 'unit_not_in_building'; END IF;
  SELECT * INTO existing FROM public.rental_case_recommendation_snapshots
    WHERE rental_case_id=p_case_id AND agent_id=auth.uid() AND idempotency_key=p_idempotency_key;
  IF existing.id IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.rental_case_recommendation_snapshots(
    rental_case_id,agent_id,building_id,unit_id,unit_label,gross_rent,net_effective_rent,
    available_date,lease_term_months,concession,source_freshness,idempotency_key)
  VALUES(p_case_id,auth.uid(),p_building_id,u.id,COALESCE(NULLIF(btrim(u.unit_number),''),NULLIF(btrim(u.floorplan_name),'')),inv.rent,inv.net_effective_rent,
    inv.available_date,u.lease_term,NULLIF(btrim(inv.concession_text),''),inv.captured_at,p_idempotency_key)
  RETURNING * INTO result;
  IF c.status='agent_assigned' THEN
    UPDATE public.rental_cases SET status='options_sent',updated_at=now() WHERE id=c.id;
    PERFORM public.record_rental_case_transition(c.id,'agent_assigned','options_sent','recommendation_sent');
  END IF;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(c.id,auth.uid(),'agent','recommendation.sent',jsonb_build_object('recommendation_id',result.id,'building_id',p_building_id,'unit_id',u.id,'inventory_snapshot_id',inv.id));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.agent_send_verified_recommendation(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_send_verified_recommendation(uuid,uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_property_contact_sent(p_outbox_id uuid)
RETURNS public.property_contact_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE item public.property_contact_outbox; c public.rental_cases; role_name text:=public.current_account_role();
BEGIN
  SELECT * INTO item FROM public.property_contact_outbox WHERE id=p_outbox_id FOR UPDATE;
  IF item.id IS NULL THEN RAISE EXCEPTION 'outbox_not_found'; END IF;
  SELECT * INTO c FROM public.rental_cases WHERE id=item.rental_case_id;
  IF NOT (role_name='admin' OR (role_name='agent' AND c.assigned_agent_id=auth.uid())) THEN
    RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF item.manual_sent_at IS NOT NULL AND item.status='sent' THEN RETURN item; END IF;
  IF item.status NOT IN ('draft','approved','manual_required') THEN RAISE EXCEPTION 'outbox_not_ready_for_manual_send'; END IF;
  UPDATE public.property_contact_outbox SET status='sent',manual_sent_at=clock_timestamp(),manual_sent_by=auth.uid(),
    attempt_count=attempt_count+1,last_error=NULL,updated_at=now() WHERE id=item.id RETURNING * INTO item;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(item.rental_case_id,auth.uid(),role_name,'property_outreach.marked_sent',jsonb_build_object('outbox_id',item.id,'purpose',item.purpose));
  RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.mark_property_contact_sent(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_property_contact_sent(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_case_property_email_draft(
  p_case_id uuid,p_purpose text,p_subject text,p_body_text text,p_idempotency_key uuid
) RETURNS public.property_contact_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; contact public.property_contacts; item public.property_contact_outbox; role_name text:=public.current_account_role();
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id;
  IF c.id IS NULL OR c.building_id IS NULL THEN RAISE EXCEPTION 'case_building_required'; END IF;
  IF NOT (role_name='admin' OR (role_name='agent' AND c.assigned_agent_id=auth.uid())) THEN
    RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF p_purpose NOT IN ('availability','leasing','registration','tour','application','general') THEN RAISE EXCEPTION 'invalid_email_purpose'; END IF;
  SELECT pc.* INTO contact FROM public.property_contacts pc
  JOIN public.property_building_access a ON a.building_id=pc.building_id AND (pc.organization_id IS NULL OR pc.organization_id=a.organization_id)
  WHERE pc.building_id=c.building_id AND pc.email IS NOT NULL AND pc.is_active AND NOT pc.needs_review
    AND pc.last_verified_at IS NOT NULL AND (pc.verification_expires_at IS NULL OR pc.verification_expires_at>now())
  ORDER BY (pc.purpose=p_purpose) DESC,pc.last_verified_at DESC,pc.id LIMIT 1;
  IF contact.id IS NULL THEN RAISE EXCEPTION 'verified_property_email_required'; END IF;
  SELECT * INTO item FROM public.property_contact_outbox WHERE idempotency_key=p_idempotency_key;
  IF item.id IS NOT NULL THEN RETURN item; END IF;
  SELECT * INTO item FROM public.property_contact_outbox WHERE rental_case_id=c.id AND building_id=c.building_id AND purpose=p_purpose
    AND status IN ('draft','approved','sent','manual_required') ORDER BY created_at DESC LIMIT 1;
  IF item.id IS NOT NULL THEN RETURN item; END IF;
  INSERT INTO public.property_contact_outbox(rental_case_id,building_id,organization_id,property_contact_id,created_by,
    recipient_email,subject,body_text,purpose,idempotency_key,status)
  VALUES(c.id,c.building_id,contact.organization_id,contact.id,auth.uid(),lower(contact.email),btrim(p_subject),btrim(p_body_text),p_purpose,p_idempotency_key,'draft')
  RETURNING * INTO item;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(c.id,auth.uid(),role_name,'property_email.draft_created',jsonb_build_object('outbox_id',item.id,'purpose',p_purpose,'contact_id',contact.id));
  RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.create_case_property_email_draft(uuid,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_case_property_email_draft(uuid,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_case_application(
  p_case_id uuid,p_to_status text,p_note text DEFAULT NULL,p_lease_reference text DEFAULT NULL
) RETURNS public.applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; app public.applications; old_status text; role_name text:=public.current_account_role(); allowed boolean:=false; case_target text;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF NOT (role_name='admin' OR (role_name='agent' AND c.assigned_agent_id=auth.uid()) OR (role_name='property' AND EXISTS(
    SELECT 1 FROM public.rental_case_property_registrations r
    JOIN public.property_organization_members m ON m.organization_id=r.organization_id
    JOIN public.property_building_access a ON a.organization_id=r.organization_id AND a.building_id=r.building_id
    WHERE r.rental_case_id=c.id AND m.profile_id=auth.uid()))) THEN
    RAISE EXCEPTION 'application_actor_not_authorized' USING ERRCODE='insufficient_privilege'; END IF;
  SELECT * INTO app FROM public.applications WHERE rental_case_id=c.id AND status NOT IN ('declined','withdrawn','lease_signed') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF app.id IS NULL THEN
    IF p_to_status<>'started' OR c.selected_recommendation_id IS NULL THEN RAISE EXCEPTION 'application_must_start_from_selected_recommendation'; END IF;
    INSERT INTO public.applications(user_id,status,rental_case_id,building_id,selected_recommendation_id,started_at,created_by,updated_by)
    VALUES(c.user_id,'started',c.id,c.building_id,c.selected_recommendation_id,now(),auth.uid(),auth.uid()) RETURNING * INTO app;
    old_status:=NULL;
  ELSE
    old_status:=app.status;
    allowed:=CASE
      WHEN app.status='started' AND p_to_status='submitted' THEN true
      WHEN app.status='submitted' AND p_to_status IN ('additional_information_requested','under_review') THEN true
      WHEN app.status='additional_information_requested' AND p_to_status IN ('submitted','under_review') THEN true
      WHEN app.status='under_review' AND p_to_status IN ('approved','declined') THEN true
      WHEN app.status='approved' AND p_to_status='lease_sent' THEN true
      WHEN app.status='lease_sent' AND p_to_status='lease_signed' THEN true
      WHEN app.status NOT IN ('lease_signed','declined','withdrawn') AND p_to_status='withdrawn' THEN true
      ELSE false END;
    IF NOT allowed THEN RAISE EXCEPTION 'invalid_application_transition'; END IF;
    UPDATE public.applications SET status=p_to_status,updated_by=auth.uid(),updated_at=now(),
      submitted_at=CASE WHEN p_to_status='submitted' THEN COALESCE(submitted_at,now()) ELSE submitted_at END,
      lease_sent_at=CASE WHEN p_to_status='lease_sent' THEN COALESCE(lease_sent_at,now()) ELSE lease_sent_at END,
      lease_signed_at=CASE WHEN p_to_status='lease_signed' THEN COALESCE(lease_signed_at,now()) ELSE lease_signed_at END,
      lease_reference=CASE WHEN p_to_status='lease_signed' THEN NULLIF(btrim(p_lease_reference),'') ELSE lease_reference END
    WHERE id=app.id RETURNING * INTO app;
  END IF;
  INSERT INTO public.application_status_history(application_id,rental_case_id,from_status,to_status,actor_id,actor_role,reason)
  VALUES(app.id,c.id,old_status,app.status,auth.uid(),role_name,NULLIF(btrim(p_note),''));
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(c.id,auth.uid(),role_name,'application.status_changed',jsonb_build_object('application_id',app.id,'from',old_status,'to',app.status));
  case_target:=CASE app.status
    WHEN 'started' THEN 'application_started'
    WHEN 'submitted' THEN 'application_submitted'
    WHEN 'additional_information_requested' THEN 'additional_documents_requested'
    WHEN 'under_review' THEN 'application_submitted'
    WHEN 'approved' THEN 'approved'
    WHEN 'lease_sent' THEN 'lease_sent'
    WHEN 'lease_signed' THEN 'lease_signed'
    ELSE NULL END;
  IF case_target IS NOT NULL AND c.status IS DISTINCT FROM case_target THEN
    UPDATE public.rental_cases SET status=case_target,updated_at=now(),
      lease_signed_at=CASE WHEN case_target='lease_signed' THEN COALESCE(lease_signed_at,app.lease_signed_at,now()) ELSE lease_signed_at END,
      closed_at=CASE WHEN case_target='lease_signed' THEN COALESCE(closed_at,now()) ELSE closed_at END
    WHERE id=c.id;
    PERFORM public.record_rental_case_transition(c.id,c.status,case_target,'application_status_sync');
  END IF;
  RETURN app;
END $$;
REVOKE ALL ON FUNCTION public.transition_case_application(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transition_case_application(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_tenant_case_progress(p_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; result jsonb;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id AND user_id=auth.uid();
  IF c.id IS NULL OR public.current_account_role()<>'tenant' THEN
    RAISE EXCEPTION 'owned_tenant_case_required' USING ERRCODE='insufficient_privilege'; END IF;
  SELECT jsonb_build_object(
    'applications',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',a.id,'status',a.status,'building_id',a.building_id,'unit_id',a.unit_id,
      'started_at',a.started_at,'submitted_at',a.submitted_at,'lease_sent_at',a.lease_sent_at,
      'lease_signed_at',a.lease_signed_at,'missing_document_categories',a.missing_document_categories,
      'next_follow_up_at',a.next_follow_up_at,'updated_at',a.updated_at
    ) ORDER BY a.created_at) FROM public.applications a WHERE a.rental_case_id=c.id),'[]'::jsonb),
    'application_history',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',h.id,'application_id',h.application_id,'from_status',h.from_status,
      'to_status',h.to_status,'actor_role',h.actor_role,'created_at',h.created_at
    ) ORDER BY h.created_at,h.id) FROM public.application_status_history h WHERE h.rental_case_id=c.id),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_tenant_case_progress(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_case_progress(uuid) TO authenticated;

-- Rollback after consumers are removed: drop the three P0 RPCs and application_status_history,
-- then remove only the nullable columns and indexes added here. Do not delete canonical Case,
-- Recommendation, Application, Contact, Outbox, or audit records.

COMMIT;

-- DEPLOYMENT PAUSED: P0 four-role Rental Case workflow candidate.
-- Disposable seed-disabled database validation only. Never apply to production without separate approval.

BEGIN;

CREATE OR REPLACE FUNCTION public.has_property_building_access(
  p_organization_id uuid,
  p_building_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.current_account_role() = 'property'
    AND EXISTS (
      SELECT 1
      FROM public.property_organization_members AS member
      JOIN public.property_building_access AS access
        ON access.organization_id = member.organization_id
      WHERE member.profile_id = auth.uid()
        AND member.organization_id = p_organization_id
        AND access.building_id = p_building_id
    );
$$;

REVOKE ALL ON FUNCTION public.has_property_building_access(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_property_building_access(uuid,uuid)
  TO authenticated;

DROP POLICY IF EXISTS registration_property_select
  ON public.rental_case_property_registrations;
CREATE POLICY registration_property_select
  ON public.rental_case_property_registrations FOR SELECT TO authenticated
  USING (public.has_property_building_access(organization_id, building_id));

DROP POLICY IF EXISTS inquiries_case_staff_select ON public.inquiries;
CREATE POLICY inquiries_case_staff_select
  ON public.inquiries FOR SELECT TO authenticated
  USING (
    public.current_account_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.rental_cases AS rental_case
      WHERE rental_case.inquiry_id = inquiries.id
        AND rental_case.assigned_agent_id = auth.uid()
        AND public.current_account_role() = 'agent'
    )
  );

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_user_idempotency_idx
  ON public.inquiries(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.rental_cases ADD COLUMN IF NOT EXISTS selected_recommendation_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS rental_case_recommendation_retry_idx
  ON public.rental_case_recommendation_snapshots
  (rental_case_id,agent_id,building_id,unit_id,unit_label,gross_rent,net_effective_rent,available_date,lease_term_months,concession,source_freshness)
  NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS rental_case_registration_retry_idx
  ON public.rental_case_property_registrations(rental_case_id,organization_id,building_id,recommendation_id)
  NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS rental_case_active_invitation_idx
  ON public.rental_case_property_invitations(registration_id,email) WHERE revoked_at IS NULL AND used_at IS NULL;

CREATE TABLE IF NOT EXISTS public.rental_case_recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  recommendation_id uuid NOT NULL REFERENCES public.rental_case_recommendation_snapshots(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK(decision IN ('interested','not_interested')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rental_case_id,recommendation_id,tenant_id)
);
ALTER TABLE public.rental_cases DROP CONSTRAINT IF EXISTS rental_cases_selected_recommendation_fkey;
ALTER TABLE public.rental_cases ADD CONSTRAINT rental_cases_selected_recommendation_fkey
  FOREIGN KEY(selected_recommendation_id) REFERENCES public.rental_case_recommendation_snapshots(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.rental_case_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, recipient_role text NOT NULL,
  event_type text NOT NULL, channel text NOT NULL DEFAULT 'email', status text NOT NULL DEFAULT 'pending',
  dedupe_key text NOT NULL UNIQUE, deep_link text NOT NULL, last_error text, created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz, CHECK(recipient_role IN ('tenant','agent','property','admin')),
  CHECK(channel IN ('email','manual')), CHECK(status IN ('pending','delivered','manual_required','failed'))
);

ALTER TABLE public.rental_case_recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_participant_select ON public.rental_case_recommendation_feedback FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND
    (c.user_id=auth.uid() OR c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin')));
CREATE POLICY notification_recipient_admin_select ON public.rental_case_notifications FOR SELECT TO authenticated USING(
  recipient_id=auth.uid() OR public.current_account_role()='admin');
REVOKE INSERT,UPDATE,DELETE ON public.rental_case_recommendation_feedback,public.rental_case_notifications FROM authenticated,anon;
GRANT SELECT ON public.rental_case_recommendation_feedback,public.rental_case_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_record_recommendation_feedback(p_case_id uuid,p_recommendation_id uuid,p_decision text)
RETURNS public.rental_case_recommendation_feedback LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; result public.rental_case_recommendation_feedback;
BEGIN
  IF p_decision NOT IN ('interested','not_interested') THEN RAISE EXCEPTION 'invalid_recommendation_decision'; END IF;
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF c.user_id<>auth.uid() OR public.current_account_role()<>'tenant' OR c.status NOT IN ('options_sent','interested') THEN
    RAISE EXCEPTION 'tenant_feedback_not_allowed' USING ERRCODE='insufficient_privilege';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rental_case_recommendation_snapshots WHERE id=p_recommendation_id AND rental_case_id=p_case_id) THEN
    RAISE EXCEPTION 'recommendation_not_in_case';
  END IF;
  INSERT INTO public.rental_case_recommendation_feedback(rental_case_id,recommendation_id,tenant_id,decision)
  VALUES(p_case_id,p_recommendation_id,auth.uid(),p_decision)
  ON CONFLICT(rental_case_id,recommendation_id,tenant_id) DO UPDATE SET decision=EXCLUDED.decision,updated_at=now()
  RETURNING * INTO result;
  IF p_decision='interested' THEN
    UPDATE public.rental_cases SET selected_recommendation_id=p_recommendation_id,status='interested' WHERE id=p_case_id;
    IF c.status='options_sent' THEN PERFORM public.record_rental_case_transition(p_case_id,'options_sent','interested','recommendation_selected'); END IF;
  ELSIF c.selected_recommendation_id=p_recommendation_id THEN
    UPDATE public.rental_cases SET selected_recommendation_id=NULL,status='options_sent' WHERE id=p_case_id;
    PERFORM public.record_rental_case_transition(p_case_id,'interested','options_sent','recommendation_selection_withdrawn');
  END IF;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(p_case_id,auth.uid(),'tenant','recommendation.feedback',jsonb_build_object('recommendation_id',p_recommendation_id,'decision',p_decision));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.tenant_record_recommendation_feedback(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_record_recommendation_feedback(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.queue_rental_case_notification(p_case_id uuid,p_recipient_id uuid,p_recipient_role text,p_event_type text,p_dedupe_key text,p_deep_link text)
RETURNS public.rental_case_notifications LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.rental_case_notifications;
BEGIN
  INSERT INTO public.rental_case_notifications(rental_case_id,recipient_id,recipient_role,event_type,dedupe_key,deep_link,status)
  VALUES(p_case_id,p_recipient_id,p_recipient_role,p_event_type,p_dedupe_key,p_deep_link,'manual_required')
  ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=EXCLUDED.dedupe_key RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.queue_rental_case_notification(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;

COMMENT ON TABLE public.rental_case_notifications IS 'P0 durable notification outbox. manual_required is the safe fallback until delivery is separately configured.';
COMMENT ON TABLE public.rental_case_recommendation_feedback IS 'Recommendation-level Tenant decisions. Interested selects the immutable snapshot; not_interested keeps the Case open.';

CREATE OR REPLACE FUNCTION public.queue_case_handoff_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; recipient record; target_role text;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=NEW.rental_case_id;
  target_role:=CASE NEW.to_status WHEN 'submitted' THEN 'admin' WHEN 'reviewed' THEN 'admin'
    WHEN 'agent_assigned' THEN 'agent' WHEN 'options_sent' THEN 'tenant' WHEN 'interested' THEN 'agent'
    WHEN 'registered_with_property' THEN 'property' WHEN 'property_acknowledged' THEN 'agent'
    WHEN 'tour_scheduled' THEN 'tenant' WHEN 'application_started' THEN 'tenant'
    WHEN 'application_submitted' THEN 'agent' WHEN 'lease_signed' THEN 'tenant'
    WHEN 'closed_lost' THEN 'tenant' WHEN 'cancelled' THEN 'admin' END;
  IF target_role='tenant' THEN
    INSERT INTO public.rental_case_notifications(rental_case_id,recipient_id,recipient_role,event_type,dedupe_key,deep_link,status)
    VALUES(c.id,c.user_id,'tenant','case.'||NEW.to_status,NEW.id||':tenant','/cases/'||c.id,'manual_required') ON CONFLICT(dedupe_key) DO NOTHING;
  ELSIF target_role='agent' AND c.assigned_agent_id IS NOT NULL THEN
    INSERT INTO public.rental_case_notifications(rental_case_id,recipient_id,recipient_role,event_type,dedupe_key,deep_link,status)
    VALUES(c.id,c.assigned_agent_id,'agent','case.'||NEW.to_status,NEW.id||':agent','/agent/cases/'||c.id,'manual_required') ON CONFLICT(dedupe_key) DO NOTHING;
  ELSIF target_role='property' THEN
    FOR recipient IN SELECT m.profile_id FROM public.property_organization_members m WHERE m.organization_id=c.property_organization_id LOOP
      INSERT INTO public.rental_case_notifications(rental_case_id,recipient_id,recipient_role,event_type,dedupe_key,deep_link,status)
      VALUES(c.id,recipient.profile_id,'property','case.'||NEW.to_status,NEW.id||':property:'||recipient.profile_id,'/access-pending','manual_required') ON CONFLICT(dedupe_key) DO NOTHING;
    END LOOP;
  ELSIF target_role='admin' THEN
    FOR recipient IN SELECT id FROM public.profiles WHERE authorization_status='active' AND (is_admin OR account_role='admin') LOOP
      INSERT INTO public.rental_case_notifications(rental_case_id,recipient_id,recipient_role,event_type,dedupe_key,deep_link,status)
      VALUES(c.id,recipient.id,'admin','case.'||NEW.to_status,NEW.id||':admin:'||recipient.id,'/admin/cases/'||c.id,'manual_required') ON CONFLICT(dedupe_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_case_handoff_notifications() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rental_case_history_queue_notifications ON public.rental_case_status_history;
CREATE TRIGGER rental_case_history_queue_notifications AFTER INSERT ON public.rental_case_status_history FOR EACH ROW EXECUTE FUNCTION public.queue_case_handoff_notifications();

COMMIT;

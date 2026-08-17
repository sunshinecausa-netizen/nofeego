-- DEPLOYMENT PAUSED: acquisition attribution and Property Contact Outbox candidate.
-- Additive, rollback-aware, local/Preview validation only. Never apply to Production without approval.

BEGIN;

ALTER TABLE public.rental_cases ALTER COLUMN building_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_rental_case_from_inquiry(
  p_inquiry_id uuid,
  p_building_id uuid,
  p_selected_floor_plan text,
  p_displayed_starting_rent numeric,
  p_preferred_unit_type text
)
RETURNS public.rental_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE result public.rental_cases;
BEGIN
  IF public.current_account_role()<>'tenant' OR NOT EXISTS(
    SELECT 1 FROM public.inquiries
    WHERE id=p_inquiry_id
      AND user_id=auth.uid()
      AND building_id IS NOT DISTINCT FROM p_building_id
  ) THEN
    RAISE EXCEPTION 'owned_inquiry_required' USING ERRCODE='insufficient_privilege';
  END IF;
  INSERT INTO public.rental_cases(inquiry_id,user_id,building_id,selected_floor_plan,displayed_starting_rent,preferred_unit_type,status)
  VALUES(p_inquiry_id,auth.uid(),p_building_id,NULLIF(btrim(p_selected_floor_plan),''),p_displayed_starting_rent,NULLIF(btrim(p_preferred_unit_type),''),'submitted')
  ON CONFLICT(inquiry_id) DO UPDATE SET inquiry_id=EXCLUDED.inquiry_id
  RETURNING * INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.create_rental_case_from_inquiry(uuid,uuid,text,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_rental_case_from_inquiry(uuid,uuid,text,numeric,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.acquisition_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_case_id uuid NOT NULL UNIQUE REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  landing_path text NOT NULL DEFAULT '/student-rentals',
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(landing_path) <= 300),
  CHECK (referrer_host IS NULL OR char_length(referrer_host) <= 255),
  CHECK (utm_source IS NULL OR char_length(utm_source) <= 120),
  CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 120),
  CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 160),
  CHECK (utm_content IS NULL OR char_length(utm_content) <= 160),
  CHECK (utm_term IS NULL OR char_length(utm_term) <= 160)
);

CREATE INDEX IF NOT EXISTS acquisition_attributions_campaign_idx
  ON public.acquisition_attributions(utm_source, utm_campaign, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.property_contact_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.rental_case_property_registrations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  idempotency_key uuid NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  approved_at timestamptz,
  simulated_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('draft','approved','simulated_sent','failed','manual_required')),
  CHECK (recipient_email = lower(recipient_email) AND char_length(recipient_email) <= 254),
  CHECK (char_length(subject) BETWEEN 1 AND 200),
  CHECK (char_length(body_text) BETWEEN 1 AND 10000),
  CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS property_contact_outbox_case_idx
  ON public.property_contact_outbox(rental_case_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS property_contact_outbox_active_registration_idx
  ON public.property_contact_outbox(registration_id)
  WHERE status IN ('draft','approved','simulated_sent','manual_required');

ALTER TABLE public.acquisition_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_contact_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY acquisition_tenant_select ON public.acquisition_attributions
  FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY acquisition_staff_select ON public.acquisition_attributions
  FOR SELECT TO authenticated USING (
    public.current_account_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.rental_cases c
      WHERE c.id = rental_case_id AND c.assigned_agent_id = auth.uid()
        AND public.current_account_role() = 'agent'
    )
  );
CREATE POLICY acquisition_tenant_insert ON public.acquisition_attributions
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.rental_cases c WHERE c.id = rental_case_id AND c.user_id = auth.uid())
  );

CREATE POLICY outbox_staff_select ON public.property_contact_outbox
  FOR SELECT TO authenticated USING (
    public.current_account_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.rental_cases c
      WHERE c.id = rental_case_id AND c.assigned_agent_id = auth.uid()
        AND public.current_account_role() = 'agent'
    )
  );

REVOKE ALL ON public.acquisition_attributions, public.property_contact_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.acquisition_attributions TO authenticated;
GRANT SELECT ON public.property_contact_outbox TO authenticated;

CREATE OR REPLACE FUNCTION public.create_property_contact_draft(
  p_registration_id uuid,
  p_recipient_email text,
  p_subject text,
  p_body_text text,
  p_idempotency_key uuid
)
RETURNS public.property_contact_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE registration public.rental_case_property_registrations; c public.rental_cases; result public.property_contact_outbox;
BEGIN
  SELECT * INTO registration FROM public.rental_case_property_registrations WHERE id = p_registration_id;
  IF registration.id IS NULL THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  SELECT * INTO c FROM public.rental_cases WHERE id = registration.rental_case_id;
  IF NOT (public.current_account_role() = 'admin' OR (public.current_account_role() = 'agent' AND c.assigned_agent_id = auth.uid())) THEN
    RAISE EXCEPTION 'outbox_staff_required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO result FROM public.property_contact_outbox WHERE idempotency_key = p_idempotency_key;
  IF result.id IS NOT NULL THEN RETURN result; END IF;
  SELECT * INTO result FROM public.property_contact_outbox
    WHERE registration_id = p_registration_id AND status IN ('draft','approved','simulated_sent','manual_required')
    ORDER BY created_at DESC LIMIT 1;
  IF result.id IS NOT NULL THEN RETURN result; END IF;
  INSERT INTO public.property_contact_outbox(rental_case_id,registration_id,created_by,recipient_email,subject,body_text,idempotency_key)
  VALUES(c.id,registration.id,auth.uid(),lower(btrim(p_recipient_email)),btrim(p_subject),btrim(p_body_text),p_idempotency_key)
  RETURNING * INTO result;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(c.id,auth.uid(),public.current_account_role(),'property_contact.draft_created',jsonb_build_object('outbox_id',result.id,'registration_id',registration.id));
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.approve_property_contact(p_outbox_id uuid)
RETURNS public.property_contact_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE result public.property_contact_outbox;
BEGIN
  IF public.current_account_role() NOT IN ('agent','admin') THEN RAISE EXCEPTION 'outbox_staff_required' USING ERRCODE='insufficient_privilege'; END IF;
  UPDATE public.property_contact_outbox SET status='approved',approved_by=auth.uid(),approved_at=COALESCE(approved_at,now()),updated_at=now()
  WHERE id=p_outbox_id AND status='draft'
    AND (public.current_account_role()='admin' OR EXISTS(SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND c.assigned_agent_id=auth.uid()))
  RETURNING * INTO result;
  IF result.id IS NULL THEN SELECT * INTO result FROM public.property_contact_outbox WHERE id=p_outbox_id AND status IN ('approved','simulated_sent','manual_required'); END IF;
  IF result.id IS NULL THEN RAISE EXCEPTION 'outbox_not_approvable' USING ERRCODE='insufficient_privilege'; END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.simulate_property_contact_send(p_outbox_id uuid, p_fail boolean DEFAULT false)
RETURNS public.property_contact_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE result public.property_contact_outbox; next_status text;
BEGIN
  IF public.current_account_role() NOT IN ('agent','admin') THEN RAISE EXCEPTION 'outbox_staff_required' USING ERRCODE='insufficient_privilege'; END IF;
  SELECT * INTO result FROM public.property_contact_outbox WHERE id=p_outbox_id FOR UPDATE;
  IF result.id IS NULL THEN RAISE EXCEPTION 'outbox_not_found'; END IF;
  IF result.status='simulated_sent' THEN RETURN result; END IF;
  IF result.status NOT IN ('approved','failed','manual_required') THEN RAISE EXCEPTION 'outbox_approval_required'; END IF;
  next_status := CASE WHEN p_fail THEN 'failed' ELSE 'simulated_sent' END;
  UPDATE public.property_contact_outbox SET status=next_status,attempt_count=attempt_count+1,
    last_error=CASE WHEN p_fail THEN 'LOCAL_SIMULATED_DELIVERY_FAILURE' ELSE NULL END,
    simulated_sent_at=CASE WHEN p_fail THEN simulated_sent_at ELSE now() END,updated_at=now()
  WHERE id=p_outbox_id RETURNING * INTO result;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(result.rental_case_id,auth.uid(),public.current_account_role(),
    CASE WHEN p_fail THEN 'property_contact.simulated_failed' ELSE 'property_contact.simulated_sent' END,
    jsonb_build_object('outbox_id',result.id,'attempt_count',result.attempt_count));
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.create_property_contact_draft(uuid,text,text,text,uuid),
  public.approve_property_contact(uuid), public.simulate_property_contact_send(uuid,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_property_contact_draft(uuid,text,text,text,uuid),
  public.approve_property_contact(uuid), public.simulate_property_contact_send(uuid,boolean)
  TO authenticated;

COMMENT ON TABLE public.property_contact_outbox IS 'Human-approved Property contact drafts. simulated_sent never means an external email was sent.';
COMMENT ON TABLE public.acquisition_attributions IS 'First-Rental-Case acquisition attribution captured after authenticated submission.';

COMMIT;

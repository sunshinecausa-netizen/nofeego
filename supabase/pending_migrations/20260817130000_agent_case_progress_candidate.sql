-- Agent Rental Case transaction progress candidate.
-- DEPLOYMENT PAUSED: local isolated validation only; do not add to the active migration chain.
-- Additive: reuses rental_cases, applications, buildings, units, profiles, status history, and audit logs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rental_case_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  time_zone text NOT NULL DEFAULT 'America/New_York',
  meeting_location text,
  contact_name text,
  contact_phone text,
  property_status text NOT NULL DEFAULT 'proposed' CHECK (property_status IN ('proposed','confirmed','declined','reschedule_requested')),
  tenant_status text NOT NULL DEFAULT 'proposed' CHECK (tenant_status IN ('proposed','confirmed','declined','reschedule_requested')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','completed','cancelled','reschedule_requested')),
  meeting_instructions text,
  tenant_feedback text,
  internal_note text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_case_id, building_id, starts_at)
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rental_case_id uuid REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS property_status text,
  ADD COLUMN IF NOT EXISTS missing_document_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_case_progress_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_case_progress_check
  CHECK (status IN ('draft','started','submitted','additional_information_requested','under_review','approved','declined','withdrawn')) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS applications_active_rental_case_idx ON public.applications(rental_case_id)
  WHERE rental_case_id IS NOT NULL AND status NOT IN ('declined','withdrawn');
CREATE INDEX IF NOT EXISTS rental_case_tours_case_time_idx ON public.rental_case_tours(rental_case_id,starts_at);

ALTER TABLE public.rental_case_tours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rental_case_tours_participant_select ON public.rental_case_tours;
CREATE POLICY rental_case_tours_participant_select ON public.rental_case_tours FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND
    (c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin')));

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS applications_case_participant_select ON public.applications;
CREATE POLICY applications_case_participant_select ON public.applications FOR SELECT TO authenticated USING(
  rental_case_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND
    (c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin')));

REVOKE INSERT,UPDATE,DELETE ON public.rental_case_tours,public.applications FROM authenticated,anon;
GRANT SELECT ON public.rental_case_tours,public.applications TO authenticated;

CREATE OR REPLACE FUNCTION public.agent_record_case_tour(
  p_case_id uuid,p_building_id uuid,p_unit_id uuid,p_starts_at timestamptz,p_time_zone text,
  p_meeting_location text,p_contact_name text,p_contact_phone text,p_property_status text,
  p_tenant_status text,p_status text,p_meeting_instructions text,p_tenant_feedback text,p_internal_note text
) RETURNS public.rental_case_tours LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; result public.rental_case_tours;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT (public.current_account_role()='admin' OR (public.current_account_role()='agent' AND c.assigned_agent_id=auth.uid())) THEN
    RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF c.building_id IS DISTINCT FROM p_building_id THEN RAISE EXCEPTION 'building_not_in_case'; END IF;
  IF p_unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.units WHERE id=p_unit_id AND building_id=p_building_id) THEN RAISE EXCEPTION 'unit_not_in_building'; END IF;
  INSERT INTO public.rental_case_tours(rental_case_id,building_id,unit_id,starts_at,time_zone,meeting_location,
    contact_name,contact_phone,property_status,tenant_status,status,meeting_instructions,tenant_feedback,internal_note,created_by)
  VALUES(p_case_id,p_building_id,p_unit_id,p_starts_at,COALESCE(NULLIF(btrim(p_time_zone),''),'America/New_York'),
    NULLIF(btrim(p_meeting_location),''),NULLIF(btrim(p_contact_name),''),NULLIF(btrim(p_contact_phone),''),
    p_property_status,p_tenant_status,p_status,NULLIF(btrim(p_meeting_instructions),''),NULLIF(btrim(p_tenant_feedback),''),
    NULLIF(btrim(p_internal_note),''),auth.uid())
  ON CONFLICT(rental_case_id,building_id,starts_at) DO UPDATE SET
    unit_id=EXCLUDED.unit_id,time_zone=EXCLUDED.time_zone,meeting_location=EXCLUDED.meeting_location,
    contact_name=EXCLUDED.contact_name,contact_phone=EXCLUDED.contact_phone,property_status=EXCLUDED.property_status,
    tenant_status=EXCLUDED.tenant_status,status=EXCLUDED.status,meeting_instructions=EXCLUDED.meeting_instructions,
    tenant_feedback=EXCLUDED.tenant_feedback,internal_note=EXCLUDED.internal_note,updated_at=now()
  RETURNING * INTO result;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(p_case_id,auth.uid(),public.current_account_role(),'rental_case.tour_recorded',jsonb_build_object('tour_id',result.id,'status',result.status,'starts_at',result.starts_at));
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.agent_upsert_case_application(
  p_case_id uuid,p_unit_id uuid,p_status text,p_application_url text,p_property_status text,
  p_missing_document_categories text[],p_follow_up_at timestamptz,p_internal_note text
) RETURNS public.applications LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; result public.applications;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT (public.current_account_role()='admin' OR (public.current_account_role()='agent' AND c.assigned_agent_id=auth.uid())) THEN
    RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF p_status NOT IN ('draft','started','submitted','additional_information_requested','under_review','approved','declined','withdrawn') THEN RAISE EXCEPTION 'invalid_application_status'; END IF;
  IF p_unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.units WHERE id=p_unit_id AND building_id=c.building_id) THEN RAISE EXCEPTION 'unit_not_in_case_building'; END IF;
  SELECT * INTO result FROM public.applications WHERE rental_case_id=p_case_id AND status NOT IN ('declined','withdrawn') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF result.id IS NULL THEN
    INSERT INTO public.applications(user_id,unit_id,status,rental_case_id,building_id,application_url,started_at,submitted_at,
      property_status,missing_document_categories,follow_up_at,internal_note,created_by)
    VALUES(c.user_id,p_unit_id,p_status,p_case_id,c.building_id,NULLIF(btrim(p_application_url),''),
      CASE WHEN p_status<>'draft' THEN now() END,CASE WHEN p_status='submitted' THEN now() END,NULLIF(btrim(p_property_status),''),
      COALESCE(p_missing_document_categories,'{}'),p_follow_up_at,NULLIF(btrim(p_internal_note),''),auth.uid()) RETURNING * INTO result;
  ELSE
    UPDATE public.applications SET unit_id=COALESCE(p_unit_id,unit_id),status=p_status,
      application_url=COALESCE(NULLIF(btrim(p_application_url),''),application_url),
      started_at=CASE WHEN p_status<>'draft' THEN COALESCE(started_at,now()) ELSE started_at END,
      submitted_at=CASE WHEN p_status='submitted' THEN COALESCE(submitted_at,now()) ELSE submitted_at END,
      property_status=NULLIF(btrim(p_property_status),''),missing_document_categories=COALESCE(p_missing_document_categories,'{}'),
      follow_up_at=p_follow_up_at,internal_note=NULLIF(btrim(p_internal_note),''),updated_at=now()
    WHERE id=result.id RETURNING * INTO result;
  END IF;
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(p_case_id,auth.uid(),public.current_account_role(),'rental_case.application_updated',jsonb_build_object('application_id',result.id,'status',result.status));
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.agent_record_case_tour(uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_record_case_tour(uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,text,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.agent_upsert_case_application(uuid,uuid,text,text,text,text[],timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_upsert_case_application(uuid,uuid,text,text,text,text[],timestamptz,text) TO authenticated;

-- Rollback after consumers are disabled: drop the two RPCs and rental_case_tours; drop only the nullable
-- applications columns added above after confirming no Case-linked application rows remain.
COMMIT;

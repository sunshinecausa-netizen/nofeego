-- DEPLOYMENT PAUSED: four-role Rental Case integration candidate.
-- Do not db push, repair the migration ledger, or apply to production without approval.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_role text NOT NULL DEFAULT 'tenant',
  ADD COLUMN IF NOT EXISTS authorization_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_role_four_roles_check
  CHECK (account_role IN ('tenant','agent','property','admin')) NOT VALID;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_authorization_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_authorization_status_check
  CHECK (authorization_status IN ('active','pending','suspended')) NOT VALID;

CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
  SELECT CASE WHEN is_admin THEN 'admin' ELSE account_role END
  FROM public.profiles WHERE id = auth.uid() AND authorization_status = 'active'
$$;
REVOKE ALL ON FUNCTION public.current_account_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_account_role() TO authenticated;

DROP POLICY IF EXISTS update_own_profile ON public.profiles;
DROP POLICY IF EXISTS insert_own_profile ON public.profiles;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_authorization_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() = OLD.id AND
     (to_jsonb(NEW) - ARRAY['display_name','email','updated_at']::text[] IS DISTINCT FROM
      to_jsonb(OLD) - ARRAY['display_name','email','updated_at']::text[]) THEN
    RAISE EXCEPTION 'profile_authorization_fields_are_read_only' USING ERRCODE='insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_profile_authorization_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_protect_authorization_fields ON public.profiles;
CREATE TRIGGER profiles_protect_authorization_fields BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_authorization_fields();

CREATE OR REPLACE FUNCTION public.upsert_own_profile(p_display_name text DEFAULT NULL)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE result public.profiles; normalized text := NULLIF(btrim(p_display_name),'');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF normalized IS NOT NULL AND char_length(normalized)>120 THEN RAISE EXCEPTION 'display_name_too_long' USING ERRCODE='check_violation'; END IF;
  INSERT INTO public.profiles(id,email,display_name,is_admin,account_role,authorization_status)
  SELECT auth.uid(), email, normalized, false, 'tenant', 'active' FROM auth.users WHERE id=auth.uid()
  ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name
  RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.upsert_own_profile(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_own_profile(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.rental_case_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rental_case_id uuid REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id), actor_role text NOT NULL, event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.admin_set_profile_authorization(p_profile_id uuid,p_role text,p_status text DEFAULT 'active')
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.profiles; old_role text;
BEGIN
  IF public.current_account_role()<>'admin' THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF p_profile_id=auth.uid() THEN RAISE EXCEPTION 'admin_cannot_change_own_authorization' USING ERRCODE='insufficient_privilege'; END IF;
  IF p_role NOT IN ('tenant','agent','property','admin') OR p_status NOT IN ('active','pending','suspended') THEN RAISE EXCEPTION 'invalid_authorization'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('profiles.admin_authorization',0));
  SELECT CASE WHEN is_admin THEN 'admin' ELSE account_role END INTO old_role FROM public.profiles WHERE id=p_profile_id;
  IF old_role='admin' AND p_role<>'admin' AND (SELECT count(*) FROM public.profiles WHERE is_admin OR account_role='admin')<=1 THEN
    RAISE EXCEPTION 'cannot_remove_last_admin' USING ERRCODE='check_violation';
  END IF;
  UPDATE public.profiles SET account_role=p_role,is_admin=(p_role='admin'),authorization_status=p_status
  WHERE id=p_profile_id RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'profile_not_found' USING ERRCODE='no_data_found'; END IF;
  INSERT INTO public.rental_case_audit_logs(actor_id,actor_role,event_type,metadata)
  VALUES(auth.uid(),'admin','profile.authorization_changed',jsonb_build_object('profile_id',p_profile_id,'old_role',old_role,'new_role',p_role,'status',p_status));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_profile_authorization(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_authorization(uuid,text,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.property_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.property_organization_members (
  organization_id uuid NOT NULL REFERENCES public.property_organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,profile_id)
);
CREATE TABLE IF NOT EXISTS public.property_building_access (
  organization_id uuid NOT NULL REFERENCES public.property_organizations(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(organization_id,building_id)
);

ALTER TABLE public.rental_cases
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS property_organization_id uuid REFERENCES public.property_organizations(id),
  ADD COLUMN IF NOT EXISTS contact_share_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_reason text,
  ADD COLUMN IF NOT EXISTS lease_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.rental_cases ALTER COLUMN status SET DEFAULT 'submitted';
ALTER TABLE public.rental_cases DROP CONSTRAINT IF EXISTS rental_cases_status_check;
ALTER TABLE public.rental_cases ADD CONSTRAINT rental_cases_status_four_role_check CHECK(status IN (
  'submitted','reviewed','agent_assigned','options_sent','interested','registered_with_property',
  'property_acknowledged','tour_scheduled','application_started','application_submitted',
  'lease_signed','closed_lost','cancelled')) NOT VALID;

CREATE TABLE IF NOT EXISTS public.rental_case_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  from_status text, to_status text NOT NULL, actor_id uuid REFERENCES public.profiles(id), actor_role text NOT NULL,
  reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_case_recommendation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(id), building_id uuid NOT NULL REFERENCES public.buildings(id),
  unit_id uuid REFERENCES public.units(id), unit_label text, gross_rent numeric(12,2), net_effective_rent numeric(12,2),
  available_date date, lease_term_months integer, concession text, source_freshness timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_case_property_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rental_case_id uuid NOT NULL REFERENCES public.rental_cases(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.property_organizations(id), building_id uuid NOT NULL REFERENCES public.buildings(id),
  recommendation_id uuid REFERENCES public.rental_case_recommendation_snapshots(id), status text NOT NULL DEFAULT 'pending',
  inventory_available boolean, confirmed_gross_rent numeric(12,2), confirmed_net_effective_rent numeric(12,2),
  confirmed_available_date date, confirmed_concession text, tour_instructions text, application_url text,
  acknowledged_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(status IN ('pending','acknowledged','unavailable','revoked'))
);
CREATE TABLE IF NOT EXISTS public.rental_case_property_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL REFERENCES public.rental_case_property_registrations(id) ON DELETE CASCADE,
  email text NOT NULL, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz,
  used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rental_cases_agent_idx ON public.rental_cases(assigned_agent_id,status);
CREATE INDEX IF NOT EXISTS rental_case_history_case_idx ON public.rental_case_status_history(rental_case_id,created_at);
CREATE INDEX IF NOT EXISTS rental_case_registration_org_idx ON public.rental_case_property_registrations(organization_id,status);

ALTER TABLE public.property_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_building_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_recommendation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_property_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_property_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_case_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rental_cases_admin_all ON public.rental_cases;
DROP POLICY IF EXISTS rental_cases_insert_own ON public.rental_cases;
CREATE POLICY rental_cases_insert_tenant ON public.rental_cases FOR INSERT TO authenticated
WITH CHECK(user_id=auth.uid() AND public.current_account_role()='tenant' AND status='submitted' AND assigned_agent_id IS NULL);
CREATE POLICY rental_cases_agent_select ON public.rental_cases FOR SELECT TO authenticated
USING(assigned_agent_id=auth.uid() AND public.current_account_role()='agent');
CREATE POLICY rental_cases_admin_select ON public.rental_cases FOR SELECT TO authenticated USING(public.current_account_role()='admin');

DROP POLICY IF EXISTS rental_case_options_admin_all ON public.rental_case_options;
CREATE POLICY rental_case_options_agent_select ON public.rental_case_options FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND c.assigned_agent_id=auth.uid() AND public.current_account_role()='agent'));

CREATE POLICY recommendation_participant_select ON public.rental_case_recommendation_snapshots FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND (c.user_id=auth.uid() OR c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin')));
CREATE POLICY history_participant_select ON public.rental_case_status_history FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND (c.user_id=auth.uid() OR c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin')));
CREATE POLICY registration_agent_admin_select ON public.rental_case_property_registrations FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.rental_cases c WHERE c.id=rental_case_id AND (c.assigned_agent_id=auth.uid() OR public.current_account_role()='admin')));
CREATE POLICY registration_property_select ON public.rental_case_property_registrations FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.property_organization_members m JOIN public.property_building_access b USING(organization_id)
  WHERE m.profile_id=auth.uid() AND m.organization_id=rental_case_property_registrations.organization_id
    AND b.building_id=rental_case_property_registrations.building_id AND public.current_account_role()='property'));
CREATE POLICY audit_admin_select ON public.rental_case_audit_logs FOR SELECT TO authenticated USING(public.current_account_role()='admin');

REVOKE INSERT,UPDATE,DELETE ON public.rental_cases,public.rental_case_options,public.rental_case_status_history,
  public.rental_case_recommendation_snapshots,public.rental_case_property_registrations,
  public.rental_case_property_invitations,public.property_organizations,public.property_organization_members,
  public.property_building_access,public.rental_case_audit_logs FROM authenticated,anon;
GRANT SELECT ON public.rental_cases,public.rental_case_options,public.rental_case_status_history,
  public.rental_case_recommendation_snapshots,public.rental_case_property_registrations TO authenticated;

CREATE OR REPLACE FUNCTION public.record_rental_case_transition(p_case_id uuid,p_from text,p_to text,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  INSERT INTO public.rental_case_status_history(rental_case_id,from_status,to_status,actor_id,actor_role,reason,created_at)
  VALUES(p_case_id,p_from,p_to,auth.uid(),COALESCE(public.current_account_role(),'system'),p_reason,clock_timestamp());
  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(p_case_id,auth.uid(),COALESCE(public.current_account_role(),'system'),'rental_case.status_changed',jsonb_build_object('from',p_from,'to',p_to,'reason',p_reason));
END $$;
REVOKE ALL ON FUNCTION public.record_rental_case_transition(uuid,text,text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.record_rental_case_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  INSERT INTO public.rental_case_status_history(rental_case_id,from_status,to_status,actor_id,actor_role,reason,created_at)
  VALUES(NEW.id,NULL,NEW.status,auth.uid(),COALESCE(public.current_account_role(),'system'),'case_created',clock_timestamp());
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_rental_case_created() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rental_cases_record_created ON public.rental_cases;
CREATE TRIGGER rental_cases_record_created AFTER INSERT ON public.rental_cases FOR EACH ROW EXECUTE FUNCTION public.record_rental_case_created();

CREATE OR REPLACE FUNCTION public.create_rental_case_from_inquiry(p_inquiry_id uuid,p_building_id uuid,p_selected_floor_plan text,
  p_displayed_starting_rent numeric,p_preferred_unit_type text)
RETURNS public.rental_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.rental_cases;
BEGIN
  IF public.current_account_role()<>'tenant' OR NOT EXISTS(
    SELECT 1 FROM public.inquiries WHERE id=p_inquiry_id AND user_id=auth.uid() AND building_id=p_building_id) THEN
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

CREATE OR REPLACE FUNCTION public.transition_rental_case(p_case_id uuid,p_to_status text,p_reason text DEFAULT NULL)
RETURNS public.rental_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; role_name text:=public.current_account_role(); allowed boolean:=false; old_status text;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'rental_case_not_found' USING ERRCODE='no_data_found'; END IF;
  old_status:=c.status;
  IF old_status=p_to_status AND (
    role_name='admin' OR (role_name='tenant' AND c.user_id=auth.uid()) OR
    (role_name='agent' AND c.assigned_agent_id=auth.uid()) OR
    (role_name='property' AND EXISTS(SELECT 1 FROM public.rental_case_property_registrations r
      JOIN public.property_organization_members m ON m.organization_id=r.organization_id
      JOIN public.property_building_access b ON b.organization_id=r.organization_id AND b.building_id=r.building_id
      WHERE r.rental_case_id=c.id AND m.profile_id=auth.uid()))
  ) THEN RETURN c; END IF;
  allowed:=CASE
    WHEN role_name='admin' AND old_status='submitted' AND p_to_status='reviewed' THEN true
    WHEN role_name='agent' AND c.assigned_agent_id=auth.uid() AND old_status='agent_assigned' AND p_to_status='options_sent' THEN true
    WHEN role_name='tenant' AND c.user_id=auth.uid() AND old_status='options_sent' AND p_to_status='interested' THEN true
    WHEN role_name='property' AND old_status='registered_with_property' AND p_to_status='property_acknowledged' AND EXISTS(
      SELECT 1 FROM public.rental_case_property_registrations r JOIN public.property_organization_members m ON m.organization_id=r.organization_id
      JOIN public.property_building_access b ON b.organization_id=r.organization_id AND b.building_id=r.building_id
      WHERE r.rental_case_id=c.id AND m.profile_id=auth.uid()) THEN true
    WHEN role_name='admin' AND old_status='property_acknowledged' AND p_to_status='tour_scheduled' THEN true
    WHEN role_name='agent' AND c.assigned_agent_id=auth.uid() AND old_status='property_acknowledged' AND p_to_status='tour_scheduled' THEN true
    WHEN role_name='property' AND old_status='property_acknowledged' AND p_to_status='tour_scheduled' AND EXISTS(
      SELECT 1 FROM public.rental_case_property_registrations r JOIN public.property_organization_members m ON m.organization_id=r.organization_id
      JOIN public.property_building_access b ON b.organization_id=r.organization_id AND b.building_id=r.building_id
      WHERE r.rental_case_id=c.id AND m.profile_id=auth.uid()) THEN true
    WHEN role_name='admin' AND old_status='tour_scheduled' AND p_to_status='application_started' THEN true
    WHEN role_name='agent' AND c.assigned_agent_id=auth.uid() AND old_status='tour_scheduled' AND p_to_status='application_started' THEN true
    WHEN role_name='admin' AND old_status='application_started' AND p_to_status='application_submitted' THEN true
    WHEN role_name='agent' AND c.assigned_agent_id=auth.uid() AND old_status='application_started' AND p_to_status='application_submitted' THEN true
    WHEN role_name='admin' AND old_status='application_submitted' AND p_to_status='lease_signed' THEN true
    WHEN role_name='agent' AND c.assigned_agent_id=auth.uid() AND old_status='application_submitted' AND p_to_status='lease_signed' THEN true
    WHEN role_name='admin' AND p_to_status='closed_lost' AND old_status NOT IN ('lease_signed','closed_lost','cancelled') THEN true
    WHEN role_name='agent' AND c.assigned_agent_id=auth.uid() AND p_to_status='closed_lost' AND old_status NOT IN ('lease_signed','closed_lost','cancelled') THEN true
    WHEN role_name IN ('tenant','admin') AND p_to_status='cancelled' AND old_status NOT IN ('lease_signed','closed_lost','cancelled') THEN true
    ELSE false END;
  IF NOT allowed THEN RAISE EXCEPTION 'rental_case_transition_not_allowed' USING ERRCODE='insufficient_privilege'; END IF;
  IF p_to_status IN ('closed_lost','cancelled') AND NULLIF(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'closure_reason_required'; END IF;
  UPDATE public.rental_cases SET status=p_to_status,closed_reason=CASE WHEN p_to_status IN ('closed_lost','cancelled') THEN p_reason ELSE closed_reason END,
    lease_signed_at=CASE WHEN p_to_status='lease_signed' THEN now() ELSE lease_signed_at END,
    closed_at=CASE WHEN p_to_status IN ('lease_signed','closed_lost','cancelled') THEN now() ELSE closed_at END
  WHERE id=p_case_id RETURNING * INTO c;
  PERFORM public.record_rental_case_transition(p_case_id,old_status,p_to_status,p_reason);
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.transition_rental_case(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transition_rental_case(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_rental_case(p_case_id uuid,p_agent_id uuid)
RETURNS public.rental_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; old_status text;
BEGIN
  IF public.current_account_role()<>'admin' THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_agent_id AND account_role='agent' AND authorization_status='active') THEN RAISE EXCEPTION 'active_agent_required'; END IF;
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  old_status:=c.status;
  IF old_status='agent_assigned' AND c.assigned_agent_id=p_agent_id THEN RETURN c; END IF;
  IF old_status<>'reviewed' THEN RAISE EXCEPTION 'case_must_be_reviewed'; END IF;
  UPDATE public.rental_cases SET assigned_agent_id=p_agent_id,status='agent_assigned' WHERE id=p_case_id RETURNING * INTO c;
  PERFORM public.record_rental_case_transition(p_case_id,old_status,'agent_assigned','admin_assignment'); RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.admin_assign_rental_case(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_rental_case(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.agent_send_recommendation(p_case_id uuid,p_building_id uuid,p_unit_id uuid,p_unit_label text,
  p_gross_rent numeric,p_net_effective_rent numeric,p_available_date date,p_lease_term_months integer,p_concession text,p_source_freshness timestamptz)
RETURNS public.rental_case_recommendation_snapshots LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.rental_case_recommendation_snapshots; c public.rental_cases;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  IF public.current_account_role()<>'agent' OR c.assigned_agent_id<>auth.uid() OR c.status NOT IN ('agent_assigned','options_sent') THEN RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege'; END IF;
  INSERT INTO public.rental_case_recommendation_snapshots(rental_case_id,agent_id,building_id,unit_id,unit_label,gross_rent,net_effective_rent,available_date,lease_term_months,concession,source_freshness)
  VALUES(p_case_id,auth.uid(),p_building_id,p_unit_id,p_unit_label,p_gross_rent,p_net_effective_rent,p_available_date,p_lease_term_months,p_concession,p_source_freshness)
  ON CONFLICT(rental_case_id,agent_id,building_id,unit_id,unit_label,gross_rent,net_effective_rent,available_date,lease_term_months,concession,source_freshness)
  DO UPDATE SET sent_at=public.rental_case_recommendation_snapshots.sent_at RETURNING * INTO result;
  IF c.status='agent_assigned' THEN UPDATE public.rental_cases SET status='options_sent' WHERE id=p_case_id; PERFORM public.record_rental_case_transition(p_case_id,'agent_assigned','options_sent','recommendation_sent'); END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.agent_send_recommendation(uuid,uuid,uuid,text,numeric,numeric,date,integer,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_send_recommendation(uuid,uuid,uuid,text,numeric,numeric,date,integer,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.agent_register_with_property(p_case_id uuid,p_organization_id uuid,p_building_id uuid,p_recommendation_id uuid)
RETURNS public.rental_case_property_registrations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.rental_cases; result public.rental_case_property_registrations;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id=p_case_id FOR UPDATE;
  SELECT * INTO result FROM public.rental_case_property_registrations
    WHERE rental_case_id=p_case_id AND organization_id=p_organization_id AND building_id=p_building_id
      AND recommendation_id IS NOT DISTINCT FROM p_recommendation_id;
  IF result.id IS NOT NULL AND c.assigned_agent_id=auth.uid() AND public.current_account_role()='agent' THEN RETURN result; END IF;
  IF public.current_account_role()<>'agent' OR c.assigned_agent_id<>auth.uid() OR c.status<>'interested' THEN RAISE EXCEPTION 'assigned_agent_registration_required' USING ERRCODE='insufficient_privilege'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.property_building_access WHERE organization_id=p_organization_id AND building_id=p_building_id) THEN RAISE EXCEPTION 'property_building_access_required'; END IF;
  INSERT INTO public.rental_case_property_registrations(rental_case_id,organization_id,building_id,recommendation_id)
  VALUES(p_case_id,p_organization_id,p_building_id,p_recommendation_id) RETURNING * INTO result;
  UPDATE public.rental_cases SET property_organization_id=p_organization_id,status='registered_with_property' WHERE id=p_case_id;
  PERFORM public.record_rental_case_transition(p_case_id,'interested','registered_with_property','property_registration'); RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.agent_register_with_property(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_register_with_property(uuid,uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_property_building_access(p_organization_id uuid,p_building_id uuid)
RETURNS public.property_building_access LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.property_building_access;
BEGIN
  IF public.current_account_role()<>'admin' THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='insufficient_privilege'; END IF;
  INSERT INTO public.property_building_access(organization_id,building_id,granted_by)
  VALUES(p_organization_id,p_building_id,auth.uid()) ON CONFLICT(organization_id,building_id) DO NOTHING
  RETURNING * INTO result;
  INSERT INTO public.rental_case_audit_logs(actor_id,actor_role,event_type,metadata)
  VALUES(auth.uid(),'admin','property.building_access_granted',jsonb_build_object('organization_id',p_organization_id,'building_id',p_building_id));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_grant_property_building_access(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_property_building_access(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.agent_create_property_invitation(p_registration_id uuid,p_email text,p_token_hash text,p_expires_at timestamptz)
RETURNS public.rental_case_property_invitations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result public.rental_case_property_invitations;
BEGIN
  IF public.current_account_role()<>'agent' OR NOT EXISTS(
    SELECT 1 FROM public.rental_case_property_registrations r JOIN public.rental_cases c ON c.id=r.rental_case_id
    WHERE r.id=p_registration_id AND c.assigned_agent_id=auth.uid()) THEN
    RAISE EXCEPTION 'assigned_agent_required' USING ERRCODE='insufficient_privilege';
  END IF;
  IF p_expires_at<=now() OR p_expires_at>now()+interval '7 days' THEN RAISE EXCEPTION 'invalid_invitation_expiry'; END IF;
  SELECT * INTO result FROM public.rental_case_property_invitations
    WHERE registration_id=p_registration_id AND email=lower(btrim(p_email)) AND revoked_at IS NULL AND used_at IS NULL;
  IF result.id IS NOT NULL THEN RETURN result; END IF;
  INSERT INTO public.rental_case_property_invitations(registration_id,email,token_hash,expires_at)
  VALUES(p_registration_id,lower(btrim(p_email)),p_token_hash,p_expires_at) RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.agent_create_property_invitation(uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_create_property_invitation(uuid,text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.property_acknowledge_registration(p_registration_id uuid,p_available boolean,p_gross_rent numeric,
  p_net_effective_rent numeric,p_available_date date,p_concession text,p_tour_instructions text,p_application_url text)
RETURNS public.rental_case_property_registrations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.rental_case_property_registrations; c public.rental_cases; result public.rental_case_property_registrations;
BEGIN
  SELECT * INTO r FROM public.rental_case_property_registrations WHERE id=p_registration_id FOR UPDATE;
  IF public.current_account_role()<>'property' OR NOT EXISTS(
    SELECT 1 FROM public.property_organization_members m JOIN public.property_building_access b USING(organization_id)
    WHERE m.profile_id=auth.uid() AND m.organization_id=r.organization_id AND b.building_id=r.building_id) THEN
    RAISE EXCEPTION 'property_building_access_required' USING ERRCODE='insufficient_privilege';
  END IF;
  IF r.status<>'pending' THEN
    IF r.inventory_available IS NOT DISTINCT FROM p_available
      AND r.confirmed_gross_rent IS NOT DISTINCT FROM p_gross_rent
      AND r.confirmed_net_effective_rent IS NOT DISTINCT FROM p_net_effective_rent
      AND r.confirmed_available_date IS NOT DISTINCT FROM p_available_date
      AND r.confirmed_concession IS NOT DISTINCT FROM p_concession
      AND r.tour_instructions IS NOT DISTINCT FROM p_tour_instructions
      AND r.application_url IS NOT DISTINCT FROM p_application_url THEN RETURN r; END IF;
    RAISE EXCEPTION 'registration_already_completed';
  END IF;
  UPDATE public.rental_case_property_registrations SET status=CASE WHEN p_available THEN 'acknowledged' ELSE 'unavailable' END,
    inventory_available=p_available,confirmed_gross_rent=p_gross_rent,confirmed_net_effective_rent=p_net_effective_rent,
    confirmed_available_date=p_available_date,confirmed_concession=p_concession,tour_instructions=p_tour_instructions,
    application_url=p_application_url,acknowledged_at=now(),updated_at=now() WHERE id=p_registration_id RETURNING * INTO result;
  SELECT * INTO c FROM public.rental_cases WHERE id=r.rental_case_id FOR UPDATE;
  IF p_available AND c.status='registered_with_property' THEN
    UPDATE public.rental_cases SET status='property_acknowledged' WHERE id=c.id;
    PERFORM public.record_rental_case_transition(c.id,'registered_with_property','property_acknowledged','property_response');
  END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.property_acknowledge_registration(uuid,boolean,numeric,numeric,date,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.property_acknowledge_registration(uuid,boolean,numeric,numeric,date,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_property_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE invitation public.rental_case_property_invitations; registration public.rental_case_property_registrations; caller_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='insufficient_privilege'; END IF;
  SELECT * INTO invitation FROM public.rental_case_property_invitations
  WHERE token_hash=encode(digest(p_token,'sha256'),'hex') FOR UPDATE;
  IF invitation.id IS NULL OR invitation.expires_at<=now() OR invitation.revoked_at IS NOT NULL OR invitation.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation_invalid_or_expired' USING ERRCODE='insufficient_privilege';
  END IF;
  SELECT email INTO caller_email FROM auth.users WHERE id=auth.uid();
  IF lower(caller_email)<>lower(invitation.email) THEN RAISE EXCEPTION 'invitation_email_mismatch' USING ERRCODE='insufficient_privilege'; END IF;
  SELECT * INTO registration FROM public.rental_case_property_registrations WHERE id=invitation.registration_id;
  IF public.current_account_role()<>'property' OR NOT EXISTS(
    SELECT 1 FROM public.property_organization_members m JOIN public.property_building_access b USING(organization_id)
    WHERE m.profile_id=auth.uid() AND m.organization_id=registration.organization_id AND b.building_id=registration.building_id) THEN
    RAISE EXCEPTION 'property_building_access_required' USING ERRCODE='insufficient_privilege';
  END IF;
  UPDATE public.rental_case_property_invitations SET used_at=now() WHERE id=invitation.id;
  RETURN registration.id;
END $$;
REVOKE ALL ON FUNCTION public.consume_property_invitation(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_property_invitation(text) TO authenticated;

-- Recommendation snapshots are append-only. No UPDATE/DELETE policy or RPC is provided.
COMMENT ON TABLE public.rental_case_recommendation_snapshots IS 'Immutable facts captured when an assigned Agent sends a Unit recommendation.';
COMMENT ON TABLE public.inquiries IS 'Lightweight inquiry/lead intake; not the formal Rental Case state machine.';
COMMENT ON TABLE public.rental_cases IS 'Formal four-role rental workflow. DEPLOYMENT PAUSED candidate.';

COMMIT;

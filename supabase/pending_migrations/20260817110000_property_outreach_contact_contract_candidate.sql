-- DEPLOYMENT PAUSED: Property Outreach contact contract candidate.
-- Do not add to the active migration chain or apply to Preview/Production without approval.
-- Source: property_contacts canonical columns are preserved from
-- 20260814000100_agent_inventory_phase_1.sql; this candidate adds only the
-- organization, purpose, review, and Outbox relationships required by the
-- approved Property Outreach workflow.

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  preferred_method text CHECK (preferred_method IS NULL OR preferred_method IN ('phone','email','sms','portal')),
  preferred_hours text,
  visibility text NOT NULL DEFAULT 'admin_only'
    CHECK (visibility IN ('public','registered','agent_only','admin_only')),
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL),
  CHECK (verification_expires_at IS NULL OR last_verified_at IS NULL OR verification_expires_at >= last_verified_at)
);

ALTER TABLE public.property_contacts
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.property_organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS role_title text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS source_note text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_successful_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.property_contacts DROP CONSTRAINT IF EXISTS property_contacts_purpose_check;
ALTER TABLE public.property_contacts ADD CONSTRAINT property_contacts_purpose_check
  CHECK (purpose IS NULL OR purpose IN ('availability','leasing','registration','tour','application','general')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_property_contacts_building_visibility
  ON public.property_contacts(building_id, visibility);
CREATE INDEX IF NOT EXISTS property_contacts_outreach_priority_idx
  ON public.property_contacts(building_id, organization_id, is_active, needs_review, purpose, last_successful_contact_at DESC);

ALTER TABLE public.property_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_building_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS property_organizations_outreach_staff_select ON public.property_organizations;
CREATE POLICY property_organizations_outreach_staff_select ON public.property_organizations
  FOR SELECT TO authenticated USING (
    public.current_account_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.property_building_access a
      JOIN public.rental_cases c ON c.building_id = a.building_id
      WHERE a.organization_id = property_organizations.id
        AND c.assigned_agent_id = auth.uid()
        AND public.current_account_role() = 'agent'
    )
    OR EXISTS (
      SELECT 1 FROM public.property_organization_members m
      WHERE m.organization_id = property_organizations.id AND m.profile_id = auth.uid()
        AND public.current_account_role() = 'property'
    )
  );
DROP POLICY IF EXISTS property_building_access_outreach_staff_select ON public.property_building_access;
CREATE POLICY property_building_access_outreach_staff_select ON public.property_building_access
  FOR SELECT TO authenticated USING (
    public.current_account_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.rental_cases c
      WHERE c.building_id = property_building_access.building_id
        AND c.assigned_agent_id = auth.uid()
        AND public.current_account_role() = 'agent'
    )
    OR EXISTS (
      SELECT 1 FROM public.property_organization_members m
      WHERE m.organization_id = property_building_access.organization_id AND m.profile_id = auth.uid()
        AND public.current_account_role() = 'property'
    )
  );

GRANT SELECT ON public.property_organizations, public.property_building_access TO authenticated;

ALTER TABLE public.property_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS property_contacts_outreach_staff_select ON public.property_contacts;
CREATE POLICY property_contacts_outreach_staff_select ON public.property_contacts
  FOR SELECT TO authenticated USING (
    public.current_account_role() = 'admin'
    OR (
      public.current_account_role() = 'agent'
      AND EXISTS (
        SELECT 1 FROM public.rental_cases c
        WHERE c.assigned_agent_id = auth.uid()
          AND c.building_id = property_contacts.building_id
      )
    )
    OR (
      public.current_account_role() = 'property'
      AND EXISTS (
        SELECT 1
        FROM public.property_organization_members m
        JOIN public.property_building_access a USING (organization_id)
        WHERE m.profile_id = auth.uid()
          AND a.building_id = property_contacts.building_id
          AND (property_contacts.organization_id IS NULL OR property_contacts.organization_id = m.organization_id)
      )
    )
  );

REVOKE ALL ON public.property_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_contacts TO authenticated;

-- Availability outreach is not the same business action as formal customer
-- registration, so registration_id becomes optional while the canonical Case,
-- Building, Organization, Contact, Unit, and Recommendation links are explicit.
ALTER TABLE public.property_contact_outbox
  ALTER COLUMN registration_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.property_organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS property_contact_id uuid REFERENCES public.property_contacts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES public.rental_case_recommendation_snapshots(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'availability',
  ADD COLUMN IF NOT EXISTS reply_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.property_contact_outbox o
SET building_id = r.building_id,
    organization_id = r.organization_id,
    recommendation_id = r.recommendation_id
FROM public.rental_case_property_registrations r
WHERE o.registration_id = r.id
  AND (o.building_id IS NULL OR o.organization_id IS NULL OR o.recommendation_id IS NULL);

ALTER TABLE public.property_contact_outbox DROP CONSTRAINT IF EXISTS property_contact_outbox_status_check;
ALTER TABLE public.property_contact_outbox ADD CONSTRAINT property_contact_outbox_status_check
  CHECK (status IN ('draft','approved','queued','sent','failed','acknowledged','cancelled','simulated_sent','manual_required')) NOT VALID;
ALTER TABLE public.property_contact_outbox DROP CONSTRAINT IF EXISTS property_contact_outbox_purpose_check;
ALTER TABLE public.property_contact_outbox ADD CONSTRAINT property_contact_outbox_purpose_check
  CHECK (purpose IN ('availability','leasing','registration','tour','application','general')) NOT VALID;

CREATE INDEX IF NOT EXISTS property_contact_outbox_outreach_queue_idx
  ON public.property_contact_outbox(building_id, purpose, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS property_contact_outbox_active_case_building_purpose_idx
  ON public.property_contact_outbox(rental_case_id, building_id, purpose)
  WHERE status IN ('draft','approved','queued','sent','manual_required','simulated_sent');

CREATE OR REPLACE FUNCTION public.create_property_outreach_draft(
  p_case_id uuid,
  p_building_id uuid,
  p_organization_id uuid,
  p_property_contact_id uuid,
  p_unit_id uuid,
  p_recommendation_id uuid,
  p_subject text,
  p_body_text text,
  p_idempotency_key uuid
)
RETURNS public.property_contact_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c public.rental_cases;
  contact public.property_contacts;
  existing public.property_contact_outbox;
BEGIN
  SELECT * INTO c FROM public.rental_cases WHERE id = p_case_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF NOT (public.current_account_role() = 'admin' OR (public.current_account_role() = 'agent' AND c.assigned_agent_id = auth.uid())) THEN
    RAISE EXCEPTION 'outreach_staff_required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF c.building_id IS DISTINCT FROM p_building_id THEN RAISE EXCEPTION 'building_not_in_case'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.property_building_access a
    WHERE a.organization_id = p_organization_id AND a.building_id = p_building_id
  ) THEN RAISE EXCEPTION 'organization_not_authorized_for_building'; END IF;
  SELECT * INTO contact FROM public.property_contacts
  WHERE id = p_property_contact_id AND building_id = p_building_id AND is_active;
  IF contact.id IS NULL OR contact.email IS NULL THEN RAISE EXCEPTION 'reviewed_email_contact_required'; END IF;
  IF contact.needs_review OR contact.last_verified_at IS NULL THEN RAISE EXCEPTION 'contact_review_required'; END IF;
  IF contact.organization_id IS NOT NULL AND contact.organization_id <> p_organization_id THEN
    RAISE EXCEPTION 'contact_organization_mismatch';
  END IF;
  IF p_recommendation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rental_case_recommendation_snapshots s
    WHERE s.id = p_recommendation_id AND s.rental_case_id = p_case_id AND s.building_id = p_building_id
  ) THEN RAISE EXCEPTION 'recommendation_not_in_case'; END IF;
  IF p_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units u WHERE u.id = p_unit_id AND u.building_id = p_building_id
  ) THEN RAISE EXCEPTION 'unit_not_in_building'; END IF;

  SELECT * INTO existing FROM public.property_contact_outbox WHERE idempotency_key = p_idempotency_key;
  IF existing.id IS NOT NULL THEN RETURN existing; END IF;
  SELECT * INTO existing FROM public.property_contact_outbox
    WHERE rental_case_id = p_case_id AND building_id = p_building_id AND purpose = 'availability'
      AND status IN ('draft','approved','queued','sent','manual_required','simulated_sent')
    ORDER BY created_at DESC LIMIT 1;
  IF existing.id IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.property_contact_outbox(
    rental_case_id, registration_id, building_id, organization_id, property_contact_id,
    unit_id, recommendation_id, created_by, recipient_email, subject, body_text,
    purpose, idempotency_key
  ) VALUES (
    p_case_id, NULL, p_building_id, p_organization_id, p_property_contact_id,
    p_unit_id, p_recommendation_id, auth.uid(), lower(contact.email), btrim(p_subject),
    btrim(p_body_text), 'availability', p_idempotency_key
  ) RETURNING * INTO existing;

  INSERT INTO public.rental_case_audit_logs(rental_case_id,actor_id,actor_role,event_type,metadata)
  VALUES(p_case_id,auth.uid(),public.current_account_role(),'property_outreach.draft_created',
    jsonb_build_object('outbox_id',existing.id,'building_id',p_building_id,
      'organization_id',p_organization_id,'property_contact_id',p_property_contact_id));
  RETURN existing;
END $$;

REVOKE ALL ON FUNCTION public.create_property_outreach_draft(uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_property_outreach_draft(uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid)
  TO authenticated;

COMMENT ON TABLE public.property_contacts IS
  'Canonical source-backed Property contacts. Contacts requiring review cannot receive automated outreach.';
COMMENT ON FUNCTION public.create_property_outreach_draft(uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid) IS
  'Creates or returns one human-reviewed availability draft for an assigned Case and canonical Building/Organization/Contact relationship.';

-- Rollback (only after all consumers are disabled): drop the new RPC and indexes,
-- then drop the added nullable Outbox/contact columns. Do not drop contact rows or
-- restore registration_id NOT NULL until rows with NULL registration_id are resolved.

COMMIT;

-- Agent Inventory phase 1.
-- DEPLOYMENT PAUSED: do not apply until schema reconciliation is reviewed and explicitly approved.
-- Expand-only: reuses canonical Building, Unit, amenity, source, and snapshot data.
-- This migration intentionally aborts when the five-tab inventory baseline is absent.

DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'buildings', 'units', 'building_amenities', 'building_sources',
    'inventory_snapshots', 'profiles'
  ]
  LOOP
    IF to_regclass(format('public.%I', required_table)) IS NULL THEN
      RAISE EXCEPTION
        'Agent Inventory migration requires public.% before it can run; apply/reconcile the five-tab inventory baseline first.',
        required_table;
    END IF;
  END LOOP;
END $$;

-- Existing equivalents that are deliberately reused (no duplicate columns):
-- buildings.name/building_name, address/street_address, neighborhood_id/borough,
-- management_company, official_building_website, building_amenities,
-- buildings.last_verified_date, units.unit_number/bedrooms/bathrooms/square_feet/
-- floor, inventory_snapshots.rent/net_effective_rent/available_date, and
-- building_sources source/verification metadata.

CREATE TABLE IF NOT EXISTS public.building_inventory_policies (
  building_id uuid PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  pet_policy text,
  qualification_summary text,
  visibility text NOT NULL DEFAULT 'admin_only'
    CHECK (visibility IN ('public','registered','customer_after_request','agent_only','admin_only')),
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (verification_expires_at IS NULL OR last_verified_at IS NULL OR verification_expires_at >= last_verified_at)
);

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS exposure text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS lease_term_months integer,
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.inventory_snapshots
    ADD CONSTRAINT inventory_snapshots_lease_term_positive
    CHECK (lease_term_months IS NULL OR lease_term_months > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.unit_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  description text,
  is_mandatory boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'customer_after_request'
    CHECK (visibility IN ('public','registered','customer_after_request','agent_only','admin_only')),
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR last_verified_at IS NULL OR valid_until >= last_verified_at)
);
CREATE INDEX IF NOT EXISTS idx_unit_fees_unit ON public.unit_fees(unit_id);

CREATE TABLE IF NOT EXISTS public.unit_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('floor_plan','photo','video')),
  media_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  visibility text NOT NULL DEFAULT 'customer_after_request'
    CHECK (visibility IN ('public','registered','customer_after_request','agent_only','admin_only')),
  rights_expires_at timestamptz,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, media_url)
);
CREATE INDEX IF NOT EXISTS idx_unit_media_unit_order ON public.unit_media(unit_id, display_order);

CREATE TABLE IF NOT EXISTS public.unit_concessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  concession_type text NOT NULL
    CHECK (concession_type IN ('free_rent','rent_credit','waived_fee','gift','other')),
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  free_rent_months numeric(5,2) CHECK (free_rent_months IS NULL OR free_rent_months >= 0),
  eligible_lease_terms integer[] NOT NULL DEFAULT '{}',
  move_in_start date,
  move_in_end date,
  application_deadline timestamptz,
  notes text,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  valid_from timestamptz,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (move_in_end IS NULL OR move_in_start IS NULL OR move_in_end >= move_in_start),
  CHECK (valid_from IS NULL OR valid_until >= valid_from)
);
CREATE INDEX IF NOT EXISTS idx_unit_concessions_unit_validity ON public.unit_concessions(unit_id, valid_until DESC);

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
CREATE INDEX IF NOT EXISTS idx_property_contacts_building_visibility ON public.property_contacts(building_id, visibility);

CREATE TABLE IF NOT EXISTS public.showing_policies (
  building_id uuid PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('leasing_office','appointment','open_house','self_guided','agent_accompanied')),
  agent_instructions text,
  customer_instructions text,
  booking_url text,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_policies (
  building_id uuid PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  application_url text,
  required_documents text[] NOT NULL DEFAULT '{}',
  qualification_summary text,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broker_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  conditions text,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  valid_from timestamptz,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_from IS NULL OR valid_until >= valid_from)
);
CREATE INDEX IF NOT EXISTS idx_broker_compensation_building_unit ON public.broker_compensation(building_id, unit_id);

ALTER TABLE public.building_sources
  ADD COLUMN IF NOT EXISTS display_scope text NOT NULL DEFAULT 'admin_only',
  ADD COLUMN IF NOT EXISTS authorization_expires_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.building_sources
    ADD CONSTRAINT building_sources_display_scope_check
    CHECK (display_scope IN ('public','registered','customer_after_request','agent_only','admin_only')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.inventory_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (building_id IS NOT NULL OR unit_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.inventory_audit_logs (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid,
  sensitivity text NOT NULL DEFAULT 'high' CHECK (sensitivity IN ('low','medium','high')),
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_entity ON public.inventory_audit_logs(entity_table, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_actor ON public.inventory_audit_logs(actor_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.reject_inventory_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'inventory_audit_logs is append-only';
END $$;

DROP TRIGGER IF EXISTS inventory_audit_logs_append_only ON public.inventory_audit_logs;
CREATE TRIGGER inventory_audit_logs_append_only
BEFORE UPDATE OR DELETE ON public.inventory_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.reject_inventory_audit_mutation();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'building_inventory_policies', 'unit_fees', 'unit_media', 'unit_concessions',
    'property_contacts', 'showing_policies', 'application_policies',
    'broker_compensation', 'inventory_internal_notes', 'inventory_audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- No anon/authenticated policies are added here: default deny is intentional.
-- Access must go through a separately reviewed server allowlist/safe-send layer.
COMMENT ON TABLE public.inventory_audit_logs IS 'Append-only audit trail for sensitive inventory views, sends, and changes.';
COMMENT ON COLUMN public.building_sources.display_scope IS 'Default deny when authorization scope is unknown.';

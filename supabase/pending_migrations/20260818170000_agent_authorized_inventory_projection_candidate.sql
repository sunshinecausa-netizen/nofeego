-- DEPLOYMENT PAUSED: Agent-authorized inventory projection candidate.
-- Preview/isolation only. Never add fixtures to Production or bypass RLS.
BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_building_inventory_access (
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, building_id)
);

ALTER TABLE public.property_organizations
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS leasing_office_website text,
  ADD COLUMN IF NOT EXISTS office_hours text;

CREATE TABLE IF NOT EXISTS public.application_policies (
  building_id uuid PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  application_url text,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (verification_expires_at IS NULL OR last_verified_at IS NULL OR verification_expires_at >= last_verified_at)
);

CREATE TABLE IF NOT EXISTS public.unit_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  description text,
  is_mandatory boolean NOT NULL DEFAULT true,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  last_verified_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_building_inventory_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_fees ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.agent_building_inventory_access, public.application_policies, public.unit_fees
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.units, public.inventory_snapshots, public.building_sources
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.agent_authorized_inventory(p_building_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  role_name text := public.current_account_role();
  allowed_ids uuid[];
BEGIN
  IF role_name NOT IN ('agent','admin') THEN
    RAISE EXCEPTION 'agent_inventory_access_required' USING ERRCODE='insufficient_privilege';
  END IF;

  SELECT COALESCE(array_agg(a.building_id), ARRAY[]::uuid[]) INTO allowed_ids
  FROM public.agent_building_inventory_access a
  WHERE role_name='admin' OR (
    a.agent_id=auth.uid() AND a.status='active'
    AND (a.expires_at IS NULL OR a.expires_at>now())
  );

  IF p_building_id IS NOT NULL AND NOT (p_building_id=ANY(allowed_ids)) THEN
    RAISE EXCEPTION 'agent_inventory_building_forbidden' USING ERRCODE='insufficient_privilege';
  END IF;

  IF p_building_id IS NOT NULL THEN allowed_ids := ARRAY[p_building_id]; END IF;

  RETURN jsonb_build_object(
    'buildingIds', to_jsonb(allowed_ids),
    'buildings', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM (
      SELECT id,slug,name,address,street_address,address_line_2,city,state,zip_code,neighborhood,borough,
        latitude,longitude,building_type,amenities,pet_friendly,year_built,floors,stories,total_units,
        hero_image,hero_image_url,gallery,nearby_subway,official_building_website,management_company,
        description,last_verified_date,updated_at
      FROM public.buildings WHERE id=ANY(allowed_ids)
    ) b),'[]'::jsonb),
    'units', COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM (
      SELECT id,building_id,unit_number,floorplan_name,unit_type,bedrooms,bathrooms,square_feet,floor,
        lease_term,broker_fee,is_no_fee,status,is_active
      FROM public.units WHERE building_id=ANY(allowed_ids)
    ) u),'[]'::jsonb),
    'snapshots', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.captured_at DESC) FROM (
      SELECT id,building_id,unit_id,source_id,rent,net_effective_rent,concession_text,concession_amount,
        available_date,is_no_fee,inventory_status,captured_at,valid_until
      FROM public.inventory_snapshots WHERE building_id=ANY(allowed_ids)
    ) s),'[]'::jsonb),
    'sources', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.last_verified_at DESC NULLS LAST) FROM (
      SELECT id,building_id,source_type,source_name,source_url,last_verified_at,verification_status
      FROM public.building_sources WHERE building_id=ANY(allowed_ids)
    ) s),'[]'::jsonb),
    'organizations', COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM (
      SELECT DISTINCT po.id,po.name,po.website,po.leasing_office_website,po.office_hours,pba.building_id
      FROM public.property_building_access pba
      JOIN public.property_organizations po ON po.id=pba.organization_id
      WHERE pba.building_id=ANY(allowed_ids)
    ) o),'[]'::jsonb),
    'contacts', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM (
      SELECT id,building_id,organization_id,name,role_title,purpose,email,phone,website,preferred_method,
        preferred_hours,last_verified_at,verification_expires_at,is_active,needs_review
      FROM public.property_contacts
      WHERE building_id=ANY(allowed_ids) AND is_active AND NOT needs_review
    ) c),'[]'::jsonb),
    'applications', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM (
      SELECT building_id,application_url,last_verified_at,verification_expires_at
      FROM public.application_policies WHERE building_id=ANY(allowed_ids)
    ) a),'[]'::jsonb),
    'fees', COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM (
      SELECT f.id,f.unit_id,u.building_id,f.fee_type,f.amount,f.currency,f.description,f.is_mandatory,
        f.last_verified_at,f.valid_until
      FROM public.unit_fees f JOIN public.units u ON u.id=f.unit_id
      WHERE u.building_id=ANY(allowed_ids) AND (f.valid_until IS NULL OR f.valid_until>now())
    ) f),'[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.agent_authorized_inventory(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_authorized_inventory(uuid) TO authenticated;

COMMENT ON FUNCTION public.agent_authorized_inventory(uuid) IS
  'Agent-only allowlisted projection. Authorization is independent from Rental Cases and property_building_access.';

COMMIT;

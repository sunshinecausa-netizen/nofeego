-- Reconcile the local migration description with the read-only remote schema.
-- Fact source: public schema dump from project xubmygyotkmvjeaspzge on 2026-08-14.
-- Pure DDL only: no business rows, backfills, migration repair, or remote execution.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.buildings') IS NULL
     OR to_regclass('public.units') IS NULL
     OR to_regclass('public.inventory_snapshots') IS NULL THEN
    RAISE EXCEPTION 'Reconciliation requires the 20260805130112 bootstrap baseline';
  END IF;
END $$;

-- Match the function body currently present in the remote schema. The existing
-- append-only trigger remains attached to this function.
CREATE OR REPLACE FUNCTION public.prevent_inventory_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN RAISE EXCEPTION 'inventory_snapshots is append-only; create a new snapshot instead'; END $$;

DROP VIEW IF EXISTS public.public_building_rent_summary;
DROP VIEW IF EXISTS public.public_building_availability;
DROP VIEW IF EXISTS public.public_buildings;

CREATE VIEW public.public_buildings
WITH (security_barrier = true)
AS
SELECT
  b.id,
  b.slug,
  b.name,
  b.address,
  b.city,
  b.state,
  b.zip_code,
  b.borough,
  b.neighborhood,
  b.latitude,
  b.longitude,
  b.year_built,
  b.building_type,
  b.stories,
  b.total_units,
  b.amenities,
  b.hero_image_url,
  b.hero_image,
  b.gallery,
  b.nearby_subway,
  b.is_active,
  b.updated_at
FROM public.buildings AS b
WHERE b.is_active = true;

COMMENT ON VIEW public.public_buildings IS
  'Public building allowlist. Excludes source, verification, contact, partnership, and internal identifier fields.';

REVOKE ALL ON TABLE public.public_buildings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_buildings TO anon, authenticated;

CREATE VIEW public.public_building_availability
WITH (security_barrier = true)
AS
SELECT
  b.slug AS building_slug,
  CASE
    WHEN COUNT(DISTINCT i.unit_id) = 0 THEN 'unavailable'
    WHEN COUNT(DISTINCT i.unit_id) <= 3 THEN 'limited'
    ELSE 'available'
  END AS availability_status
FROM public.buildings AS b
LEFT JOIN public.inventory_snapshots AS i
  ON i.building_id = b.id
 AND i.inventory_status = 'available'
 AND i.valid_until IS NULL
LEFT JOIN public.units AS u
  ON u.id = i.unit_id
 AND u.is_active = true
WHERE b.is_active = true
GROUP BY b.slug;

COMMENT ON VIEW public.public_building_availability IS
  'Public coarse availability by building slug. Excludes unit identifiers, counts, rents, dates, and source metadata.';

REVOKE ALL ON TABLE public.public_building_availability FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_building_availability TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.building_rent_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  bedroom_count integer NOT NULL CHECK (bedroom_count BETWEEN 0 AND 4),
  min_base_rent numeric NOT NULL CHECK (min_base_rent > 0),
  source_url text,
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, bedroom_count)
);

ALTER TABLE public.building_rent_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.building_rent_summaries FROM PUBLIC, anon, authenticated;

CREATE VIEW public.public_building_rent_summary
WITH (security_barrier = true)
AS
WITH unit_rents AS (
  SELECT
    b.id,
    MIN(i.rent) FILTER (WHERE u.bedrooms = 0) AS studio,
    MIN(i.rent) FILTER (WHERE u.bedrooms = 1) AS one_bed,
    MIN(i.rent) FILTER (WHERE u.bedrooms = 2) AS two_bed,
    MIN(i.rent) FILTER (WHERE u.bedrooms = 3) AS three_bed
  FROM public.buildings AS b
  LEFT JOIN public.inventory_snapshots AS i
    ON i.building_id = b.id
   AND i.inventory_status = 'available'
   AND i.valid_until IS NULL
   AND i.rent > 0
  LEFT JOIN public.units AS u
    ON u.id = i.unit_id
   AND u.is_active = true
  WHERE b.is_active = true
  GROUP BY b.id
), summary_rents AS (
  SELECT
    building_id,
    MIN(min_base_rent) FILTER (WHERE bedroom_count = 0) AS studio,
    MIN(min_base_rent) FILTER (WHERE bedroom_count = 1) AS one_bed,
    MIN(min_base_rent) FILTER (WHERE bedroom_count = 2) AS two_bed,
    MIN(min_base_rent) FILTER (WHERE bedroom_count = 3) AS three_bed
  FROM public.building_rent_summaries
  GROUP BY building_id
)
SELECT
  b.slug AS building_slug,
  LEAST(u.studio, s.studio) AS studio_min_rent,
  LEAST(u.one_bed, s.one_bed) AS one_bed_min_rent,
  LEAST(u.two_bed, s.two_bed) AS two_bed_min_rent,
  LEAST(u.three_bed, s.three_bed) AS three_bed_min_rent
FROM public.buildings AS b
LEFT JOIN unit_rents AS u ON u.id = b.id
LEFT JOIN summary_rents AS s ON s.building_id = b.id
WHERE b.is_active = true;

COMMENT ON VIEW public.public_building_rent_summary IS
  'Public minimum base rent by bedroom category. Excludes unit identifiers, counts, dates, and source metadata.';

REVOKE ALL ON TABLE public.public_building_rent_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_building_rent_summary TO anon, authenticated;

ALTER TABLE public.buildings
  DROP CONSTRAINT IF EXISTS buildings_coordinates_northeast_service_area;

ALTER TABLE public.buildings
  ADD CONSTRAINT buildings_coordinates_northeast_service_area CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude IS NOT NULL AND longitude IS NOT NULL
      AND latitude BETWEEN 39 AND 43.5
      AND longitude BETWEEN -76 AND -69
    )
  ) NOT VALID;

ALTER TABLE public.buildings
  VALIDATE CONSTRAINT buildings_coordinates_northeast_service_area;

-- Reproduce the grants/default privileges observed in the remote dump. Current
-- local Supabase defaults are narrower, so these must be explicit for an exact
-- schema replay. RLS and policies continue to govern row access.
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

REVOKE ALL ON TABLE public.building_rent_summaries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.public_buildings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.public_building_availability FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.public_building_rent_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_buildings TO anon, authenticated;
GRANT SELECT ON TABLE public.public_building_availability TO anon, authenticated;
GRANT SELECT ON TABLE public.public_building_rent_summary TO anon, authenticated;

COMMIT;

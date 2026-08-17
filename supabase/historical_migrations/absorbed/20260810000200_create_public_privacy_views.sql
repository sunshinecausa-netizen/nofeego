-- Phase 1 privacy isolation: add public allowlist views only.
-- This migration intentionally does not revoke existing table access and does
-- not change the frontend. Those actions belong to the later cutover phase.

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

CREATE OR REPLACE VIEW public.public_building_availability
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

CREATE OR REPLACE VIEW public.public_building_rent_summary
WITH (security_barrier = true)
AS
SELECT
  b.slug AS building_slug,
  MIN(i.rent) FILTER (WHERE u.bedrooms = 0) AS studio_min_rent,
  MIN(i.rent) FILTER (WHERE u.bedrooms = 1) AS one_bed_min_rent,
  MIN(i.rent) FILTER (WHERE u.bedrooms = 2) AS two_bed_min_rent,
  MIN(i.rent) FILTER (WHERE u.bedrooms = 3) AS three_bed_min_rent
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
GROUP BY b.slug;

COMMENT ON VIEW public.public_building_rent_summary IS
  'Public minimum base rent by bedroom category. Excludes unit identifiers, counts, dates, and source metadata.';

REVOKE ALL ON TABLE public.public_building_rent_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_building_rent_summary TO anon, authenticated;

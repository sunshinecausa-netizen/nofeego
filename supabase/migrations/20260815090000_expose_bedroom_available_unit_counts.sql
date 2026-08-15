CREATE OR REPLACE VIEW public.public_building_unit_counts
WITH (security_barrier = true)
AS
SELECT
  b.slug AS building_slug,
  COUNT(DISTINCT u.id)::integer AS available_unit_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.bedrooms = 0)::integer AS studio_available_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.bedrooms = 1)::integer AS one_bed_available_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.bedrooms = 2)::integer AS two_bed_available_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.bedrooms = 3)::integer AS three_bed_available_count
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

COMMENT ON VIEW public.public_building_unit_counts IS
  'Public current available-unit totals by building slug and bedroom category. Excludes unit identifiers and source metadata.';

REVOKE ALL ON TABLE public.public_building_unit_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_building_unit_counts TO anon, authenticated;

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

CREATE OR REPLACE VIEW public.public_building_rent_summary
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

COMMENT ON TABLE public.building_rent_summaries IS
  'Private, source-backed minimum rent facts for buildings without publishable unit-level inventory.';
COMMENT ON VIEW public.public_building_rent_summary IS
  'Public minimum base rent by bedroom category. Excludes unit identifiers, counts, dates, and source metadata.';

REVOKE ALL ON TABLE public.public_building_rent_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_building_rent_summary TO anon, authenticated;

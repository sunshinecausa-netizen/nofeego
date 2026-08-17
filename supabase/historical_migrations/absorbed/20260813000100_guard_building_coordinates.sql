-- Reject sentinel and out-of-service-area coordinates before they can reach the map.
-- Null coordinate pairs remain allowed while a building is awaiting geocoding.
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

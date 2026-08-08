-- NoFeeGo Database V2: additive, backwards-compatible expansion.
-- Rollback policy: disable new writers, retain populated columns/tables, then drop only after export.

DO $$ BEGIN
  CREATE TYPE partnership_status AS ENUM ('Not Contacted', 'Contacted', 'Negotiating', 'Partner', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE data_confidence AS ENUM ('High', 'Medium', 'Low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS building_id text,
  ADD COLUMN IF NOT EXISTS building_name text,
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS building_class text,
  ADD COLUMN IF NOT EXISTS stories integer,
  ADD COLUMN IF NOT EXISTS total_units integer,
  ADD COLUMN IF NOT EXISTS luxury boolean,
  ADD COLUMN IF NOT EXISTS pet_friendly boolean,
  ADD COLUMN IF NOT EXISTS official_building_website text,
  ADD COLUMN IF NOT EXISTS apply_online_url text,
  ADD COLUMN IF NOT EXISTS virtual_tour_url text,
  ADD COLUMN IF NOT EXISTS building_phone text,
  ADD COLUMN IF NOT EXISTS building_leasing_email text,
  ADD COLUMN IF NOT EXISTS management_company text,
  ADD COLUMN IF NOT EXISTS developer text,
  ADD COLUMN IF NOT EXISTS current_owner text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS last_verified_date date,
  ADD COLUMN IF NOT EXISTS borough text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS gallery_folder text,
  ADD COLUMN IF NOT EXISTS partnership_status partnership_status NOT NULL DEFAULT 'Not Contacted',
  ADD COLUMN IF NOT EXISTS leasing_contact_name text,
  ADD COLUMN IF NOT EXISTS leasing_phone text,
  ADD COLUMN IF NOT EXISTS data_confidence data_confidence NOT NULL DEFAULT 'Low',
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.buildings
SET building_name = COALESCE(building_name, name),
    street_address = COALESCE(street_address, address),
    stories = COALESCE(stories, floors),
    hero_image_url = COALESCE(hero_image_url, hero_image),
    building_phone = COALESCE(building_phone, contact_phone),
    leasing_phone = COALESCE(leasing_phone, contact_phone),
    building_leasing_email = COALESCE(building_leasing_email, contact_email)
WHERE building_name IS NULL OR street_address IS NULL OR stories IS NULL
   OR hero_image_url IS NULL OR building_phone IS NULL OR leasing_phone IS NULL
   OR building_leasing_email IS NULL;

DO $$ BEGIN
  ALTER TABLE public.buildings ADD CONSTRAINT buildings_building_id_key UNIQUE (building_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildings_slug_unique ON public.buildings (slug);
CREATE INDEX IF NOT EXISTS idx_buildings_building_name ON public.buildings (building_name);
CREATE INDEX IF NOT EXISTS idx_buildings_borough ON public.buildings (borough);
CREATE INDEX IF NOT EXISTS idx_buildings_neighborhood_text ON public.buildings (neighborhood);
CREATE INDEX IF NOT EXISTS idx_buildings_coordinates ON public.buildings (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buildings_active ON public.buildings (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_buildings_search_keywords ON public.buildings USING gin (search_keywords);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildings_google_place_id_unique ON public.buildings (google_place_id) WHERE google_place_id IS NOT NULL;

ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_total_units_nonnegative;
ALTER TABLE public.buildings ADD CONSTRAINT buildings_total_units_nonnegative CHECK (total_units IS NULL OR total_units >= 0);
ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_stories_positive;
ALTER TABLE public.buildings ADD CONSTRAINT buildings_stories_positive CHECK (stories IS NULL OR stories > 0);

CREATE OR REPLACE FUNCTION public.sync_building_v1_v2_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.name := COALESCE(NULLIF(NEW.building_name, ''), NEW.name);
  NEW.building_name := COALESCE(NULLIF(NEW.building_name, ''), NEW.name);
  NEW.address := COALESCE(NULLIF(NEW.street_address, ''), NEW.address);
  NEW.street_address := COALESCE(NULLIF(NEW.street_address, ''), NEW.address);
  NEW.floors := COALESCE(NEW.stories, NEW.floors);
  NEW.stories := COALESCE(NEW.stories, NEW.floors);
  NEW.hero_image := COALESCE(NEW.hero_image_url, NEW.hero_image);
  NEW.hero_image_url := COALESCE(NEW.hero_image_url, NEW.hero_image);
  NEW.contact_phone := COALESCE(NEW.leasing_phone, NEW.building_phone, NEW.contact_phone);
  NEW.leasing_phone := COALESCE(NEW.leasing_phone, NEW.building_phone, NEW.contact_phone);
  NEW.building_phone := COALESCE(NEW.building_phone, NEW.leasing_phone, NEW.contact_phone);
  NEW.contact_email := COALESCE(NEW.building_leasing_email, NEW.contact_email);
  NEW.building_leasing_email := COALESCE(NEW.building_leasing_email, NEW.contact_email);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS buildings_sync_v1_v2 ON public.buildings;
CREATE TRIGGER buildings_sync_v1_v2 BEFORE INSERT OR UPDATE ON public.buildings
FOR EACH ROW EXECUTE FUNCTION public.sync_building_v1_v2_columns();

CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  legacy_listing_id uuid UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
  unit_number text,
  rent integer NOT NULL CHECK (rent >= 0),
  bedrooms numeric(3,1) NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms numeric(3,1) NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  square_feet integer CHECK (square_feet IS NULL OR square_feet > 0),
  available_date date,
  lease_term integer CHECK (lease_term IS NULL OR lease_term > 0),
  floor integer,
  broker_fee numeric(10,2) CHECK (broker_fee IS NULL OR broker_fee >= 0),
  is_no_fee boolean,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','leased','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_units_building ON public.units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_search ON public.units(building_id, status, rent, bedrooms, available_date);
CREATE INDEX IF NOT EXISTS idx_units_available ON public.units(available_date) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_units_building_number ON public.units(building_id, unit_number) WHERE unit_number IS NOT NULL;

INSERT INTO public.units (building_id, legacy_listing_id, unit_number, rent, bedrooms, bathrooms, square_feet, available_date, lease_term, status, created_at, updated_at)
SELECT building_id, id, unit_number, price, bedrooms, bathrooms, sqft, move_in_date, lease_term_months,
       CASE WHEN status IN ('active','pending','inactive') THEN status ELSE 'inactive' END, created_at, updated_at
FROM public.listings WHERE building_id IS NOT NULL
ON CONFLICT (legacy_listing_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.building_amenities (
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (building_id, amenity_id)
);
CREATE INDEX IF NOT EXISTS idx_building_amenities_amenity ON public.building_amenities(amenity_id, building_id);

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_hero boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, photo_url)
);
CREATE INDEX IF NOT EXISTS idx_photos_building_order ON public.photos(building_id, is_hero DESC, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_one_hero ON public.photos(building_id) WHERE is_hero;

CREATE TABLE IF NOT EXISTS public.transit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  subway_lines text[] NOT NULL DEFAULT '{}',
  walking_minutes integer CHECK (walking_minutes IS NULL OR walking_minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(building_id, station_name)
);
CREATE INDEX IF NOT EXISTS idx_transit_building_walk ON public.transit(building_id, walking_minutes);
CREATE INDEX IF NOT EXISTS idx_transit_lines ON public.transit USING gin(subway_lines);

ALTER TABLE public.neighborhoods ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_neighborhoods_borough_name ON public.neighborhoods(borough, name);

ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE;
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, filters jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL, unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.building_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5), review_text text, status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, building_id)
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_units" ON public.units FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "public_read_building_amenities" ON public.building_amenities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_photos" ON public.photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_transit" ON public.transit FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users_read_self" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "saved_searches_owner_all" ON public.saved_searches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transit_updated_at BEFORE UPDATE ON public.transit FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER saved_searches_updated_at BEFORE UPDATE ON public.saved_searches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inquiries_updated_at BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER building_reviews_updated_at BEFORE UPDATE ON public.building_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

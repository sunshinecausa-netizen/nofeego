-- NoFeeGo empty-project bootstrap: schema only.
-- Candidate for isolated review/deployment. Never place this beside legacy migrations.

BEGIN;

CREATE TYPE public.partnership_status AS ENUM ('Not Contacted', 'Contacted', 'Negotiating', 'Partner', 'Inactive');
CREATE TYPE public.data_confidence AS ENUM ('High', 'Medium', 'Low');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text, email text, is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
  borough text NOT NULL DEFAULT 'Manhattan', description text, avg_rent integer,
  latitude numeric(9,6), longitude numeric(9,6), hero_image text, highlights text[],
  seo_title text, seo_description text, faqs jsonb, restaurants text[], coffee_shops text[],
  parks text[], schools text[], lifestyle text[], transportation text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT neighborhoods_borough_name_key UNIQUE (borough, name)
);

CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id text NOT NULL UNIQUE, slug text NOT NULL UNIQUE,
  name text NOT NULL, building_name text NOT NULL,
  neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE SET NULL,
  address text NOT NULL, street_address text NOT NULL, address_line_2 text,
  city text NOT NULL DEFAULT 'New York', state text NOT NULL DEFAULT 'NY', zip_code text,
  country_code text DEFAULT 'US', latitude numeric(9,6), longitude numeric(9,6),
  description text, building_type text, building_class text, amenities text[],
  year_built integer, floors integer, stories integer, total_units integer,
  luxury boolean, pet_friendly boolean, hero_image text, gallery text[],
  hero_image_url text, logo_url text, gallery_folder text,
  seo_title text, seo_description text, faqs jsonb,
  nearby_subway text[], nearby_grocery text[], nearby_restaurants text[], transportation text[],
  neighborhood_summary text, contact_email text, contact_phone text,
  official_building_website text, apply_online_url text, virtual_tour_url text,
  building_phone text, building_leasing_email text, management_company text,
  developer text, current_owner text, source_url text, last_verified_date date,
  borough text, neighborhood text, search_keywords text[] NOT NULL DEFAULT '{}',
  google_place_id text, partnership_status public.partnership_status NOT NULL DEFAULT 'Not Contacted',
  leasing_contact_name text, leasing_phone text,
  data_confidence public.data_confidence NOT NULL DEFAULT 'Low', ai_summary text,
  market_segment text, publication_status text, data_quality_status text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buildings_country_code_format CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT buildings_total_units_nonnegative CHECK (total_units IS NULL OR total_units >= 0),
  CONSTRAINT buildings_stories_positive CHECK (stories IS NULL OR stories > 0)
);

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, title text NOT NULL,
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE SET NULL,
  unit_number text, price integer NOT NULL, bedrooms numeric(2,1) NOT NULL DEFAULT 0,
  bathrooms numeric(2,1) NOT NULL DEFAULT 1, sqft integer,
  furnished boolean NOT NULL DEFAULT false, pet_policy text NOT NULL DEFAULT 'pets_allowed',
  move_in_date date, lease_term_months integer, listing_type text NOT NULL DEFAULT 'rental',
  status text NOT NULL DEFAULT 'active', description text, images text[], amenities text[],
  latitude numeric(9,6), longitude numeric(9,6), seo_title text, seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  icon text, category text NOT NULL DEFAULT 'general', created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  url text NOT NULL, caption text, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text UNIQUE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  legacy_listing_id uuid UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
  source_id uuid, unit_number text, unit_reference text, unit_type text, floorplan_name text,
  bedrooms numeric(3,1) CHECK (bedrooms IS NULL OR bedrooms >= 0),
  bathrooms numeric(3,1) CHECK (bathrooms IS NULL OR bathrooms >= 0),
  square_feet integer CHECK (square_feet IS NULL OR square_feet > 0),
  square_feet_min integer CHECK (square_feet_min IS NULL OR square_feet_min > 0),
  square_feet_max integer CHECK (square_feet_max IS NULL OR square_feet_max > 0),
  floor integer, floorplan_url text, has_in_unit_wd boolean, is_furnished boolean,
  accessible_unit boolean, rent integer CHECK (rent IS NULL OR rent >= 0), available_date date,
  lease_term integer CHECK (lease_term IS NULL OR lease_term > 0),
  broker_fee numeric(10,2) CHECK (broker_fee IS NULL OR broker_fee >= 0), is_no_fee boolean,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','leased','inactive')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT units_square_feet_range CHECK (square_feet_min IS NULL OR square_feet_max IS NULL OR square_feet_max >= square_feet_min)
);

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), import_batch_id text NOT NULL UNIQUE,
  source_type text NOT NULL, file_name text NOT NULL, file_checksum text,
  import_mode text NOT NULL, status text NOT NULL, started_at timestamptz, completed_at timestamptz,
  total_rows integer CHECK (total_rows IS NULL OR total_rows >= 0),
  valid_rows integer CHECK (valid_rows IS NULL OR valid_rows >= 0),
  inserted_rows integer CHECK (inserted_rows IS NULL OR inserted_rows >= 0),
  updated_rows integer CHECK (updated_rows IS NULL OR updated_rows >= 0),
  skipped_rows integer CHECK (skipped_rows IS NULL OR skipped_rows >= 0),
  error_rows integer CHECK (error_rows IS NULL OR error_rows >= 0),
  duplicate_candidates integer CHECK (duplicate_candidates IS NULL OR duplicate_candidates >= 0),
  error_summary jsonb, report_path text, initiated_by text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_batches_completed_after_started CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE public.building_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_entry_id text NOT NULL UNIQUE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  source_type text NOT NULL, source_name text, source_record_id text, source_url text NOT NULL,
  source_updated_at timestamptz, retrieved_at timestamptz, last_verified_at timestamptz,
  verification_status text, usage_rights text, display_permission text,
  source_priority integer CHECK (source_priority IS NULL OR source_priority >= 0),
  raw_payload jsonb, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.units ADD CONSTRAINT units_source_id_fkey
  FOREIGN KEY (source_id) REFERENCES public.building_sources(id) ON DELETE SET NULL;

CREATE TABLE public.inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  source_record_id text NOT NULL, rent numeric(12,2) CHECK (rent IS NULL OR rent >= 0),
  concession_text text, concession_amount numeric(12,2) CHECK (concession_amount IS NULL OR concession_amount >= 0),
  net_effective_rent numeric(12,2) CHECK (net_effective_rent IS NULL OR net_effective_rent >= 0),
  available_date date, is_no_fee boolean,
  inventory_status text NOT NULL CHECK (inventory_status IN ('available','pending','leased','unavailable','unknown')),
  captured_at timestamptz NOT NULL, valid_from timestamptz, valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_snapshots_valid_range CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
  CONSTRAINT inventory_snapshots_identity_key UNIQUE (unit_id, source_record_id, captured_at)
);

CREATE TABLE public.building_amenity_links (
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (building_id, amenity_id)
);

CREATE TABLE public.building_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amenity_record_id text NOT NULL UNIQUE,
  building_id uuid NOT NULL UNIQUE REFERENCES public.buildings(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.building_sources(id) ON DELETE SET NULL,
  pets_allowed boolean, dogs_allowed boolean, cats_allowed boolean, pet_policy_text text,
  elevator boolean, gym boolean, doorman boolean, concierge boolean,
  laundry_in_building boolean, in_unit_wd_available boolean, roof_deck boolean,
  outdoor_space boolean, pool boolean, parking boolean, bike_storage boolean,
  package_room boolean, storage_available boolean, coworking_space boolean,
  lounge boolean, playroom boolean, wheelchair_accessible boolean, smoke_free boolean,
  amenities_text text, last_verified_at timestamptz, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  photo_url text NOT NULL, caption text, display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_hero boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photos_building_url_key UNIQUE (building_id, photo_url)
);

CREATE TABLE public.transit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  station_name text NOT NULL, subway_lines text[] NOT NULL DEFAULT '{}',
  walking_minutes integer CHECK (walking_minutes IS NULL OR walking_minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transit_building_station_key UNIQUE (building_id, station_name)
);

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT favorites_user_listing_key UNIQUE (user_id, listing_id)
);

CREATE TABLE public.property_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_data jsonb NOT NULL, status text NOT NULL DEFAULT 'pending',
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.building_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5), review_text text,
  status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT building_reviews_user_building_key UNIQUE (user_id, building_id)
);

CREATE UNIQUE INDEX idx_buildings_google_place_id_unique ON public.buildings(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX idx_neighborhoods_slug ON public.neighborhoods(slug);
CREATE INDEX idx_buildings_neighborhood ON public.buildings(neighborhood_id);
CREATE INDEX idx_buildings_building_name ON public.buildings(building_name);
CREATE INDEX idx_buildings_borough ON public.buildings(borough);
CREATE INDEX idx_buildings_neighborhood_text ON public.buildings(neighborhood);
CREATE INDEX idx_buildings_coordinates ON public.buildings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_buildings_active ON public.buildings(is_active) WHERE is_active;
CREATE INDEX idx_buildings_search_keywords ON public.buildings USING gin(search_keywords);
CREATE INDEX idx_buildings_publication_status ON public.buildings(publication_status);
CREATE INDEX idx_buildings_data_quality_status ON public.buildings(data_quality_status);
CREATE INDEX idx_listings_price ON public.listings(price);
CREATE INDEX idx_listings_bedrooms ON public.listings(bedrooms);
CREATE INDEX idx_listings_neighborhood ON public.listings(neighborhood_id);
CREATE INDEX idx_listings_building ON public.listings(building_id);
CREATE INDEX idx_listings_type ON public.listings(listing_type);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_move_in ON public.listings(move_in_date);
CREATE INDEX idx_listing_images_listing ON public.listing_images(listing_id);
CREATE INDEX idx_units_building ON public.units(building_id);
CREATE INDEX idx_units_search ON public.units(building_id, status, rent, bedrooms, available_date);
CREATE INDEX idx_units_available ON public.units(available_date) WHERE status = 'active';
CREATE UNIQUE INDEX idx_units_building_number ON public.units(building_id, unit_number) WHERE unit_number IS NOT NULL;
CREATE INDEX idx_units_source_id ON public.units(source_id);
CREATE INDEX idx_units_import_identity ON public.units(building_id, unit_reference);
CREATE INDEX idx_import_batches_status_created ON public.import_batches(status, created_at DESC);
CREATE INDEX idx_import_batches_checksum ON public.import_batches(file_checksum) WHERE file_checksum IS NOT NULL;
CREATE UNIQUE INDEX idx_building_sources_natural_record ON public.building_sources(building_id, source_type, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX idx_building_sources_building ON public.building_sources(building_id, is_active);
CREATE INDEX idx_building_sources_batch ON public.building_sources(import_batch_id);
CREATE INDEX idx_building_sources_verified ON public.building_sources(last_verified_at DESC);
CREATE INDEX idx_inventory_snapshots_building_id ON public.inventory_snapshots(building_id);
CREATE INDEX idx_inventory_snapshots_unit_id ON public.inventory_snapshots(unit_id);
CREATE INDEX idx_inventory_snapshots_source_id ON public.inventory_snapshots(source_id);
CREATE INDEX idx_inventory_snapshots_captured_at ON public.inventory_snapshots(captured_at DESC);
CREATE INDEX idx_inventory_snapshots_available_date ON public.inventory_snapshots(available_date);
CREATE INDEX idx_inventory_snapshots_current ON public.inventory_snapshots(building_id, inventory_status, available_date, captured_at DESC) WHERE valid_until IS NULL AND inventory_status = 'available';
CREATE INDEX idx_inventory_snapshots_unit_history ON public.inventory_snapshots(unit_id, captured_at DESC);
CREATE INDEX idx_building_amenity_links_amenity ON public.building_amenity_links(amenity_id, building_id);
CREATE INDEX idx_building_amenities_source_id ON public.building_amenities(source_id);
CREATE INDEX idx_building_amenities_active ON public.building_amenities(building_id, is_active);
CREATE INDEX idx_photos_building_order ON public.photos(building_id, is_hero DESC, display_order);
CREATE UNIQUE INDEX idx_photos_one_hero ON public.photos(building_id) WHERE is_hero;
CREATE INDEX idx_transit_building_walk ON public.transit(building_id, walking_minutes);
CREATE INDEX idx_transit_lines ON public.transit USING gin(subway_lines);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_listing ON public.favorites(listing_id);
CREATE INDEX idx_submissions_status ON public.property_submissions(status);
CREATE INDEX idx_submissions_user ON public.property_submissions(user_id);

CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE FUNCTION public.sync_building_v1_v2_columns() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.name := COALESCE(NULLIF(NEW.building_name, ''), NEW.name);
  NEW.building_name := COALESCE(NULLIF(NEW.building_name, ''), NEW.name);
  NEW.address := COALESCE(NULLIF(NEW.street_address, ''), NEW.address);
  NEW.street_address := COALESCE(NULLIF(NEW.street_address, ''), NEW.address);
  NEW.floors := COALESCE(NEW.stories, NEW.floors); NEW.stories := COALESCE(NEW.stories, NEW.floors);
  NEW.hero_image := COALESCE(NEW.hero_image_url, NEW.hero_image); NEW.hero_image_url := COALESCE(NEW.hero_image_url, NEW.hero_image);
  NEW.contact_phone := COALESCE(NEW.leasing_phone, NEW.building_phone, NEW.contact_phone);
  NEW.leasing_phone := COALESCE(NEW.leasing_phone, NEW.building_phone, NEW.contact_phone);
  NEW.building_phone := COALESCE(NEW.building_phone, NEW.leasing_phone, NEW.contact_phone);
  NEW.contact_email := COALESCE(NEW.building_leasing_email, NEW.contact_email);
  NEW.building_leasing_email := COALESCE(NEW.building_leasing_email, NEW.contact_email);
  RETURN NEW;
END $$;
CREATE FUNCTION public.prevent_inventory_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'inventory_snapshots is append-only; create a new snapshot instead'; END $$;

CREATE TRIGGER buildings_sync_v1_v2 BEFORE INSERT OR UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.sync_building_v1_v2_columns();
CREATE TRIGGER inventory_snapshots_append_only BEFORE UPDATE OR DELETE ON public.inventory_snapshots FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_snapshot_mutation();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER neighborhoods_updated_at BEFORE UPDATE ON public.neighborhoods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER buildings_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transit_updated_at BEFORE UPDATE ON public.transit FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER saved_searches_updated_at BEFORE UPDATE ON public.saved_searches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inquiries_updated_at BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER building_reviews_updated_at BEFORE UPDATE ON public.building_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER property_submissions_updated_at BEFORE UPDATE ON public.property_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER import_batches_updated_at BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER building_sources_updated_at BEFORE UPDATE ON public.building_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER building_amenities_updated_at BEFORE UPDATE ON public.building_amenities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY; ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY; ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY; ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_sources ENABLE ROW LEVEL SECURITY; ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_amenity_links ENABLE ROW LEVEL SECURITY; ALTER TABLE public.building_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY; ALTER TABLE public.transit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY; ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY; ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_own_profile ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY update_own_profile ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY insert_own_profile ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY admin_read_profiles ON public.profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));
CREATE POLICY public_read_neighborhoods ON public.neighborhoods FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_write_neighborhoods ON public.neighborhoods FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY public_read_buildings ON public.buildings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_write_buildings ON public.buildings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY public_read_listings ON public.listings FOR SELECT TO anon, authenticated USING (status='active');
CREATE POLICY admin_read_all_listings ON public.listings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY auth_insert_listings ON public.listings FOR INSERT TO authenticated WITH CHECK (status='pending' OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY admin_modify_listings ON public.listings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY admin_delete_listings ON public.listings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY public_read_amenities ON public.amenities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_write_amenities ON public.amenities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY public_read_listing_images ON public.listing_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_write_listing_images ON public.listing_images FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY public_read_active_units ON public.units FOR SELECT TO anon, authenticated USING (status='active');
CREATE POLICY public_read_building_amenity_links ON public.building_amenity_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_building_amenities ON public.building_amenities FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY public_read_inventory_snapshots ON public.inventory_snapshots FOR SELECT TO anon, authenticated USING (inventory_status='available' AND valid_until IS NULL);
CREATE POLICY public_read_photos ON public.photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_transit ON public.transit FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY select_own_favorites ON public.favorites FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY insert_own_favorites ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY delete_own_favorites ON public.favorites FOR DELETE TO authenticated USING (auth.uid()=user_id);
CREATE POLICY select_own_submissions ON public.property_submissions FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY admin_read_submissions ON public.property_submissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY insert_own_submissions ON public.property_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY admin_modify_submissions ON public.property_submissions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY admin_delete_submissions ON public.property_submissions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_admin));
CREATE POLICY users_read_self ON public.users FOR SELECT TO authenticated USING (auth.uid()=id);
CREATE POLICY saved_searches_owner_all ON public.saved_searches FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

COMMENT ON TABLE public.building_amenity_links IS 'Legacy controlled-vocabulary building-to-amenity links; retained without seed data.';
COMMENT ON TABLE public.building_amenities IS 'One nullable-boolean amenity profile per building from Amenity_Master.';
COMMENT ON TABLE public.inventory_snapshots IS 'Append-only unit inventory, pricing and availability history.';
COMMENT ON COLUMN public.units.unit_id IS 'Stable Unit ID from Unit_Master; units stores structural facts only for new writes.';

COMMIT;

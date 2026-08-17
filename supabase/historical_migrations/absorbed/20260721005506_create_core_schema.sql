/*
# Create core schema for Manhattan apartment rental platform

1. Overview
   This migration creates the foundational tables for a Manhattan apartment rental
   platform inspired by Highline Residential, Apartments.com, and Uhomes.
   It establishes profiles, neighborhoods, buildings, and listings (apartments) with
   SEO-friendly slugs, geographic coordinates for Google Maps integration,
   and flexible filtering fields (price, bedrooms, bathrooms, pet policy,
   furnished, move-in date, lease term, listing type).

2. New Tables (created in dependency order)
   - `profiles`: Extends auth.users with display name and admin flag for the
     admin dashboard access control. Created FIRST because other RLS policies
     reference it for admin checks.
   - `neighborhoods`: Manhattan neighborhoods (e.g., Upper East Side, West Village)
     with slug, borough, description, average rent, centroid lat/lng, hero image,
     and SEO metadata.
   - `buildings`: Physical buildings with slug, name, neighborhood FK, address,
     lat/lng, building type, amenities, year built, floors, hero image, and SEO metadata.
   - `listings`: Individual apartment units for rent, with slug, building FK,
     neighborhood FK, price, bedrooms, bathrooms, sqft, furnished, pet policy,
     move-in date, lease term, listing type (rental, short_stay, shared_living),
     status (active, pending, inactive), images, amenities, and SEO metadata.

3. Security (RLS)
   - Enable RLS on all tables.
   - neighborhoods, buildings: public read (anon + authenticated); admin-only writes.
   - listings: public read for active rows; admin read for all; authenticated insert
     (for "List Your Property" submissions); admin update/delete.
   - profiles: users read/update own row; admins read all.

4. Indexes
   - listings: price, bedrooms, bathrooms, neighborhood_id, building_id,
     listing_type, status, move_in_date for fast filtering.
   - buildings: neighborhood_id, slug.
   - neighborhoods: slug.

5. Important Notes
   - profiles is created first because RLS policies on other tables check
     `profiles.is_admin` via EXISTS subquery.
   - All slugs are UNIQUE for SEO-friendly URLs.
   - listing_type distinguishes rentals, short stays, and shared living.
   - status 'pending' is used for "List Your Property" submissions awaiting admin approval.
   - A trigger auto-creates a profile row on signup.
*/

-- ==========================================
-- PROFILES (extends auth.users) — created first
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile"
ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_read_profiles" ON profiles;
CREATE POLICY "admin_read_profiles"
ON profiles FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- ==========================================
-- NEIGHBORHOODS
-- ==========================================
CREATE TABLE IF NOT EXISTS neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  borough text NOT NULL DEFAULT 'Manhattan',
  description text,
  avg_rent integer,
  latitude numeric(9,6),
  longitude numeric(9,6),
  hero_image text,
  highlights text[],
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_neighborhoods" ON neighborhoods;
CREATE POLICY "public_read_neighborhoods"
ON neighborhoods FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_neighborhoods" ON neighborhoods;
CREATE POLICY "admin_insert_neighborhoods"
ON neighborhoods FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_update_neighborhoods" ON neighborhoods;
CREATE POLICY "admin_update_neighborhoods"
ON neighborhoods FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_delete_neighborhoods" ON neighborhoods;
CREATE POLICY "admin_delete_neighborhoods"
ON neighborhoods FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_neighborhoods_slug ON neighborhoods (slug);

-- ==========================================
-- BUILDINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  neighborhood_id uuid REFERENCES neighborhoods(id) ON DELETE SET NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'New York',
  state text NOT NULL DEFAULT 'NY',
  zip_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  description text,
  building_type text,
  amenities text[],
  year_built integer,
  floors integer,
  hero_image text,
  gallery text[],
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_buildings" ON buildings;
CREATE POLICY "public_read_buildings"
ON buildings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_buildings" ON buildings;
CREATE POLICY "admin_insert_buildings"
ON buildings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_update_buildings" ON buildings;
CREATE POLICY "admin_update_buildings"
ON buildings FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_delete_buildings" ON buildings;
CREATE POLICY "admin_delete_buildings"
ON buildings FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_buildings_slug ON buildings (slug);
CREATE INDEX IF NOT EXISTS idx_buildings_neighborhood ON buildings (neighborhood_id);

-- ==========================================
-- LISTINGS (apartments)
-- ==========================================
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
  neighborhood_id uuid REFERENCES neighborhoods(id) ON DELETE SET NULL,
  unit_number text,
  price integer NOT NULL,
  bedrooms numeric(2,1) NOT NULL DEFAULT 0,
  bathrooms numeric(2,1) NOT NULL DEFAULT 1,
  sqft integer,
  furnished boolean NOT NULL DEFAULT false,
  pet_policy text NOT NULL DEFAULT 'pets_allowed',
  move_in_date date,
  lease_term_months integer,
  listing_type text NOT NULL DEFAULT 'rental',
  status text NOT NULL DEFAULT 'active',
  description text,
  images text[],
  amenities text[],
  latitude numeric(9,6),
  longitude numeric(9,6),
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public read: only active listings visible to anon/public
DROP POLICY IF EXISTS "public_read_listings" ON listings;
CREATE POLICY "public_read_listings"
ON listings FOR SELECT
TO anon, authenticated USING (status = 'active');

-- Admin can read all listings (including pending/inactive)
DROP POLICY IF EXISTS "admin_read_all_listings" ON listings;
CREATE POLICY "admin_read_all_listings"
ON listings FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Any authenticated user can insert (for "List Your Property" submissions, defaults to pending)
DROP POLICY IF EXISTS "auth_insert_listings" ON listings;
CREATE POLICY "auth_insert_listings"
ON listings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin can update any listing (approve, edit, toggle status)
DROP POLICY IF EXISTS "admin_update_listings" ON listings;
CREATE POLICY "admin_update_listings"
ON listings FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Admin can delete listings
DROP POLICY IF EXISTS "admin_delete_listings" ON listings;
CREATE POLICY "admin_delete_listings"
ON listings FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings (slug);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_bedrooms ON listings (bedrooms);
CREATE INDEX IF NOT EXISTS idx_listings_neighborhood ON listings (neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_listings_building ON listings (building_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings (listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_move_in ON listings (move_in_date);

-- ==========================================
-- TRIGGER: auto-create profile on signup
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- UPDATED_AT triggers
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS neighborhoods_updated_at ON neighborhoods;
CREATE TRIGGER neighborhoods_updated_at
BEFORE UPDATE ON neighborhoods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS buildings_updated_at ON buildings;
CREATE TRIGGER buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS listings_updated_at ON listings;
CREATE TRIGGER listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

/*
# Extend schema: amenities, images, favorites, property_submissions + content fields

1. Overview
   Extends the existing schema with new tables and additional content columns
   to support the full rental platform spec: amenities catalog, image gallery,
   user favorites, property submissions, and rich content for buildings
   (FAQs, nearby places, transportation) and neighborhoods (restaurants,
   coffee shops, parks, schools, lifestyle, FAQs).

2. New Tables
   - `amenities`: Catalog of all available amenities with icon names and categories.
   - `listing_images`: Structured image storage for listings (replacing the text[]
     array approach with a proper table for ordering and metadata).
   - `favorites`: User's saved/favorited listings.
   - `property_submissions`: User-submitted properties awaiting admin approval.
     These are separate from `listings` so pending submissions never appear in
     search until an admin converts them to an active listing.

3. Modified Tables
   - `buildings`: Added `faqs` (jsonb), `nearby_subway` (text[]), `nearby_grocery`
     (text[]), `nearby_restaurants` (text[]), `transportation` (text[]),
     `neighborhood_summary` (text), `contact_email`, `contact_phone`.
   - `neighborhoods`: Added `faqs` (jsonb), `restaurants` (text[]), `coffee_shops`
     (text[]), `parks` (text[]), `schools` (text[]), `lifestyle` (text[]),
     `transportation` (text[]).

4. Security (RLS)
   - amenities: public read, admin write.
   - listing_images: public read, admin write.
   - favorites: authenticated read/insert/update/delete, owner-scoped (auth.uid = user_id).
   - property_submissions: authenticated insert (own only), admin read all,
     admin update/delete.

5. Important Notes
   - Uses ADD COLUMN IF NOT EXISTS for idempotency.
   - All new functions have SET search_path = public.
   - Favorites use a composite unique constraint on (user_id, listing_id).
   - property_submissions stores raw form data as jsonb for flexibility.
*/

-- ==========================================
-- AMENITIES (catalog)
-- ==========================================
CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_amenities" ON amenities;
CREATE POLICY "public_read_amenities"
ON amenities FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_amenities" ON amenities;
CREATE POLICY "admin_insert_amenities"
ON amenities FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_update_amenities" ON amenities;
CREATE POLICY "admin_update_amenities"
ON amenities FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_delete_amenities" ON amenities;
CREATE POLICY "admin_delete_amenities"
ON amenities FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Seed common amenities
INSERT INTO amenities (name, icon, category) VALUES
('Doorman', 'user', 'building'),
('Elevator', 'arrow-up', 'building'),
('Fitness Center', 'dumbbell', 'building'),
('Laundry', 'washing-machine', 'building'),
('Parking', 'car', 'building'),
('Roof Deck', 'sun', 'building'),
('Concierge', 'bell-ring', 'building'),
('Storage', 'package', 'building'),
('Bike Room', 'bike', 'building'),
('Pool', 'waves', 'building'),
('Pet Friendly', 'paw-print', 'building'),
('Central AC', 'wind', 'apartment'),
('Dishwasher', 'utensils', 'apartment'),
('Hardwood Floors', 'square', 'apartment'),
('High Ceilings', 'ruler', 'apartment'),
('Exposed Brick', 'brick', 'apartment'),
('Walk-in Closet', 'shirt', 'apartment'),
('Wine Cooler', 'wine', 'apartment'),
('In-unit Laundry', 'washing-machine', 'apartment'),
('Balcony', 'balcony', 'apartment'),
('City Views', 'building', 'apartment'),
('Park Views', 'trees', 'apartment'),
('Water Views', 'waves', 'apartment')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- LISTING IMAGES (structured gallery)
-- ==========================================
CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_listing_images" ON listing_images;
CREATE POLICY "public_read_listing_images"
ON listing_images FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_listing_images" ON listing_images;
CREATE POLICY "admin_insert_listing_images"
ON listing_images FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_update_listing_images" ON listing_images;
CREATE POLICY "admin_update_listing_images"
ON listing_images FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_delete_listing_images" ON listing_images;
CREATE POLICY "admin_delete_listing_images"
ON listing_images FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images (listing_id);

-- ==========================================
-- FAVORITES
-- ==========================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites"
ON favorites FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites"
ON favorites FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites"
ON favorites FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites (listing_id);

-- ==========================================
-- PROPERTY SUBMISSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS property_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE property_submissions ENABLE ROW LEVEL SECURITY;

-- Owner can read their own submissions
DROP POLICY IF EXISTS "select_own_submissions" ON property_submissions;
CREATE POLICY "select_own_submissions"
ON property_submissions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

-- Admin can read all submissions
DROP POLICY IF EXISTS "admin_read_submissions" ON property_submissions;
CREATE POLICY "admin_read_submissions"
ON property_submissions FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Any authenticated user can insert their own submission
DROP POLICY IF EXISTS "insert_own_submissions" ON property_submissions;
CREATE POLICY "insert_own_submissions"
ON property_submissions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin can update submissions (approve/reject)
DROP POLICY IF EXISTS "admin_update_submissions" ON property_submissions;
CREATE POLICY "admin_update_submissions"
ON property_submissions FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Admin can delete submissions
DROP POLICY IF EXISTS "admin_delete_submissions" ON property_submissions;
CREATE POLICY "admin_delete_submissions"
ON property_submissions FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_submissions_status ON property_submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON property_submissions (user_id);

-- ==========================================
-- ADD COLUMNS TO BUILDINGS
-- ==========================================
DO $$ BEGIN
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS faqs jsonb;
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nearby_subway text[];
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nearby_grocery text[];
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nearby_restaurants text[];
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS transportation text[];
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS neighborhood_summary text;
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS contact_email text;
  ALTER TABLE buildings ADD COLUMN IF NOT EXISTS contact_phone text;
END $$;

-- ==========================================
-- ADD COLUMNS TO NEIGHBORHOODS
-- ==========================================
DO $$ BEGIN
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS faqs jsonb;
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS restaurants text[];
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS coffee_shops text[];
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS parks text[];
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS schools text[];
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS lifestyle text[];
  ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS transportation text[];
END $$;

-- ==========================================
-- UPDATED_AT trigger for property_submissions
-- ==========================================
DROP TRIGGER IF EXISTS property_submissions_updated_at ON property_submissions;
CREATE TRIGGER property_submissions_updated_at
BEFORE UPDATE ON property_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

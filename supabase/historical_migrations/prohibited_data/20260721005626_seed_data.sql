/*
# Seed Manhattan neighborhoods, buildings, and listings

1. Overview
   Seeds the database with real Manhattan neighborhoods, sample buildings,
   and apartment listings so the platform has content on first load.
   All data uses real geographic coordinates for Google Maps integration.

2. Data Inserted
   - 10 Manhattan neighborhoods with slugs, descriptions, average rents,
     centroid coordinates, hero images, and highlights.
   - 15 buildings across neighborhoods with addresses, coordinates,
     amenities, and building types.
   - 25+ listings across buildings with varied prices, bedrooms, bathrooms,
     pet policies, furnished status, move-in dates, lease terms, and listing types.

3. Important Notes
   - Uses ON CONFLICT DO NOTHING so re-running is safe.
   - Hero images use Pexels stock photo URLs.
   - Coordinates are real Manhattan locations for accurate map rendering.
   - listing_type includes 'rental', 'short_stay', and 'shared_living'.
*/

-- ==========================================
-- NEIGHBORHOODS
-- ==========================================
INSERT INTO neighborhoods (slug, name, borough, description, avg_rent, latitude, longitude, hero_image, highlights, seo_title, seo_description) VALUES
('upper-east-side', 'Upper East Side', 'Manhattan', 'A refined residential enclave known for Museum Mile, pre-war architecture, and tree-lined streets. The Upper East Side offers classic Manhattan elegance with easy access to Central Park.', 4200, 40.7736, -73.9560, 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg', ARRAY['Museum Mile','Central Park access','Pre-war buildings','Quiet residential'], 'Upper East Side Apartments for Rent | Manhattan', 'Browse apartments for rent in the Upper East Side, Manhattan. Find your next home near Central Park and Museum Mile.'),
('upper-west-side', 'Upper West Side', 'Manhattan', 'A cultural hub bordering Central Park with landmarked brownstones, Lincoln Center, and the American Museum of Natural History. The Upper West Side blends intellectual charm with residential comfort.', 3900, 40.7870, -73.9754, 'https://images.pexels.com/photos/2190130/pexels-photo-2190130.jpeg', ARRAY['Central Park','Lincoln Center','Brownstones','Family-friendly'], 'Upper West Side Apartments for Rent | Manhattan', 'Browse apartments for rent in the Upper West Side, Manhattan. Find your next home near Central Park and Lincoln Center.'),
('west-village', 'West Village', 'Manhattan', 'Cobblestone streets, historic townhouses, and a vibrant dining scene define the West Village. One of Manhattan''s most charming and sought-after neighborhoods.', 4800, 40.7340, -74.0050, 'https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg', ARRAY['Historic charm','Dining scene','The High Line','Boutique shopping'], 'West Village Apartments for Rent | Manhattan', 'Browse apartments for rent in the West Village, Manhattan. Find charming homes in one of NYC''s most desirable neighborhoods.'),
('chelsea', 'Chelsea', 'Manhattan', 'A dynamic neighborhood known for art galleries, the High Line, and Chelsea Market. Chelsea offers a mix of industrial-chic lofts and modern high-rises.', 4400, 40.7465, -74.0014, 'https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg', ARRAY['The High Line','Chelsea Market','Art galleries','Nightlife'], 'Chelsea Apartments for Rent | Manhattan', 'Browse apartments for rent in Chelsea, Manhattan. Find lofts and high-rises near the High Line and Chelsea Market.'),
('midtown', 'Midtown', 'Manhattan', 'The heart of Manhattan with iconic landmarks, corporate headquarters, and world-class entertainment. Midtown is the center of it all.', 4100, 40.7549, -73.9840, 'https://images.pexels.com/photos/3491/pexels-photo.jpg', ARRAY['Times Square','Grand Central','Theater District','Bryant Park'], 'Midtown Apartments for Rent | Manhattan', 'Browse apartments for rent in Midtown, Manhattan. Find your next home in the heart of NYC.'),
('tribeca', 'Tribeca', 'Manhattan', 'Tribeca (Triangle Below Canal) is known for its cast-iron architecture, celebrity residents, and world-class restaurants. One of Manhattan''s most exclusive neighborhoods.', 6500, 40.7160, -74.0100, 'https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg', ARRAY['Cast-iron architecture','Fine dining','Celebrity enclave','Hudson River access'], 'Tribeca Apartments for Rent | Manhattan', 'Browse luxury apartments for rent in Tribeca, Manhattan. Find exclusive homes in one of NYC''s finest neighborhoods.'),
('lower-east-side', 'Lower East Side', 'Manhattan', 'A historic immigrant neighborhood turned trendy hotspot with indie boutiques, buzzing bars, and a rich cultural heritage. The LES is gritty, vibrant, and alive.', 3200, 40.7156, -73.9890, 'https://images.pexels.com/photos/1009182/pexels-photo-1009182.jpeg', ARRAY['Nightlife','Indie boutiques','Historic tenements','Food scene'], 'Lower East Side Apartments for Rent | Manhattan', 'Browse apartments for rent in the Lower East Side, Manhattan. Find your next home in this vibrant downtown neighborhood.'),
('east-village', 'East Village', 'Manhattan', 'A bohemian spirit still lives in the East Village with its dive bars, indie music venues, and diverse dining. A neighborhood that never sleeps.', 3400, 40.7268, -73.9818, 'https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg', ARRAY['Nightlife','Diverse dining','Tomkins Square Park','Bohemian vibe'], 'East Village Apartments for Rent | Manhattan', 'Browse apartments for rent in the East Village, Manhattan. Find your next home in this eclectic downtown neighborhood.'),
('soho', 'SoHo', 'Manhattan', 'SoHo (South of Houston) is synonymous with cast-iron buildings, cobblestone streets, high-end shopping, and art galleries. A fashion and design destination.', 5500, 40.7244, -74.0014, 'https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg', ARRAY['Cast-iron lofts','Luxury shopping','Art galleries','Cobblestone streets'], 'SoHo Apartments for Rent | Manhattan', 'Browse luxury lofts and apartments for rent in SoHo, Manhattan. Find your next home in this iconic neighborhood.'),
('harlem', 'Harlem', 'Manhattan', 'A neighborhood rich in African American history, jazz, and culture. Harlem offers beautiful brownstones and a strong sense of community.', 2600, 40.8110, -73.9460, 'https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg', ARRAY['Jazz history','Brownstones','Apollo Theater','Cultural heritage'], 'Harlem Apartments for Rent | Manhattan', 'Browse apartments for rent in Harlem, Manhattan. Find your next home in this culturally rich neighborhood.')
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- BUILDINGS
-- ==========================================
INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'the-beresford', 'The Beresford', n.id, '211 Central Park West', 'New York', 'NY', '10024', 40.7785, -73.9762, 'A landmark pre-war building on Central Park West with classic Manhattan elegance and unparalleled park views.', 'Pre-war Luxury', ARRAY['Doorman','Elevator','Laundry','Central Park views','Fitness Center'], 1929, 22, 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg', 'The Beresford Apartments | Central Park West', 'Apartments at The Beresford, a landmark pre-war building on Central Park West.'
FROM neighborhoods n WHERE n.slug = 'upper-west-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT '10-lake-shore-drive', '10 Lake Shore Drive', n.id, '10 E 75th St', 'New York', 'NY', '10021', 40.7725, -73.9620, 'An elegant full-service building steps from Central Park on the Upper East Side.', 'Full-service Luxury', ARRAY['Doorman','Elevator','Laundry','Garage','Gym'], 1985, 30, 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg', '10 Lake Shore Drive Apartments | Upper East Side', 'Apartments at 10 Lake Shore Drive on the Upper East Side.'
FROM neighborhoods n WHERE n.slug = 'upper-east-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'the-mac-mercer', 'The Mac Mercer', n.id, '21 Mercer St', 'New York', 'NY', '10013', 40.7218, -74.0028, 'A boutique SoHo building with loft-style apartments and high-end finishes.', 'Boutique Loft', ARRAY['Elevator','Roof Deck','Storage','Bike Room'], 2010, 8, 'https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg', 'The Mac Mercer Apartments | SoHo', 'Loft apartments at The Mac Mercer in SoHo.'
FROM neighborhoods n WHERE n.slug = 'soho'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'chelsea-stratus', 'Chelsea Stratus', n.id, '101 W 24th St', 'New York', 'NY', '10011', 40.7445, -73.9948, 'A modern high-rise in the heart of Chelsea with floor-to-ceiling windows and full amenities.', 'Modern High-rise', ARRAY['Doorman','Elevator','Gym','Roof Deck','Concierge','Parking'], 2007, 32, 'https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg', 'Chelsea Stratus Apartments | Chelsea', 'Modern high-rise apartments at Chelsea Stratus.'
FROM neighborhoods n WHERE n.slug = 'chelsea'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'the-james', 'The James', n.id, '44 Greenwich St', 'New York', 'NY', '10013', 40.7165, -74.0105, 'An exclusive Tribeca building with luxury finishes and private amenities.', 'Luxury Condo', ARRAY['Doorman','Elevator','Gym','Pool','Concierge','Storage'], 2015, 14, 'https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg', 'The James Apartments | Tribeca', 'Luxury apartments at The James in Tribeca.'
FROM neighborhoods n WHERE n.slug = 'tribeca'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'village-green', 'Village Green', n.id, '110 W 13th St', 'New York', 'NY', '10011', 40.7380, -74.0010, 'A charming West Village building with classic pre-war details and modern updates.', 'Pre-war', ARRAY['Elevator','Laundry','Bike Room','Garden'], 1920, 6, 'https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg', 'Village Green Apartments | West Village', 'Apartments at Village Green in the West Village.'
FROM neighborhoods n WHERE n.slug = 'west-village'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'midtown-tower', 'Midtown Tower', n.id, '150 E 42nd St', 'New York', 'NY', '10017', 40.7510, -73.9750, 'A sleek Midtown high-rise with spectacular city views and full-service amenities.', 'Modern High-rise', ARRAY['Doorman','Elevator','Gym','Roof Deck','Concierge','Garage'], 2005, 40, 'https://images.pexels.com/photos/3491/pexels-photo.jpg', 'Midtown Tower Apartments | Midtown', 'Apartments at Midtown Tower in the heart of Manhattan.'
FROM neighborhoods n WHERE n.slug = 'midtown'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'les-lofts', 'LES Lofts', n.id, '150 Orchard St', 'New York', 'NY', '10002', 40.7150, -73.9885, 'A trendy Lower East Side building with loft-style apartments and modern finishes.', 'Loft', ARRAY['Elevator','Roof Deck','Storage','Bike Room'], 2008, 7, 'https://images.pexels.com/photos/1009182/pexels-photo-1009182.jpeg', 'LES Lofts Apartments | Lower East Side', 'Loft apartments at LES Lofts on the Lower East Side.'
FROM neighborhoods n WHERE n.slug = 'lower-east-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'east-village-walkup', 'East Village Walkup', n.id, '200 E 10th St', 'New York', 'NY', '10009', 40.7270, -73.9815, 'A classic East Village walk-up with character and charm in a vibrant neighborhood.', 'Walk-up', ARRAY['Laundry','Bike Room'], 1920, 4, 'https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg', 'East Village Walkup Apartments | East Village', 'Apartments at East Village Walkup.'
FROM neighborhoods n WHERE n.slug = 'east-village'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'harlem-brownstone', 'Harlem Brownstone', n.id, '120 W 130th St', 'New York', 'NY', '10027', 40.8100, -73.9455, 'A beautifully restored Harlem brownstone with historic details and modern amenities.', 'Brownstone', ARRAY['Laundry','Garden','Storage'], 1895, 4, 'https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg', 'Harlem Brownstone Apartments | Harlem', 'Apartments at Harlem Brownstone.'
FROM neighborhoods n WHERE n.slug = 'harlem'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'the-graham-chelsea', 'The Graham Chelsea', n.id, '165 W 27th St', 'New York', 'NY', '10001', 40.7460, -73.9910, 'A boutique Chelsea building with modern finishes and easy access to the High Line.', 'Boutique', ARRAY['Elevator','Roof Deck','Gym','Laundry'], 2012, 12, 'https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg', 'The Graham Chelsea Apartments | Chelsea', 'Apartments at The Graham Chelsea.'
FROM neighborhoods n WHERE n.slug = 'chelsea'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'park-meridian', 'Park Meridian', n.id, '875 5th Ave', 'New York', 'NY', '10021', 40.7760, -73.9620, 'A grand pre-war building on the Upper East Side with classic architecture and park proximity.', 'Pre-war Luxury', ARRAY['Doorman','Elevator','Laundry','Garage','Gym'], 1930, 20, 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg', 'Park Meridian Apartments | Upper East Side', 'Apartments at Park Meridian on the Upper East Side.'
FROM neighborhoods n WHERE n.slug = 'upper-east-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'the-hudson-tribeca', 'The Hudson Tribeca', n.id, '70 Laight St', 'New York', 'NY', '10013', 40.7210, -74.0100, 'A luxury Tribeca building with spacious apartments and world-class amenities.', 'Luxury Full-service', ARRAY['Doorman','Elevator','Gym','Pool','Roof Deck','Concierge','Parking'], 2018, 16, 'https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg', 'The Hudson Tribeca Apartments | Tribeca', 'Luxury apartments at The Hudson Tribeca.'
FROM neighborhoods n WHERE n.slug = 'tribeca'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'west-village-mews', 'West Village Mews', n.id, '45 Bedford St', 'New York', 'NY', '10014', 40.7300, -74.0060, 'A charming West Village building with tree-lined street views and classic details.', 'Townhouse', ARRAY['Laundry','Garden','Storage'], 1900, 3, 'https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg', 'West Village Mews Apartments | West Village', 'Apartments at West Village Mews.'
FROM neighborhoods n WHERE n.slug = 'west-village'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO buildings (slug, name, neighborhood_id, address, city, state, zip_code, latitude, longitude, description, building_type, amenities, year_built, floors, hero_image, seo_title, seo_description)
SELECT 'the-aria-soho', 'The Aria SoHo', n.id, '180 Lafayette St', 'New York', 'NY', '10013', 40.7220, -74.0010, 'A modern SoHo building with sleek finishes and a prime downtown location.', 'Modern', ARRAY['Doorman','Elevator','Gym','Roof Deck','Concierge'], 2016, 10, 'https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg', 'The Aria SoHo Apartments | SoHo', 'Modern apartments at The Aria SoHo.'
FROM neighborhoods n WHERE n.slug = 'soho'
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- LISTINGS
-- ==========================================

-- Upper West Side - The Beresford
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'beresford-14a', 'Spacious 2BR at The Beresford', b.id, n.id, '14A', 5800, 2, 2, 1100, false, 'pets_allowed', '2026-08-01', 12, 'rental', 'active', 'Beautifully renovated 2-bedroom with park views in a landmark pre-war building. High ceilings, hardwood floors, and original details throughout.', ARRAY['https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Central Park views','Hardwood floors','High ceilings','Dishwasher'], 40.7785, -73.9762
FROM buildings b, neighborhoods n WHERE b.slug = 'the-beresford' AND n.slug = 'upper-west-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'beresford-7b', 'Classic 1BR with Park Views', b.id, n.id, '7B', 4200, 1, 1, 750, false, 'cats_only', '2026-09-01', 12, 'rental', 'active', 'Sun-drenched 1-bedroom with views of Central Park. Pre-war details with modern kitchen and bath.', ARRAY['https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Park views','Hardwood floors','Modern kitchen'], 40.7785, -73.9762
FROM buildings b, neighborhoods n WHERE b.slug = 'the-beresford' AND n.slug = 'upper-west-side'
ON CONFLICT (slug) DO NOTHING;

-- Upper East Side - 10 Lake Shore Drive
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'lakeshore-22c', 'Luxury 3BR near Central Park', b.id, n.id, '22C', 7500, 3, 2.5, 1500, false, 'pets_allowed', '2026-08-15', 12, 'rental', 'active', 'Expansive 3-bedroom with Central Park proximity. Full-service building with gym, garage, and 24-hour doorman.', ARRAY['https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg','https://images.pexels.com/photos/32870/pexels-photo.jpg'], ARRAY['Park proximity','Marble bath','Wine fridge','Walk-in closet'], 40.7725, -73.9620
FROM buildings b, neighborhoods n WHERE b.slug = '10-lake-shore-drive' AND n.slug = 'upper-east-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'lakeshore-10a', 'Furnished Studio - Short Stay', b.id, n.id, '10A', 3800, 0, 1, 450, true, 'no_pets', '2026-08-01', 3, 'short_stay', 'active', 'Fully furnished studio available for short-term lease. Modern finishes and building amenities included.', ARRAY['https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Furnished','Gym access','Doorman','Utilities included'], 40.7725, -73.9620
FROM buildings b, neighborhoods n WHERE b.slug = '10-lake-shore-drive' AND n.slug = 'upper-east-side'
ON CONFLICT (slug) DO NOTHING;

-- Upper East Side - Park Meridian
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'park-meridian-5a', 'Elegant 2BR Pre-war', b.id, n.id, '5A', 5500, 2, 2, 1200, false, 'pets_allowed', '2026-09-01', 12, 'rental', 'active', 'Classic pre-war 2-bedroom with high ceilings, original moldings, and a renovated chef''s kitchen.', ARRAY['https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'], ARRAY['High ceilings','Original moldings','Chef''s kitchen','Doorman'], 40.7760, -73.9620
FROM buildings b, neighborhoods n WHERE b.slug = 'park-meridian' AND n.slug = 'upper-east-side'
ON CONFLICT (slug) DO NOTHING;

-- SoHo - The Mac Mercer
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'mac-mercer-4a', 'SoHo Loft 1BR', b.id, n.id, '4A', 5800, 1, 1, 900, true, 'pets_allowed', '2026-08-01', 12, 'rental', 'active', 'Stunning loft-style 1-bedroom with 12-foot ceilings, oversized windows, and designer furnishings.', ARRAY['https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg','https://images.pexels.com/photos/32870/pexels-photo.jpg'], ARRAY['12ft ceilings','Furnished','Oversized windows','Roof deck access'], 40.7218, -74.0028
FROM buildings b, neighborhoods n WHERE b.slug = 'the-mac-mercer' AND n.slug = 'soho'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'mac-mercer-6b', 'SoHo Loft Studio', b.id, n.id, '6B', 4200, 0, 1, 550, true, 'no_pets', '2026-09-01', 6, 'short_stay', 'active', 'Chic furnished studio loft in the heart of SoHo. Available for short-term stays.', ARRAY['https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Furnished','High ceilings','Roof deck','Prime location'], 40.7218, -74.0028
FROM buildings b, neighborhoods n WHERE b.slug = 'the-mac-mercer' AND n.slug = 'soho'
ON CONFLICT (slug) DO NOTHING;

-- SoHo - The Aria SoHo
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'aria-soho-8c', 'Modern 2BR in SoHo', b.id, n.id, '8C', 6200, 2, 2, 1000, false, 'pets_allowed', '2026-08-15', 12, 'rental', 'active', 'Sleek 2-bedroom with floor-to-ceiling windows and modern finishes in a full-service building.', ARRAY['https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'], ARRAY['Floor-to-ceiling windows','Gym','Concierge','Roof deck'], 40.7220, -74.0010
FROM buildings b, neighborhoods n WHERE b.slug = 'the-aria-soho' AND n.slug = 'soho'
ON CONFLICT (slug) DO NOTHING;

-- Chelsea - Chelsea Stratus
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'chelsea-stratus-25a', 'High-rise 1BR near High Line', b.id, n.id, '25A', 4500, 1, 1, 700, false, 'pets_allowed', '2026-08-01', 12, 'rental', 'active', 'Modern 1-bedroom with floor-to-ceiling windows and stunning city views. Steps from the High Line.', ARRAY['https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg','https://images.pexels.com/photos/32870/pexels-photo.jpg'], ARRAY['City views','Gym','Roof deck','Concierge','Doorman'], 40.7445, -73.9948
FROM buildings b, neighborhoods n WHERE b.slug = 'chelsea-stratus' AND n.slug = 'chelsea'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'chelsea-stratus-18b', 'Furnished 2BR High-rise', b.id, n.id, '18B', 5800, 2, 2, 950, true, 'dogs_only', '2026-09-01', 12, 'rental', 'active', 'Fully furnished 2-bedroom with panoramic views. Building amenities include gym, roof deck, and concierge.', ARRAY['https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'], ARRAY['Furnished','Panoramic views','Gym','Roof deck','Doorman'], 40.7445, -73.9948
FROM buildings b, neighborhoods n WHERE b.slug = 'chelsea-stratus' AND n.slug = 'chelsea'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'chelsea-stratus-3c', 'Shared Living Room in 3BR', b.id, n.id, '3C', 1800, 1, 1, 350, true, 'no_pets', '2026-08-01', 6, 'shared_living', 'active', 'Private bedroom in a shared 3-bedroom apartment. Common areas fully furnished. Great for students and young professionals.', ARRAY['https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Furnished','Shared common area','Gym access','Doorman'], 40.7445, -73.9948
FROM buildings b, neighborhoods n WHERE b.slug = 'chelsea-stratus' AND n.slug = 'chelsea'
ON CONFLICT (slug) DO NOTHING;

-- Chelsea - The Graham Chelsea
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'graham-chelsea-9a', 'Boutique Studio near High Line', b.id, n.id, '9A', 3200, 0, 1, 400, false, 'cats_only', '2026-08-15', 12, 'rental', 'active', 'Modern studio in a boutique Chelsea building. Roof deck and gym included.', ARRAY['https://images.pexels.com/photos/4046718/pexels-photo-4046718.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Roof deck','Gym','Modern kitchen','Elevator'], 40.7460, -73.9910
FROM buildings b, neighborhoods n WHERE b.slug = 'the-graham-chelsea' AND n.slug = 'chelsea'
ON CONFLICT (slug) DO NOTHING;

-- Tribeca - The James
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'the-james-ph', 'Tribeca Penthouse 3BR', b.id, n.id, 'PH', 12000, 3, 3.5, 2200, false, 'pets_allowed', '2026-09-01', 12, 'rental', 'active', 'Extraordinary penthouse with private rooftop terrace, panoramic views, and luxury finishes throughout.', ARRAY['https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg','https://images.pexels.com/photos/32870/pexels-photo.jpg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Private rooftop','Panoramic views','Pool access','Concierge','Wine cellar'], 40.7165, -74.0105
FROM buildings b, neighborhoods n WHERE b.slug = 'the-james' AND n.slug = 'tribeca'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'the-james-11a', 'Luxury 2BR with Pool Access', b.id, n.id, '11A', 8500, 2, 2, 1300, true, 'pets_allowed', '2026-08-01', 12, 'rental', 'active', 'Fully furnished 2-bedroom with access to building pool, gym, and concierge services.', ARRAY['https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'], ARRAY['Furnished','Pool','Gym','Concierge','Doorman'], 40.7165, -74.0105
FROM buildings b, neighborhoods n WHERE b.slug = 'the-james' AND n.slug = 'tribeca'
ON CONFLICT (slug) DO NOTHING;

-- Tribeca - The Hudson Tribeca
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'hudson-tribeca-12b', 'Spacious 3BR Luxury', b.id, n.id, '12B', 9500, 3, 2.5, 1600, false, 'pets_allowed', '2026-09-15', 12, 'rental', 'active', 'Brand new 3-bedroom with luxury finishes, pool access, and panoramic Hudson River views.', ARRAY['https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg','https://images.pexels.com/photos/32870/pexels-photo.jpg'], ARRAY['River views','Pool','Gym','Roof deck','Concierge','Parking'], 40.7210, -74.0100
FROM buildings b, neighborhoods n WHERE b.slug = 'the-hudson-tribeca' AND n.slug = 'tribeca'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'hudson-tribeca-5a', 'Short Stay Luxury 1BR', b.id, n.id, '5A', 4500, 1, 1, 650, true, 'no_pets', '2026-08-01', 1, 'short_stay', 'active', 'Fully furnished luxury 1-bedroom available for short-term stays. All building amenities included.', ARRAY['https://images.pexels.com/photos/4047212/pexels-photo-4047212.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Furnished','Pool','Gym','Concierge','Doorman'], 40.7210, -74.0100
FROM buildings b, neighborhoods n WHERE b.slug = 'the-hudson-tribeca' AND n.slug = 'tribeca'
ON CONFLICT (slug) DO NOTHING;

-- West Village - Village Green
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'village-green-3a', 'Charming 1BR West Village', b.id, n.id, '3A', 4200, 1, 1, 600, false, 'cats_only', '2026-08-01', 12, 'rental', 'active', 'Pre-war 1-bedroom with exposed brick, original details, and a tree-lined street view in the heart of the West Village.', ARRAY['https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Exposed brick','Pre-war details','Garden access','Tree-lined street'], 40.7380, -74.0010
FROM buildings b, neighborhoods n WHERE b.slug = 'village-green' AND n.slug = 'west-village'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'village-green-5b', 'Cozy Studio West Village', b.id, n.id, '5B', 2800, 0, 1, 350, false, 'no_pets', '2026-09-01', 12, 'rental', 'active', 'Charming studio in a classic West Village building. Steps from the best dining and shopping.', ARRAY['https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Pre-war charm','Garden access','Quiet street'], 40.7380, -74.0010
FROM buildings b, neighborhoods n WHERE b.slug = 'village-green' AND n.slug = 'west-village'
ON CONFLICT (slug) DO NOTHING;

-- West Village - West Village Mews
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'wv-mews-1a', 'Townhouse 2BR with Garden', b.id, n.id, '1A', 5500, 2, 1.5, 900, false, 'pets_allowed', '2026-08-15', 12, 'rental', 'active', 'Unique townhouse apartment with private garden access in a historic West Village building.', ARRAY['https://images.pexels.com/photos/2023939/pexels-photo-2023939.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'], ARRAY['Private garden','Townhouse charm','Exposed brick'], 40.7300, -74.0060
FROM buildings b, neighborhoods n WHERE b.slug = 'west-village-mews' AND n.slug = 'west-village'
ON CONFLICT (slug) DO NOTHING;

-- Midtown - Midtown Tower
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'midtown-tower-30a', 'Skyline 2BR in Midtown', b.id, n.id, '30A', 5200, 2, 2, 950, false, 'pets_allowed', '2026-08-01', 12, 'rental', 'active', 'High-floor 2-bedroom with spectacular skyline views. Full-service building near Grand Central.', ARRAY['https://images.pexels.com/photos/3491/pexels-photo.jpg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg','https://images.pexels.com/photos/32870/pexels-photo.jpg'], ARRAY['Skyline views','Gym','Roof deck','Concierge','Doorman','Garage'], 40.7510, -73.9750
FROM buildings b, neighborhoods n WHERE b.slug = 'midtown-tower' AND n.slug = 'midtown'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'midtown-tower-15c', 'Furnished Midtown Studio', b.id, n.id, '15C', 3000, 0, 1, 400, true, 'no_pets', '2026-08-01', 3, 'short_stay', 'active', 'Fully furnished studio in Midtown. Perfect for business travelers and short-term stays.', ARRAY['https://images.pexels.com/photos/3491/pexels-photo.jpg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Furnished','Gym','Doorman','Concierge'], 40.7510, -73.9750
FROM buildings b, neighborhoods n WHERE b.slug = 'midtown-tower' AND n.slug = 'midtown'
ON CONFLICT (slug) DO NOTHING;

-- Lower East Side - LES Lofts
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'les-lofts-4a', 'Loft 2BR on the LES', b.id, n.id, '4A', 3600, 2, 1, 850, false, 'pets_allowed', '2026-09-01', 12, 'rental', 'active', 'Spacious loft-style 2-bedroom with high ceilings and industrial details in a vibrant neighborhood.', ARRAY['https://images.pexels.com/photos/1009182/pexels-photo-1009182.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['High ceilings','Loft style','Roof deck','Storage'], 40.7150, -73.9885
FROM buildings b, neighborhoods n WHERE b.slug = 'les-lofts' AND n.slug = 'lower-east-side'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'les-lofts-2b', 'Shared Room in LES Loft', b.id, n.id, '2B', 1200, 1, 1, 250, true, 'no_pets', '2026-08-01', 6, 'shared_living', 'active', 'Private bedroom in a shared 3-bedroom loft. Furnished common areas and roof deck access.', ARRAY['https://images.pexels.com/photos/1009182/pexels-photo-1009182.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Furnished','Shared common area','Roof deck','Storage'], 40.7150, -73.9885
FROM buildings b, neighborhoods n WHERE b.slug = 'les-lofts' AND n.slug = 'lower-east-side'
ON CONFLICT (slug) DO NOTHING;

-- East Village - East Village Walkup
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'ev-walkup-3a', 'Classic East Village 1BR', b.id, n.id, '3A', 2900, 1, 1, 500, false, 'no_pets', '2026-08-15', 12, 'rental', 'active', 'Classic East Village walk-up with character. Exposed brick and original wood details.', ARRAY['https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Exposed brick','Original details','Walk-up charm'], 40.7270, -73.9815
FROM buildings b, neighborhoods n WHERE b.slug = 'east-village-walkup' AND n.slug = 'east-village'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'ev-walkup-2b', 'East Village Studio', b.id, n.id, '2B', 2200, 0, 1, 300, false, 'cats_only', '2026-09-01', 12, 'rental', 'active', 'Affordable studio in the heart of the East Village. Steps from Tompkins Square Park.', ARRAY['https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Affordable','Tompkins Square Park nearby','Walk-up charm'], 40.7270, -73.9815
FROM buildings b, neighborhoods n WHERE b.slug = 'east-village-walkup' AND n.slug = 'east-village'
ON CONFLICT (slug) DO NOTHING;

-- Harlem - Harlem Brownstone
INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'harlem-brownstone-1a', 'Historic Brownstone 2BR', b.id, n.id, '1A', 2800, 2, 1, 800, false, 'pets_allowed', '2026-08-01', 12, 'rental', 'active', 'Beautifully restored brownstone apartment with original woodwork, high ceilings, and garden access.', ARRAY['https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg','https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'], ARRAY['Original woodwork','High ceilings','Garden access','Historic charm'], 40.8100, -73.9455
FROM buildings b, neighborhoods n WHERE b.slug = 'harlem-brownstone' AND n.slug = 'harlem'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO listings (slug, title, building_id, neighborhood_id, unit_number, price, bedrooms, bathrooms, sqft, furnished, pet_policy, move_in_date, lease_term_months, listing_type, status, description, images, amenities, latitude, longitude)
SELECT 'harlem-brownstone-3a', 'Harlem 1BR Garden Apartment', b.id, n.id, '3A', 2200, 1, 1, 600, false, 'pets_allowed', '2026-09-01', 12, 'rental', 'active', 'Garden-level 1-bedroom in a historic Harlem brownstone. Quiet street with beautiful architecture.', ARRAY['https://images.pexels.com/photos/2412599/pexels-photo-2412599.jpeg','https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'], ARRAY['Garden access','Historic charm','Quiet street'], 40.8100, -73.9455
FROM buildings b, neighborhoods n WHERE b.slug = 'harlem-brownstone' AND n.slug = 'harlem'
ON CONFLICT (slug) DO NOTHING;

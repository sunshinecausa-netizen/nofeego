/*
# Seed content: FAQs, nearby places, transportation, lifestyle for buildings and neighborhoods

1. Overview
   Populates the newly added content columns on existing buildings and neighborhoods
   with realistic Manhattan data: nearby subway stations, grocery stores, restaurants,
   transportation options, FAQs, and neighborhood lifestyle information.

2. Data Updated
   - All 15 buildings: FAQs, nearby subway, nearby grocery, nearby restaurants,
     transportation, neighborhood summaries, contact info.
   - All 10 neighborhoods: FAQs, restaurants, coffee shops, parks, schools,
     lifestyle, transportation.

3. Important Notes
   - Uses UPDATE ... WHERE slug = ... so re-running is safe (overwrites with same data).
   - FAQ data stored as jsonb arrays of {question, answer} objects.
   - All content is realistic Manhattan-specific information.
*/

-- ==========================================
-- BUILDINGS: FAQs, nearby places, transportation
-- ==========================================

UPDATE buildings SET
  nearby_subway = ARRAY['72nd St (1/2/3)','72nd St (B/C)','66th St (1)'],
  nearby_grocery = ARRAY['Whole Foods Market Columbus Circle','Zabars','Fairway Market'],
  nearby_restaurants = ARRAY['Cafe Luxembourg','P.J. Clark''s','Bar Boulud','Carnegie Deli'],
  transportation = ARRAY['1, 2, 3 trains at 72nd St','B, C trains at 72nd St','M72 crosstown bus','M5 bus on Broadway'],
  neighborhood_summary = 'The Upper West Side offers a refined residential atmosphere with easy access to Central Park, Lincoln Center, and the American Museum of Natural History. Known for its pre-war architecture and intellectual charm.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0100',
  faqs = '[{"question":"What utilities are included in the rent?","answer":"Water and sewer are included. Tenants are responsible for electricity, gas, and internet."},{"question":"Is there a pet policy?","answer":"Yes, pets are welcome. There is a two-pet limit per apartment with a pet deposit."},{"question":"What are the lease terms?","answer":"Standard leases are 12 months. Shorter terms may be available at a premium."},{"question":"Is parking available?","answer":"Yes, on-site parking is available for an additional monthly fee."},{"question":"What is the application process?","answer":"You will need to provide proof of income (40x rent), a credit report, and a government-issued ID. The process typically takes 2-3 business days."}]'
WHERE slug = 'the-beresford';

UPDATE buildings SET
  nearby_subway = ARRAY['77th St (6)','72nd St (6)','86th St (4/5/6)'],
  nearby_grocery = ARRAY['Whole Foods Market UES','Fairway Market','Eli''s Manhattan'],
  nearby_restaurants = ARRAY['J.G. Melon','Sarabeth''s','Bemelmans Bar','Daniel'],
  transportation = ARRAY['6 train at 77th St','4, 5, 6 trains at 86th St','M15 SBS on First/Second Ave','M79 crosstown bus'],
  neighborhood_summary = 'The Upper East Side is known for its classic Manhattan elegance, Museum Mile, and proximity to Central Park. A quiet, residential area with excellent schools and cultural institutions.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0101',
  faqs = '[{"question":"Are there income requirements?","answer":"Yes, applicants must demonstrate an annual income of at least 40 times the monthly rent."},{"question":"Is there a doorman?","answer":"Yes, this is a full-service building with a 24-hour doorman and concierge."},{"question":"What amenities are included?","answer":"Building amenities include a fitness center, garage, laundry room, and storage."},{"question":"Are guarantors accepted?","answer":"Yes, guarantors are accepted with income of 80 times the monthly rent."}]'
WHERE slug = '10-lake-shore-drive';

UPDATE buildings SET
  nearby_subway = ARRAY['Spring St (6)','Prince St (N/Q/R/W)','Canal St (J/N/Q/R/W/6)'],
  nearby_grocery = ARRAY['Whole Foods Market Houston','Gourmet Garage','Dean & DeLuca'],
  nearby_restaurants = ARRAY['Balthazar','Minetta Tavern','L''Artusi','King'],
  transportation = ARRAY['6 train at Spring St','N, Q, R, W trains at Prince St','M1 bus on Lafayette','Citi Bike stations nearby'],
  neighborhood_summary = 'SoHo is synonymous with cast-iron architecture, cobblestone streets, and world-class shopping. A fashion and design destination with some of the best dining in Manhattan.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0102',
  faqs = '[{"question":"Are the apartments furnished?","answer":"Some units are available furnished. Please inquire about specific listings."},{"question":"What is the building type?","answer":"This is a boutique loft building with 8 floors and modern finishes."},{"question":"Is there a roof deck?","answer":"Yes, residents have access to a shared roof deck with city views."},{"question":"What is the pet policy?","answer":"Pets are welcome. Please check individual listing policies for restrictions."}]'
WHERE slug = 'the-mac-mercer';

UPDATE buildings SET
  nearby_subway = ARRAY['23rd St (C/E)','28th St (1)','23rd St (6)'],
  nearby_grocery = ARRAY['Whole Foods Market Chelsea','Trader Joe''s','Westside Market'],
  nearby_restaurants = ARRAY['Cookshop','The Red Cat','Tia Pol','Chelsea Market'],
  transportation = ARRAY['C, E trains at 23rd St','1 train at 28th St','6 train at 23rd St','M23 SBS crosstown bus'],
  neighborhood_summary = 'Chelsea is a dynamic neighborhood known for art galleries, the High Line, and Chelsea Market. A mix of industrial-chic lofts and modern high-rises.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0103',
  faqs = '[{"question":"What building amenities are available?","answer":"Full-service amenities include 24-hour doorman, fitness center, roof deck, concierge, and parking garage."},{"question":"Is the building pet-friendly?","answer":"Yes, pets are welcome with a limit of two per apartment."},{"question":"What are the move-in costs?","answer":"First month rent and one month security deposit are required at lease signing."},{"question":"Are short-term leases available?","answer":"Yes, select units offer 3-6 month lease terms at a premium."}]'
WHERE slug = 'chelsea-stratus';

UPDATE buildings SET
  nearby_subway = ARRAY['Canal St (A/C/E)','Chambers St (1/2/3/A/C)','Franklin St (1)'],
  nearby_grocery = ARRAY['Whole Foods Market Tribeca','Zeytuna','Bazaar Market'],
  nearby_restaurants = ARRAY['Locanda Verde','Bouley at Home','The Odeon','Minetta Tavern'],
  transportation = ARRAY['A, C, E trains at Canal St','1, 2, 3 trains at Chambers St','M20 bus','Hudson River Greenway for biking'],
  neighborhood_summary = 'Tribeca is one of Manhattan''s most exclusive neighborhoods, known for cast-iron architecture, celebrity residents, and world-class restaurants.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0104',
  faqs = '[{"question":"What luxury amenities are included?","answer":"Building amenities include a pool, fitness center, 24-hour concierge, and storage."},{"question":"Is there parking?","answer":"Yes, valet parking is available for an additional fee."},{"question":"What is the income requirement?","answer":"Applicants must show an annual income of at least 45 times the monthly rent."},{"question":"Are sublets allowed?","answer":"Subletting is permitted with board approval and proper documentation."}]'
WHERE slug = 'the-james';

UPDATE buildings SET
  nearby_subway = ARRAY['14th St (A/C/E/L)','Christopher St (1)','8th St (N/Q/R/W/6)'],
  nearby_grocery = ARRAY['Whole Foods Market Houston','Trader Joe''s 14th St','Morton Williams'],
  nearby_restaurants = ARRAY['Minetta Tavern','The Spotted Pig','L''Artusi','Buvette'],
  transportation = ARRAY['A, C, E, L trains at 14th St','1 train at Christopher St','M14A SBS bus','Citi Bike stations throughout'],
  neighborhood_summary = 'The West Village is one of Manhattan''s most charming neighborhoods with cobblestone streets, historic townhouses, and a vibrant dining scene.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0105',
  faqs = '[{"question":"Is this a pre-war building?","answer":"Yes, this building was constructed in 1920 and retains classic pre-war details."},{"question":"Is there an elevator?","answer":"Yes, the building has a full elevator."},{"question":"Are pets allowed?","answer":"Cats are welcome. Please check individual listings for dog policies."},{"question":"What is the neighborhood like?","answer":"The West Village offers tree-lined streets, boutique shopping, and some of the best dining in NYC."}]'
WHERE slug = 'village-green';

UPDATE buildings SET
  nearby_subway = ARRAY['Grand Central (4/5/6/7/S)','42nd St (N/Q/R/W/S)','33rd St (6)'],
  nearby_grocery = ARRAY['Grand Central Market','Whole Foods Market Kips Bay','D''Agostino'],
  nearby_restaurants = ARRAY['Grand Central Oyster Bar','The Campbell','Cipriani','Smith & Wollensky'],
  transportation = ARRAY['4, 5, 6, 7, S trains at Grand Central','N, Q, R, W trains at 42nd St','M34 SBS crosstown bus','Shuttle to Times Square'],
  neighborhood_summary = 'Midtown is the heart of Manhattan with iconic landmarks, corporate headquarters, and world-class entertainment. The center of it all.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0106',
  faqs = '[{"question":"What are the building amenities?","answer":"Full-service building with doorman, gym, roof deck, concierge, and garage."},{"question":"Is the building close to Grand Central?","answer":"Yes, the building is steps from Grand Central Terminal with access to multiple subway lines and Metro-North."},{"question":"What are the lease terms?","answer":"Standard 12-month leases. Corporate and short-term housing available in select units."},{"question":"Is there a fitness center?","answer":"Yes, a fully equipped fitness center is included for residents."}]'
WHERE slug = 'midtown-tower';

UPDATE buildings SET
  nearby_subway = ARRAY['Delancey St (F/J/M/Z)','Grand St (L)','2nd Ave (F)'],
  nearby_grocery = ARRAY['Whole Foods Market Houston','Essex Market','Westside Market'],
  nearby_restaurants = ARRAY['Katz''s Delicatessen','Prune','Dimes','Fat Radish'],
  transportation = ARRAY['F, J, M, Z trains at Delancey St','L train at Grand St','M14A SBS bus','Williamsburg Bridge access'],
  neighborhood_summary = 'The Lower East Side is a historic immigrant neighborhood turned trendy hotspot with indie boutiques, buzzing bars, and a rich cultural heritage.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0107',
  faqs = '[{"question":"What type of building is this?","answer":"A modern loft building with high ceilings and industrial-chic finishes."},{"question":"Is there a roof deck?","answer":"Yes, residents have access to a shared roof deck."},{"question":"Are pets allowed?","answer":"Yes, pets are welcome in this building."},{"question":"What is the neighborhood known for?","answer":"The LES is known for its vibrant nightlife, diverse dining, and historic tenement architecture."}]'
WHERE slug = 'les-lofts';

UPDATE buildings SET
  nearby_subway = ARRAY['1st Ave (L)','Astor Pl (6)','8th St (N/Q/R/W/6)'],
  nearby_grocery = ARRAY['Whole Foods Market Houston','Trader Joe''s 14th St','Westside Market'],
  nearby_restaurants = ARRAY['Veselka','Momofuku Noodle Bar','Prune','Supper'],
  transportation = ARRAY['L train at 1st Ave','6 train at Astor Place','M14A SBS bus','Citi Bike stations nearby'],
  neighborhood_summary = 'The East Village maintains its bohemian spirit with dive bars, indie music venues, and diverse dining. A neighborhood that never sleeps.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0108',
  faqs = '[{"question":"Is this a walk-up building?","answer":"Yes, this is a classic 4-story walk-up without an elevator."},{"question":"Are pets allowed?","answer":"No pets are allowed in this building."},{"question":"What is the neighborhood vibe?","answer":"The East Village is known for its bohemian spirit, nightlife, and diverse dining scene."},{"question":"Is there laundry in the building?","answer":"There is a shared laundry room on the ground floor."}]'
WHERE slug = 'east-village-walkup';

UPDATE buildings SET
  nearby_subway = ARRAY['125th St (2/3/A/B/C/D)','135th St (2/3)','116th St (2/3)'],
  nearby_grocery = ARRAY['Whole Foods Market Harlem','Westside Market','Fine Fare'],
  nearby_restaurants = ARRAY['Red Rooster','Sylvia''s','Minton''s','Lido'],
  transportation = ARRAY['2, 3 trains at 125th St','A, B, C, D trains at 125th St','M60 SBS to LaGuardia Airport','M1 bus on Madison Ave'],
  neighborhood_summary = 'Harlem is rich in African American history, jazz, and culture. Beautiful brownstones and a strong sense of community define this iconic neighborhood.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0109',
  faqs = '[{"question":"Is this a historic building?","answer":"Yes, this brownstone was built in 1895 and beautifully restored with modern amenities."},{"question":"Is there garden access?","answer":"Yes, the ground-floor unit has private garden access."},{"question":"Are pets allowed?","answer":"Yes, pets are welcome in this building."},{"question":"What is the neighborhood known for?","answer":"Harlem is known for its rich cultural heritage, jazz history, and the Apollo Theater."}]'
WHERE slug = 'harlem-brownstone';

UPDATE buildings SET
  nearby_subway = ARRAY['28th St (1)','23rd St (C/E)','28th St (N/Q/R/W)'],
  nearby_grocery = ARRAY['Whole Foods Market Chelsea','Trader Joe''s','Westside Market'],
  nearby_restaurants = ARRAY['Tia Pol','Cookshop','The Red Cat','Buddakan'],
  transportation = ARRAY['1 train at 28th St','C, E trains at 23rd St','N, Q, R, W trains at 28th St','M23 SBS crosstown bus'],
  neighborhood_summary = 'Chelsea offers a dynamic mix of art galleries, the High Line, and Chelsea Market. A neighborhood that blends industrial heritage with modern living.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0110',
  faqs = '[{"question":"What amenities does the building offer?","answer":"Amenities include a roof deck, fitness center, elevator, and laundry room."},{"question":"Is the building close to the High Line?","answer":"Yes, the High Line is just a few blocks away."},{"question":"What is the pet policy?","answer":"Cats are welcome. Please inquire about dog policies for specific units."},{"question":"Are there laundry facilities?","answer":"Yes, there is a shared laundry room on-site."}]'
WHERE slug = 'the-graham-chelsea';

UPDATE buildings SET
  nearby_subway = ARRAY['77th St (6)','86th St (4/5/6)','72nd St (6)'],
  nearby_grocery = ARRAY['Whole Foods Market UES','Fairway Market','Eli''s Manhattan'],
  nearby_restaurants = ARRAY['Daniel','Cafe Boulud','Sarabeth''s','J.G. Melon'],
  transportation = ARRAY['6 train at 77th St','4, 5, 6 trains at 86th St','M15 SBS on First/Second Ave','M79 crosstown bus'],
  neighborhood_summary = 'The Upper East Side offers classic Manhattan elegance with pre-war architecture, Museum Mile, and proximity to Central Park.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0111',
  faqs = '[{"question":"Is this a pre-war building?","answer":"Yes, built in 1930 with classic pre-war architecture and high ceilings."},{"question":"What amenities are included?","answer":"Full-service building with doorman, elevator, laundry, garage, and gym."},{"question":"What are the income requirements?","answer":"Applicants must show income of at least 40 times the monthly rent."},{"question":"Are pets allowed?","answer":"Yes, pets are welcome with a two-pet limit per apartment."}]'
WHERE slug = 'park-meridian';

UPDATE buildings SET
  nearby_subway = ARRAY['Canal St (A/C/E)','Franklin St (1)','Chambers St (1/2/3/A/C)'],
  nearby_grocery = ARRAY['Whole Foods Market Tribeca','Zeytuna','Bazaar Market'],
  nearby_restaurants = ARRAY['Locanda Verde','Bouley at Home','The Odeon','Hudson Clearwater'],
  transportation = ARRAY['A, C, E trains at Canal St','1 train at Franklin St','1, 2, 3, A, C trains at Chambers St','M20 bus','Hudson River Greenway'],
  neighborhood_summary = 'Tribeca is one of Manhattan''s most exclusive neighborhoods with cast-iron architecture, celebrity residents, and world-class dining.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0112',
  faqs = '[{"question":"What luxury amenities are available?","answer":"Building amenities include a pool, fitness center, 24-hour doorman, concierge, roof deck, and parking."},{"question":"What is the income requirement?","answer":"Applicants must demonstrate an annual income of at least 45 times the monthly rent."},{"question":"Is there a pool?","answer":"Yes, residents have access to a building pool."},{"question":"Are furnished units available?","answer":"Select units are available furnished for short-term and long-term leases."}]'
WHERE slug = 'the-hudson-tribeca';

UPDATE buildings SET
  nearby_subway = ARRAY['Christopher St (1)','14th St (A/C/E/L)','Houston St (1)'],
  nearby_grocery = ARRAY['Whole Foods Market Houston','Trader Joe''s 14th St','Morton Williams'],
  nearby_restaurants = ARRAY['Buvette','The Spotted Pig','Minetta Tavern','L''Artusi'],
  transportation = ARRAY['1 train at Christopher St','A, C, E, L trains at 14th St','M14A SBS bus','Citi Bike stations throughout'],
  neighborhood_summary = 'The West Village is one of Manhattan''s most charming neighborhoods with cobblestone streets, historic townhouses, and a vibrant dining scene.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0113',
  faqs = '[{"question":"Is this a townhouse building?","answer":"Yes, this is a historic townhouse with unique garden-access apartments."},{"question":"Are pets allowed?","answer":"Yes, pets are welcome in this building."},{"question":"Is there a garden?","answer":"Yes, the building has a shared garden for residents."},{"question":"What is the neighborhood like?","answer":"The West Village offers tree-lined streets, boutique shopping, and excellent dining options."}]'
WHERE slug = 'west-village-mews';

UPDATE buildings SET
  nearby_subway = ARRAY['Spring St (6)','Prince St (N/Q/R/W)','Canal St (J/N/Q/R/W/6)'],
  nearby_grocery = ARRAY['Whole Foods Market Houston','Gourmet Garage','Dean & DeLuca'],
  nearby_restaurants = ARRAY['Balthazar','Minetta Tavern','L''Artusi','Estela'],
  transportation = ARRAY['6 train at Spring St','N, Q, R, W trains at Prince St','M1 bus on Lafayette','Citi Bike stations nearby'],
  neighborhood_summary = 'SoHo is a world-renowned neighborhood famous for cast-iron buildings, cobblestone streets, high-end shopping, and art galleries.',
  contact_email = 'rentals@manhattanliving.com',
  contact_phone = '(212) 555-0114',
  faqs = '[{"question":"What type of building is this?","answer":"A modern full-service building with doorman, gym, roof deck, and concierge."},{"question":"Are pets allowed?","answer":"Yes, pets are welcome in this building."},{"question":"What is the building''s location advantage?","answer":"Prime SoHo location steps from luxury shopping, galleries, and top restaurants."},{"question":"What are the lease terms?","answer":"Standard 12-month leases with options for shorter terms at a premium."}]'
WHERE slug = 'the-aria-soho';

-- ==========================================
-- NEIGHBORHOODS: restaurants, coffee, parks, schools, lifestyle, transportation, FAQs
-- ==========================================

UPDATE neighborhoods SET
  restaurants = ARRAY['Cafe Luxembourg','P.J. Clark''s','Bar Boulud','Daniel','J.G. Melon'],
  coffee_shops = ARRAY['Birch Coffee','Joe Coffee','Stumptown Coffee','La Colombe'],
  parks = ARRAY['Central Park','Riverside Park','Theodore Roosevelt Park'],
  schools = ARRAY['P.S. 87 William Sherman','P.S. 199 Jessie Isador Straus','Trinity School','Dalton School'],
  lifestyle = ARRAY['Museum Mile','Lincoln Center','American Museum of Natural History','Barnes & Noble Upper West Side'],
  transportation = ARRAY['1, 2, 3 trains at 72nd St','B, C trains at 72nd St','M72 crosstown bus','M5 bus on Broadway'],
  faqs = '[{"question":"What is the average rent in the Upper West Side?","answer":"The average rent for a one-bedroom apartment is approximately $3,900 per month."},{"question":"Is the Upper West Side family-friendly?","answer":"Yes, the UWS is known for being one of the most family-friendly neighborhoods in Manhattan with excellent schools and parks."},{"question":"How far is Central Park?","answer":"Central Park forms the eastern border of the Upper West Side, making it easily accessible from anywhere in the neighborhood."},{"question":"What is the commute to Midtown?","answer":"The commute to Midtown takes approximately 15-20 minutes via the 1, 2, or 3 trains."}]'
WHERE slug = 'upper-west-side';

UPDATE neighborhoods SET
  restaurants = ARRAY['Daniel','Cafe Boulud','Sarabeth''s','J.G. Melon','Bemelmans Bar'],
  coffee_shops = ARRAY['Joe Coffee','Birch Coffee','Stumptown Coffee','Bluestone Lane'],
  parks = ARRAY['Central Park','Carl Schurz Park','John Jay Park'],
  schools = ARRAY['P.S. 6 Lillie Devereux Blake','P.S. 290 Manhattan New School','Lycée Français','Brearley School'],
  lifestyle = ARRAY['Museum Mile','Metropolitan Museum of Art','Guggenheim Museum','Madison Avenue shopping'],
  transportation = ARRAY['6 train at 77th St','4, 5, 6 trains at 86th St','M15 SBS on First/Second Ave','M79 crosstown bus'],
  faqs = '[{"question":"What is the average rent on the Upper East Side?","answer":"The average rent for a one-bedroom apartment is approximately $4,200 per month."},{"question":"Is the Upper East Side safe?","answer":"Yes, the UES is consistently ranked as one of the safest neighborhoods in Manhattan."},{"question":"What is Museum Mile?","answer":"Museum Mile is a section of Fifth Avenue home to major museums including the Met, Guggenheim, and Jewish Museum."},{"question":"How long is the commute to Midtown?","answer":"The commute to Midtown takes approximately 10-15 minutes via the 4, 5, or 6 trains."}]'
WHERE slug = 'upper-east-side';

UPDATE neighborhoods SET
  restaurants = ARRAY['Minetta Tavern','The Spotted Pig','L''Artusi','Buvette','Carbone'],
  coffee_shops = ARRAY['Joe Coffee','Devocion','Stumptown Coffee','La Colombe'],
  parks = ARRAY['Washington Square Park','Hudson River Park','Christopher Park'],
  schools = ARRAY['P.S. 3 Charrette School','P.S. 41 Greenwich Village','Little Red School House','Grace Church School'],
  lifestyle = ARRAY['Historic townhouses','Cobblestone streets','The High Line','Boutique shopping on Bleecker St'],
  transportation = ARRAY['A, C, E, L trains at 14th St','1 train at Christopher St','M14A SBS bus','Citi Bike stations throughout'],
  faqs = '[{"question":"What is the average rent in the West Village?","answer":"The average rent for a one-bedroom apartment is approximately $4,800 per month."},{"question":"Is the West Village walkable?","answer":"Yes, the West Village is one of the most walkable neighborhoods in NYC with tree-lined streets and minimal traffic."},{"question":"What is the vibe of the West Village?","answer":"The West Village is known for its charming, historic atmosphere with cobblestone streets, townhouses, and excellent dining."},{"question":"How far is the High Line?","answer":"The High Line''s southern entrance is approximately a 10-minute walk from the West Village."}]'
WHERE slug = 'west-village';

UPDATE neighborhoods SET
  restaurants = ARRAY['Cookshop','The Red Cat','Tia Pol','Buddakan','Chelsea Market'],
  coffee_shops = ARRAY['Joe Coffee','Stumptown Coffee','Bluestone Lane','Devocion'],
  parks = ARRAY['The High Line','Chelsea Park','Hudson River Park'],
  schools = ARRAY['P.S. 11 William T. Harris','P.S. 33 Chelsea Prep','Avenues: The World School','Beacon School'],
  lifestyle = ARRAY['Art galleries','The High Line','Chelsea Market','Nightlife on 8th Ave'],
  transportation = ARRAY['C, E trains at 23rd St','1 train at 28th St','N, Q, R, W trains at 28th St','M23 SBS crosstown bus'],
  faqs = '[{"question":"What is the average rent in Chelsea?","answer":"The average rent for a one-bedroom apartment is approximately $4,400 per month."},{"question":"What is the High Line?","answer":"The High Line is an elevated park built on a former freight rail line, running through Chelsea and the Meatpacking District."},{"question":"Is Chelsea a good neighborhood for young professionals?","answer":"Yes, Chelsea is popular with young professionals due to its central location, nightlife, and art scene."},{"question":"What is Chelsea Market?","answer":"Chelsea Market is an indoor food hall and shopping mall located in the former Nabisco factory building."}]'
WHERE slug = 'chelsea';

UPDATE neighborhoods SET
  restaurants = ARRAY['Grand Central Oyster Bar','The Campbell','Cipriani','Smith & Wollensky','The Halal Guys'],
  coffee_shops = ARRAY['Joe Coffee Grand Central','Blue Bottle Coffee','Stumptown Coffee','Gregorys Coffee'],
  parks = ARRAY['Bryant Park','Greenacre Park','Tudor City Greens'],
  schools = ARRAY['P.S. 59 Beekman Hill','P.S. 116 Mary Lindley Murray','Scuola d''Italia Guglielmo Marconi','United Nations International School'],
  lifestyle = ARRAY['Times Square','Grand Central Terminal','Theater District','Bryant Park'],
  transportation = ARRAY['4, 5, 6, 7, S trains at Grand Central','N, Q, R, W trains at 42nd St','A, C, E trains at 42nd St','M34 SBS crosstown bus'],
  faqs = '[{"question":"What is the average rent in Midtown?","answer":"The average rent for a one-bedroom apartment is approximately $4,100 per month."},{"question":"Is Midton a good place to live?","answer":"Midtown is ideal for those who want to be at the center of NYC with easy access to offices, dining, and entertainment."},{"question":"How noisy is Midtown?","answer":"Midtown can be busy and noisy, especially near Times Square. Side streets tend to be quieter."},{"question":"What is the commute from Midtown?","answer":"Midtown is the most connected neighborhood in NYC with access to nearly every subway line."}]'
WHERE slug = 'midtown';

UPDATE neighborhoods SET
  restaurants = ARRAY['Locanda Verde','Bouley at Home','The Odeon','Minetta Tavern','Hudson Clearwater'],
  coffee_shops = ARRAY['Konditori','La Colombe','Stumptown Coffee','Joe Coffee'],
  parks = ARRAY['Washington Market Park','Hudson River Park','Duane Park'],
  schools = ARRAY['P.S. 234 Independence School','P.S. 150 Tribeca Learning Center','Stuyvesant High School','LREI'],
  lifestyle = ARRAY['Cast-iron architecture','Fine dining','Hudson River access','Tribeca Film Festival'],
  transportation = ARRAY['A, C, E trains at Canal St','1 train at Franklin St','1, 2, 3, A, C trains at Chambers St','M20 bus'],
  faqs = '[{"question":"What is the average rent in Tribeca?","answer":"The average rent for a one-bedroom apartment is approximately $6,500 per month, making it one of NYC''s most expensive neighborhoods."},{"question":"Why is Tribeca so expensive?","answer":"Tribeca offers large loft spaces, historic architecture, excellent schools, and a high concentration of celebrity residents."},{"question":"Is Tribeca family-friendly?","answer":"Yes, Tribeca is known for being very family-friendly with top-rated schools and parks."},{"question":"What does Tribeca stand for?","answer":"Tribeca stands for \"Triangle Below Canal Street.\""}]'
WHERE slug = 'tribeca';

UPDATE neighborhoods SET
  restaurants = ARRAY['Katz''s Delicatessen','Prune','Dimes','Fat Radish','Russ & Daughters'],
  coffee_shops = ARRAY['Ground Support','Kava Shteeble','Everyday Espresso','La Cabra'],
  parks = ARRAY['Sara D. Roosevelt Park','East River Park','Corlears Hook Park'],
  schools = ARRAY['P.S. 110 Florence Nightingale','P.S. 134','School of the Future','Emma Lazarus High School'],
  lifestyle = ARRAY['Nightlife','Indie boutiques','Historic tenements','Art galleries'],
  transportation = ARRAY['F, J, M, Z trains at Delancey St','L train at Grand St','M14A SBS bus','Williamsburg Bridge access'],
  faqs = '[{"question":"What is the average rent on the Lower East Side?","answer":"The average rent for a one-bedroom apartment is approximately $3,200 per month."},{"question":"What is the Lower East Side known for?","answer":"The LES is known for its vibrant nightlife, diverse dining, and rich immigrant history."},{"question":"Is the Lower East Side affordable?","answer":"Compared to other Manhattan neighborhoods, the LES remains relatively affordable while offering a vibrant lifestyle."},{"question":"What is the commute to Midtown?","answer":"The commute to Midtown takes approximately 20-25 minutes via the F train."}]'
WHERE slug = 'lower-east-side';

UPDATE neighborhoods SET
  restaurants = ARRAY['Veselka','Momofuku Noodle Bar','Prune','Supper','Minca'],
  coffee_shops = ARRAY['Everyday Espresso','Joe Coffee','La Cabra','Abraço'],
  parks = ARRAY['Tompkins Square Park','East River Park','Union Square Park'],
  schools = ARRAY['P.S. 347 East Village Community School','P.S. 63','School of the Future','Earth School'],
  lifestyle = ARRAY['Nightlife','Diverse dining','Tompkins Square Park','Bohemian vibe'],
  transportation = ARRAY['L train at 1st Ave','6 train at Astor Place','M14A SBS bus','M9 bus on Avenue A'],
  faqs = '[{"question":"What is the average rent in the East Village?","answer":"The average rent for a one-bedroom apartment is approximately $3,400 per month."},{"question":"What is the East Village known for?","answer":"The East Village is known for its bohemian spirit, diverse dining, nightlife, and indie music venues."},{"question":"Is the East Village walkable?","answer":"Yes, the East Village is highly walkable with most amenities within a few blocks."},{"question":"What is the commute to Midtown?","answer":"The commute to Midtown takes approximately 15-20 minutes via the 6 train."}]'
WHERE slug = 'east-village';

UPDATE neighborhoods SET
  restaurants = ARRAY['Balthazar','Minetta Tavern','L''Artusi','Estela','King'],
  coffee_shops = ARRAY['Everyday Espresso','La Cabra','Joe Coffee','Devocion'],
  parks = ARRAY['Washington Square Park','Hudson River Park','Father Demo Square'],
  schools = ARRAY['P.S. 3 Charrette School','P.S. 41 Greenwich Village','Little Red School House','NYU'],
  lifestyle = ARRAY['Cast-iron lofts','Luxury shopping','Art galleries','Cobblestone streets'],
  transportation = ARRAY['6 train at Spring St','N, Q, R, W trains at Prince St','A, C, E trains at Canal St','M1 bus on Lafayette'],
  faqs = '[{"question":"What is the average rent in SoHo?","answer":"The average rent for a one-bedroom apartment is approximately $5,500 per month."},{"question":"What is SoHo known for?","answer":"SoHo is known for its cast-iron architecture, cobblestone streets, luxury shopping, and art galleries."},{"question":"Is SoHo a good place to live?","answer":"SoHo is ideal for those who want a trendy, central location with excellent shopping and dining."},{"question":"What does SoHo stand for?","answer":"SoHo stands for \"South of Houston Street.\""}]'
WHERE slug = 'soho';

UPDATE neighborhoods SET
  restaurants = ARRAY['Red Rooster','Sylvia''s','Minton''s','Lido','Corner Social'],
  coffee_shops = ARRAY['Double Dutch Espresso','Harlem Coffee Co','Monkey Cup','Kuro Kuma'],
  parks = ARRAY['Morningside Park','Marcus Garvey Park','St. Nicholas Park'],
  schools = ARRAY['P.S. 125 Ralph Bunche','P.S. 200 James Mccune Smith','Thurgood Marshall Academy','Columbia University'],
  lifestyle = ARRAY['Jazz history','Brownstones','Apollo Theater','Cultural heritage'],
  transportation = ARRAY['2, 3 trains at 125th St','A, B, C, D trains at 125th St','M60 SBS to LaGuardia Airport','M1 bus on Madison Ave'],
  faqs = '[{"question":"What is the average rent in Harlem?","answer":"The average rent for a one-bedroom apartment is approximately $2,600 per month, making it one of Manhattan''s more affordable neighborhoods."},{"question":"Is Harlem safe?","answer":"Yes, Harlem has seen significant gentrification and is generally safe, especially in the central and western areas."},{"question":"What is Harlem known for?","answer":"Harlem is known for its rich African American history, jazz and music heritage, and the Apollo Theater."},{"question":"How long is the commute to Midtown?","answer":"The commute to Midtown takes approximately 20-30 minutes via the 2, 3, A, B, C, or D trains."}]'
WHERE slug = 'harlem';

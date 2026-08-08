import type { Building } from '@/lib/types';

export type BuildingInventorySummary = {
  minPrice: number;
  maxPrice: number;
  bedrooms: number[];
  availableCount: number;
  updatedAt: string | null;
  bedroomMinimums: Partial<Record<0 | 1 | 2 | 3, number>>;
};

export type BuildingsPageResult = {
  buildings: Building[];
  total: number;
  inventoryByBuilding: Record<string, BuildingInventorySummary>;
};

export type BuildingFilters = {
  search?: string;
  boroughs?: string[];
  neighborhoods?: string[];
  amenities?: string[];
  priceRange?: string;
  bedrooms?: string;
  bathrooms?: string;
  moveInDate?: string;
  moveInFlex?: string;
  mapOnly?: boolean;
};

const ALLOWED_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);
const ALLOWED_NEIGHBORHOODS = new Set(['Battery Park City', 'Chelsea', 'Chinatown', 'Civic Center', 'East Village', 'Financial District', 'Flatiron District', 'Gramercy', 'Greenwich Village', 'Little Italy', 'Lower East Side', 'NoHo', 'NoMad', 'Nolita', 'Seaport District', 'SoHo', 'Tribeca', 'Union Square', 'West Village', 'Beekman Place', 'Kips Bay', 'Midtown', 'Midtown East', 'Midtown South', 'Murray Hill', 'Roosevelt Island', 'Stuy Town / PC Village', 'Sutton Place', 'Tudor City', 'Turtle Bay', 'Central Park South', "Hell\'s Kitchen", 'Hudson Yards', 'Midtown West', 'Carnegie Hill', 'Upper East Side', 'East Harlem', 'Fort George', 'Hamilton Heights', 'Harlem', 'Hudson Heights', 'Inwood', 'Mt. Morris Park', 'Washington Heights', 'Central Park West', 'Lincoln Square', 'Manhattan Valley', 'Morningside Heights', 'Upper West Side', 'Brooklyn Heights', 'Coney Island', 'DUMBO', 'Downtown Brooklyn', 'Fort Greene', 'Gowanus', 'Greenpoint', 'Prospect Heights', 'Sheepshead Bay', 'Williamsburg', 'Long Island City', 'Woodside', 'Mott Haven', 'Riverdale', 'Stapleton', 'Downtown Jersey City', 'Journal Square', 'McGinley Square', 'Newport', 'Paulus Hook']);
const ALLOWED_AMENITIES = new Set(['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed', 'No Pets Allowed', 'Elevator', 'Gym', 'Doorman', 'Laundry In Building', 'In-Unit W/D Available', 'Air Conditioning', 'Outdoor Space', 'Pool', 'Parking', 'Bike Storage', 'Package Room', 'Storage Available', 'Coworking Space', 'Lounge', 'Playroom', 'Wheelchair Accessible']);

export async function fetchBuildingsPage({
  page,
  pageSize,
  search = '',
  boroughs = [],
  neighborhoods = [],
  amenities = [],
  priceRange = '',
  bedrooms = '',
  bathrooms = '',
  moveInDate = '',
  moveInFlex = 'flexible',
  mapOnly = false,
}: { page: number; pageSize: number } & BuildingFilters): Promise<BuildingsPageResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Public building data is not configured.');

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(500, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
  const endpoint = new URL('/rest/v1/buildings', url);
  endpoint.searchParams.set('select', mapOnly
    ? 'id,slug,name,address,city,state,zip_code,latitude,longitude,neighborhood,borough,amenities,hero_image_url,hero_image,gallery,nearby_subway,updated_at,building_id,building_type,stories,total_units'
    : '*');
  endpoint.searchParams.set('is_active', 'eq.true');
  // NoFeeGo currently serves the New York metro market. Keep Boston and other
  // out-of-market records out of every list, map, count, and filter result.
  endpoint.searchParams.set('state', 'in.(NY,NJ)');
  endpoint.searchParams.set('order', 'name.asc');
  endpoint.searchParams.set('offset', String(from));
  endpoint.searchParams.set('limit', String(safePageSize));

  if (term) endpoint.searchParams.set('or', `(name.ilike.*${term}*,building_name.ilike.*${term}*,address.ilike.*${term}*,street_address.ilike.*${term}*,neighborhood.ilike.*${term}*,borough.ilike.*${term}*)`);
  const safeBoroughs = [...new Set(boroughs.filter((item) => ALLOWED_BOROUGHS.has(item)))];
  if (safeBoroughs.length === 1) endpoint.searchParams.set('borough', `eq.${safeBoroughs[0]}`);
  else if (safeBoroughs.length > 1) endpoint.searchParams.set('borough', `in.(${safeBoroughs.map((item) => `"${item}"`).join(',')})`);
  const safeNeighborhoods = [...new Set(neighborhoods.filter((item) => ALLOWED_NEIGHBORHOODS.has(item)))];
  if (safeNeighborhoods.length === 1) endpoint.searchParams.set('neighborhood', `eq.${safeNeighborhoods[0]}`);
  else if (safeNeighborhoods.length > 1) endpoint.searchParams.set('neighborhood', `in.(${safeNeighborhoods.map((item) => `"${item.replace(/"/g, '')}"`).join(',')})`);
  const safeAmenities = [...new Set(amenities.filter((item) => ALLOWED_AMENITIES.has(item)))];
  const contains = (item: string) => `amenities.cs.{"${item.replace(/"/g, '')}"}`;
  if (safeAmenities.length === 1) endpoint.searchParams.set('amenities', `cs.{"${safeAmenities[0].replace(/"/g, '')}"}`);
  else if (safeAmenities.length > 1) endpoint.searchParams.set('and', `(${safeAmenities.map(contains).join(',')})`);

  const priceMatch = /^(\d+)-(\d+|plus)$/.exec(priceRange);
  const bedroomValue = /^[1-5]$/.test(bedrooms) ? Number(bedrooms) : null;
  const bathroomValue = /^[1-5]$/.test(bathrooms) ? Number(bathrooms) : null;
  const safeMoveInDate = /^\d{4}-\d{2}-\d{2}$/.test(moveInDate) ? moveInDate : '';
  const moveInOptions = ['flexible', 'this_month', 'end_this_month', 'early_next_month', 'middle_next_month', 'end_next_month', 'exact', 'exact_7', 'exact_15'];
  const safeMoveInFlex = moveInOptions.includes(moveInFlex) ? moveInFlex : 'flexible';
  const formatDate = (date: Date) => date.toISOString().slice(0, 10);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const year = todayUtc.getUTCFullYear();
  const month = todayUtc.getUTCMonth();
  let moveInRange: readonly [string, string] | null = null;
  if (safeMoveInFlex === 'this_month') {
    moveInRange = [formatDate(todayUtc), formatDate(new Date(Date.UTC(year, month + 1, 0)))];
  } else if (safeMoveInFlex === 'end_this_month') {
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    const finalWeek = new Date(Date.UTC(year, month + 1, -6));
    moveInRange = [formatDate(finalWeek > todayUtc ? finalWeek : todayUtc), formatDate(monthEnd)];
  } else if (safeMoveInFlex === 'early_next_month') {
    moveInRange = [formatDate(new Date(Date.UTC(year, month + 1, 1))), formatDate(new Date(Date.UTC(year, month + 1, 10)))];
  } else if (safeMoveInFlex === 'middle_next_month') {
    moveInRange = [formatDate(new Date(Date.UTC(year, month + 1, 11))), formatDate(new Date(Date.UTC(year, month + 1, 20)))];
  } else if (safeMoveInFlex === 'end_next_month') {
    moveInRange = [formatDate(new Date(Date.UTC(year, month + 1, 21))), formatDate(new Date(Date.UTC(year, month + 2, 0)))];
  } else if ((safeMoveInFlex === 'exact_7' || safeMoveInFlex === 'exact_15') && safeMoveInDate) {
    const flexDays = safeMoveInFlex === 'exact_7' ? 7 : 15;
    const targetDate = new Date(`${safeMoveInDate}T00:00:00Z`);
    const rangeStart = new Date(targetDate);
    const rangeEnd = new Date(targetDate);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - flexDays);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + flexDays);
    moveInRange = [formatDate(rangeStart), formatDate(rangeEnd)];
  }
  if (priceMatch || bedroomValue !== null || bathroomValue !== null || moveInRange || (safeMoveInFlex === 'exact' && safeMoveInDate)) {
    const listingsEndpoint = new URL('/rest/v1/listings', url);
    listingsEndpoint.searchParams.set('select', 'building_id');
    listingsEndpoint.searchParams.set('status', 'eq.active');
    listingsEndpoint.searchParams.set('building_id', 'not.is.null');
    if (priceMatch) {
      listingsEndpoint.searchParams.set('price', `gte.${priceMatch[1]}`);
      if (priceMatch[2] !== 'plus') listingsEndpoint.searchParams.append('price', `lt.${priceMatch[2]}`);
    }
    if (bedroomValue !== null) listingsEndpoint.searchParams.set('bedrooms', `gte.${bedroomValue}`);
    if (bathroomValue !== null) listingsEndpoint.searchParams.set('bathrooms', `gte.${bathroomValue}`);
    if (safeMoveInFlex === 'exact' && safeMoveInDate) listingsEndpoint.searchParams.set('move_in_date', `eq.${safeMoveInDate}`);
    else if (moveInRange) {
      listingsEndpoint.searchParams.set('move_in_date', `gte.${moveInRange[0]}`);
      listingsEndpoint.searchParams.append('move_in_date', `lte.${moveInRange[1]}`);
    }
    const listingsResponse = await fetch(listingsEndpoint, { cache: 'no-store', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (!listingsResponse.ok) throw new Error('Unable to load matching inventory.');
    const matchingListings = await listingsResponse.json() as Array<{ building_id: string }>;
    const buildingIds = [...new Set(matchingListings.map((item) => item.building_id).filter(Boolean))];
    if (buildingIds.length === 0) return { buildings: [], total: 0, inventoryByBuilding: {} };
    endpoint.searchParams.set('id', `in.(${buildingIds.join(',')})`);
  }

  const response = await fetch(endpoint, { cache: 'no-store', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Prefer: 'count=exact' } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { code?: string };
    console.error('Public buildings query failed', { code: error.code ?? `HTTP_${response.status}` });
    throw new Error('Unable to load buildings.');
  }
  const buildings = await response.json() as Building[];
  const contentRange = response.headers.get('content-range');
  const total = Number.parseInt(contentRange?.split('/')[1] ?? '0', 10) || 0;
  const inventoryByBuilding: Record<string, BuildingInventorySummary> = {};
  if (buildings.length > 0) {
    const inventoryEndpoint = new URL('/rest/v1/inventory_snapshots', url);
    inventoryEndpoint.searchParams.set('select', 'building_id,unit_id,rent,captured_at,units!inner(bedrooms,is_active)');
    inventoryEndpoint.searchParams.set('inventory_status', 'eq.available');
    inventoryEndpoint.searchParams.set('valid_until', 'is.null');
    inventoryEndpoint.searchParams.set('rent', 'gt.0');
    inventoryEndpoint.searchParams.set('units.is_active', 'eq.true');
    inventoryEndpoint.searchParams.set('limit', '5000');
    const inventoryResponse = await fetch(inventoryEndpoint, {
      cache: 'no-store',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (inventoryResponse.ok) {
      const buildingIds = new Set(buildings.map((building) => building.id));
      type CurrentInventoryRow = { building_id: string; unit_id: string; rent: number; captured_at: string; units: { bedrooms: number | null; is_active: boolean } };
      const rows = await inventoryResponse.json() as CurrentInventoryRow[];
      const latestByUnit = new Map<string, CurrentInventoryRow>();
      for (const row of rows) {
        const current = latestByUnit.get(row.unit_id);
        if (!current || row.captured_at > current.captured_at) latestByUnit.set(row.unit_id, row);
      }
      for (const row of latestByUnit.values()) {
        if (!buildingIds.has(row.building_id) || !Number.isFinite(row.rent) || row.rent <= 0) continue;
        const bedroom = row.units?.bedrooms;
        const current = inventoryByBuilding[row.building_id];
        if (!current) {
          inventoryByBuilding[row.building_id] = {
            minPrice: row.rent,
            maxPrice: row.rent,
            bedrooms: bedroom != null && Number.isFinite(bedroom) ? [bedroom] : [],
            availableCount: 1,
            updatedAt: row.captured_at,
            bedroomMinimums: bedroom != null && [0, 1, 2, 3].includes(bedroom) ? { [bedroom]: row.rent } : {},
          };
          continue;
        }
        current.minPrice = Math.min(current.minPrice, row.rent);
        current.maxPrice = Math.max(current.maxPrice, row.rent);
        if (bedroom != null && Number.isFinite(bedroom) && !current.bedrooms.includes(bedroom)) current.bedrooms.push(bedroom);
        if (bedroom != null && [0, 1, 2, 3].includes(bedroom)) {
          const supportedBedroom = bedroom as 0 | 1 | 2 | 3;
          const minimum = current.bedroomMinimums[supportedBedroom];
          current.bedroomMinimums[supportedBedroom] = minimum == null ? row.rent : Math.min(minimum, row.rent);
        }
        current.availableCount += 1;
        if (!current.updatedAt || row.captured_at > current.updatedAt) current.updatedAt = row.captured_at;
      }
      Object.values(inventoryByBuilding).forEach((summary) => summary.bedrooms.sort((a, b) => a - b));
    }
  }
  return { buildings, total, inventoryByBuilding };
}

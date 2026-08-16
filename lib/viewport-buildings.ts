import { unstable_cache } from 'next/cache';
import type { Building } from '@/lib/types';

export type BuildingInventorySummary = {
  minPrice: number;
  maxPrice: number;
  bedrooms: number[];
  availableCount: number;
  updatedAt: string | null;
  bedroomMinimums: Partial<Record<0 | 1 | 2 | 3, number>>;
  concessionText: string | null;
  earliestAvailableDate: string | null;
  isNoFee: boolean;
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
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

const ALLOWED_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);
const ALLOWED_NEIGHBORHOODS = new Set(['Battery Park City', 'Chelsea', 'Chinatown', 'Civic Center', 'East Village', 'Financial District', 'Flatiron District', 'Gramercy', 'Greenwich Village', 'Little Italy', 'Lower East Side', 'NoHo', 'NoMad', 'Nolita', 'Seaport District', 'SoHo', 'Tribeca', 'Union Square', 'West Village', 'Beekman Place', 'Kips Bay', 'Midtown', 'Midtown East', 'Midtown South', 'Murray Hill', 'Roosevelt Island', 'Stuy Town / PC Village', 'Sutton Place', 'Tudor City', 'Turtle Bay', 'Central Park South', "Hell\'s Kitchen", 'Hudson Yards', 'Midtown West', 'Carnegie Hill', 'Upper East Side', 'East Harlem', 'Fort George', 'Hamilton Heights', 'Harlem', 'Hudson Heights', 'Inwood', 'Mt. Morris Park', 'Washington Heights', 'Central Park West', 'Lincoln Square', 'Manhattan Valley', 'Morningside Heights', 'Upper West Side', 'Brooklyn Heights', 'Coney Island', 'DUMBO', 'Downtown Brooklyn', 'Fort Greene', 'Gowanus', 'Greenpoint', 'Prospect Heights', 'Sheepshead Bay', 'Williamsburg', 'Long Island City', 'Woodside', 'Mott Haven', 'Riverdale', 'Stapleton', 'Downtown Jersey City', 'Journal Square', 'McGinley Square', 'Newport', 'Paulus Hook']);
const ALLOWED_AMENITIES = new Set(['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed', 'No Pets Allowed', 'Elevator', 'Gym', 'Doorman', 'Laundry In Building', 'In-Unit W/D Available', 'Dishwasher', 'Air Conditioning', 'Outdoor Space', 'Pool', 'Parking', 'Bike Storage', 'Package Room', 'Storage Available', 'Coworking Space', 'Lounge', 'Playroom', 'Wheelchair Accessible']);
const PUBLIC_CATALOG_REVALIDATE_SECONDS = 60;
const PUBLIC_BUILDING_FIELDS = 'id,slug,name,address,city,state,zip_code,latitude,longitude,neighborhood,borough,amenities,hero_image_url,hero_image,nearby_subway,updated_at,building_type,stories,total_units';

function catalogRequest(serviceRoleKey: string, count = false): RequestInit {
  const headers: Record<string, string> = { apikey: serviceRoleKey };
  if (!serviceRoleKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceRoleKey}`;
  if (count) headers.Prefer = 'count=exact';
  return {
    headers,
    next: { revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS },
  };
}
export async function fetchBuildingsPageUncached({
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
  north,
  south,
  east,
  west,
}: { page: number; pageSize: number } & BuildingFilters): Promise<BuildingsPageResult> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Protected catalog data is not configured.');

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(500, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
  const endpoint = new URL('/rest/v1/catalog_buildings', url);
  endpoint.searchParams.set('select', PUBLIC_BUILDING_FIELDS);
  // NoFeeGo currently serves the New York metro market. Keep Boston and other
  // out-of-market records out of every list, map, count, and filter result.
  endpoint.searchParams.set('state', 'in.(NY,NJ)');
  // Deterministic across pages: freshest catalog facts first, then stable ties.
  endpoint.searchParams.set('order', 'updated_at.desc,name.asc,id.asc');
  endpoint.searchParams.set('offset', String(from));
  endpoint.searchParams.set('limit', String(safePageSize));

  const validBounds = [north, south, east, west].every((value) => typeof value === 'number' && Number.isFinite(value))
    && north! > south! && east! > west!
    && north! <= 42 && south! >= 39 && east! <= -71 && west! >= -76;
  if (validBounds) {
    endpoint.searchParams.append('latitude', `gte.${south}`);
    endpoint.searchParams.append('latitude', `lte.${north}`);
    endpoint.searchParams.append('longitude', `gte.${west}`);
    endpoint.searchParams.append('longitude', `lte.${east}`);
  }

  if (term) endpoint.searchParams.set('or', `(name.ilike.*${term}*,address.ilike.*${term}*,neighborhood.ilike.*${term}*,borough.ilike.*${term}*)`);
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
    const listingsEndpoint = new URL('/rest/v1/catalog_listing_filters', url);
    listingsEndpoint.searchParams.set('select', 'building_id');
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
    const listingsResponse = await fetch(listingsEndpoint, catalogRequest(serviceRoleKey));
    if (!listingsResponse.ok) throw new Error('Unable to load matching inventory.');
    const matchingListings = await listingsResponse.json() as Array<{ building_id: string }>;
    const buildingIds = [...new Set(matchingListings.map((item) => item.building_id).filter(Boolean))];
    if (buildingIds.length === 0) return { buildings: [], total: 0, inventoryByBuilding: {} };
    endpoint.searchParams.set('id', `in.(${buildingIds.join(',')})`);
  }

  const response = await fetch(endpoint, catalogRequest(serviceRoleKey, true));
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
    type InventorySummaryRow = { building_id: string; bedrooms: number | null; min_rent: number; max_rent: number; available_count: number; earliest_available_date: string | null; has_no_fee_inventory: boolean; updated_at: string | null };
    const buildingIds = new Set(buildings.map((building) => building.id));
    const ids = [...buildingIds];
    const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, (index + 1) * 100));
    const batchRows = await Promise.all(batches.map(async (batch) => {
      const inventoryEndpoint = new URL('/rest/v1/catalog_inventory_summary', url);
      inventoryEndpoint.searchParams.set('select', 'building_id,bedrooms,min_rent,max_rent,available_count,earliest_available_date,has_no_fee_inventory,updated_at');
      inventoryEndpoint.searchParams.set('building_id', `in.(${batch.join(',')})`);
      try {
        const response = await fetch(inventoryEndpoint, catalogRequest(serviceRoleKey));
        return response.ok ? await response.json() as InventorySummaryRow[] : [];
      } catch {
        return [];
      }
    }));
    const rows = batchRows.flat();
    if (rows.length > 0) {
      for (const row of rows) {
        if (!buildingIds.has(row.building_id) || !Number.isFinite(row.min_rent) || row.min_rent <= 0) continue;
        const bedroom = row.bedrooms;
        const current = inventoryByBuilding[row.building_id];
        if (!current) {
          inventoryByBuilding[row.building_id] = {
            minPrice: row.min_rent,
            maxPrice: row.max_rent,
            bedrooms: bedroom != null && Number.isFinite(bedroom) ? [bedroom] : [],
            availableCount: row.available_count,
            updatedAt: row.updated_at,
            bedroomMinimums: bedroom != null && [0, 1, 2, 3].includes(bedroom) ? { [bedroom]: row.min_rent } : {},
            concessionText: null,
            earliestAvailableDate: row.earliest_available_date,
            isNoFee: row.has_no_fee_inventory,
          };
          continue;
        }
        current.minPrice = Math.min(current.minPrice, row.min_rent);
        current.maxPrice = Math.max(current.maxPrice, row.max_rent);
        if (bedroom != null && Number.isFinite(bedroom) && !current.bedrooms.includes(bedroom)) current.bedrooms.push(bedroom);
        if (bedroom != null && [0, 1, 2, 3].includes(bedroom)) {
          const supportedBedroom = bedroom as 0 | 1 | 2 | 3;
          const minimum = current.bedroomMinimums[supportedBedroom];
          current.bedroomMinimums[supportedBedroom] = minimum == null ? row.min_rent : Math.min(minimum, row.min_rent);
        }
        current.availableCount += row.available_count;
        if (row.earliest_available_date && (!current.earliestAvailableDate || row.earliest_available_date < current.earliestAvailableDate)) current.earliestAvailableDate = row.earliest_available_date;
        if (row.has_no_fee_inventory) current.isNoFee = true;
        if (row.updated_at && (!current.updatedAt || row.updated_at > current.updatedAt)) current.updatedAt = row.updated_at;
      }
      Object.values(inventoryByBuilding).forEach((summary) => summary.bedrooms.sort((a, b) => a - b));
    }
  }
  return { buildings, total, inventoryByBuilding };
}

export const fetchBuildingsPage = unstable_cache(
  fetchBuildingsPageUncached,
  ['public-buildings-page-v1'],
  { revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS },
);

export async function fetchViewportBuildingsPage({
  page,
  pageSize,
  ...filters
}: { page: number; pageSize: number } & BuildingFilters): Promise<BuildingsPageResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(60, Math.max(1, Math.floor(pageSize)));
  const internalPageSize = 500;
  const first = await fetchBuildingsPage({ page: 1, pageSize: internalPageSize, ...filters });
  const internalPageCount = Math.ceil(first.total / internalPageSize);
  const remaining = internalPageCount > 1
    ? await Promise.all(Array.from({ length: internalPageCount - 1 }, (_, index) => fetchBuildingsPage({ page: index + 2, pageSize: internalPageSize, ...filters })))
    : [];
  const allResults = [first, ...remaining];
  const inventoryByBuilding = Object.assign({}, ...allResults.map((result) => result.inventoryByBuilding)) as Record<string, BuildingInventorySummary>;
  const buildings = allResults.flatMap((result) => result.buildings).sort((left, right) => {
    const leftAvailable = (inventoryByBuilding[left.id]?.availableCount ?? 0) > 0;
    const rightAvailable = (inventoryByBuilding[right.id]?.availableCount ?? 0) > 0;
    if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
    const updatedOrder = (right.updated_at ?? '').localeCompare(left.updated_at ?? '');
    if (updatedOrder !== 0) return updatedOrder;
    const nameOrder = left.name.localeCompare(right.name, 'en');
    return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
  });
  const from = (safePage - 1) * safePageSize;
  const pageBuildings = buildings.slice(from, from + safePageSize);
  const pageInventory = Object.fromEntries(pageBuildings.flatMap((building) => {
    const inventory = inventoryByBuilding[building.id];
    return inventory ? [[building.id, inventory]] : [];
  }));
  return { buildings: pageBuildings, total: first.total, inventoryByBuilding: pageInventory };
}

import type { Building } from '@/lib/types';

export type PublicAvailabilityStatus = 'unavailable' | 'limited' | 'available';
export type BuildingInventorySummary = {
  availabilityStatus: PublicAvailabilityStatus;
  bedroomMinimums: Partial<Record<0 | 1 | 2 | 3, number>>;
  bedroomAvailableCounts: Partial<Record<0 | 1 | 2 | 3, number>>;
  roommateInterestCount?: number;
  availableCount?: number; concessionText?: never; updatedAt?: never;
};
export type BuildingsPageResult = { buildings: Building[]; total: number; inventoryByBuilding: Record<string, BuildingInventorySummary> };
export type BuildingFilters = { search?: string; boroughs?: string[]; neighborhoods?: string[]; amenities?: string[]; priceRanges?: string[]; bedrooms?: string[]; bathrooms?: string[]; moveInDate?: string; moveInFlex?: string[]; mapOnly?: boolean };

const ALLOWED_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);
const ALLOWED_AMENITIES = new Set(['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed', 'No Pets Allowed', 'Elevator', 'Gym', 'Doorman', 'Laundry In Building', 'In-Unit W/D Available', 'Dishwasher', 'Air Conditioning', 'Outdoor Space', 'Pool', 'Parking', 'Bike Storage', 'Package Room', 'Storage Available', 'Coworking Space', 'Lounge', 'Playroom', 'Wheelchair Accessible']);

const PUBLIC_VIEW_PAGE_SIZE = 1000;

export function isPublicCatalogRow(row: Record<string, unknown>) {
  const slug = String(row.slug ?? '').trim().toLowerCase();
  const name = String(row.name ?? '').trim().toLowerCase();
  const address = String(row.address ?? '').trim().toLowerCase();
  return !(
    slug.startsWith('preview-')
    || slug.startsWith('test-')
    || slug.endsWith('-test')
    || slug.includes('-e2e-')
    || name.startsWith('preview ')
    || name.startsWith('test ')
    || name.includes(' e2e ')
    || address.includes('preview test')
    || address.includes('preview river')
    || address.includes('test way')
  );
}

function excludePreviewRows(endpoint: URL) {
  endpoint.searchParams.append('slug', 'not.ilike.preview-*');
  endpoint.searchParams.append('slug', 'not.ilike.test-*');
  endpoint.searchParams.append('slug', 'not.ilike.*-test');
  endpoint.searchParams.append('slug', 'not.ilike.*-e2e-*');
  endpoint.searchParams.append('name', 'not.ilike.preview *');
  endpoint.searchParams.append('name', 'not.ilike.test *');
  endpoint.searchParams.append('address', 'not.ilike.*preview*');
  endpoint.searchParams.append('address', 'not.ilike.*test way*');
}

async function fetchAllPublicViewRows<T>(endpoint: URL, headers: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PUBLIC_VIEW_PAGE_SIZE) {
    const pageEndpoint = new URL(endpoint);
    pageEndpoint.searchParams.set('offset', String(offset));
    pageEndpoint.searchParams.set('limit', String(PUBLIC_VIEW_PAGE_SIZE));
    const response = await fetch(pageEndpoint, { cache: 'no-store', headers });
    if (!response.ok) return [];
    const page = await response.json() as T[];
    rows.push(...page);
    if (page.length < PUBLIC_VIEW_PAGE_SIZE) return rows;
  }
}

export function projectPublicBuilding(row: Record<string, unknown>): Building {
  return {
    id: String(row.id), slug: String(row.slug), name: String(row.name), address: String(row.address), city: String(row.city), state: String(row.state),
    zip_code: row.zip_code as string | null, latitude: row.latitude as number | null, longitude: row.longitude as number | null,
    building_type: row.building_type as string | null, amenities: row.amenities as string[] | null, year_built: row.year_built as number | null,
    floors: (row.stories as number | null) ?? null, hero_image: row.hero_image as string | null, hero_image_url: row.hero_image_url as string | null,
    gallery: row.gallery as string[] | null, nearby_subway: row.nearby_subway as string[] | null, borough: row.borough as string | null,
    neighborhood: row.neighborhood as string | null, stories: row.stories as number | null, total_units: row.total_units as number | null,
    is_active: true, updated_at: String(row.updated_at),
  } as Building;
}

export async function fetchPublicBuildingBySlug(slug: string): Promise<Building | null> {
  if (!isPublicCatalogRow({ slug, name: '', address: '' })) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Public building data is not configured.');
  const endpoint = new URL('/rest/v1/public_buildings', url); endpoint.searchParams.set('select', '*'); endpoint.searchParams.set('slug', `eq.${slug}`); endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, { cache: 'no-store', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  if (!response.ok) throw new Error('Unable to load building.'); const rows = await response.json() as Record<string, unknown>[]; return rows[0] ? projectPublicBuilding(rows[0]) : null;
}

export async function fetchPublicBuildingInventoryBySlug(slug: string): Promise<BuildingInventorySummary> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { availabilityStatus: 'unavailable', bedroomMinimums: {}, bedroomAvailableCounts: {} };
  const endpoint = new URL('/rest/v1/public_building_rent_summary', url); endpoint.searchParams.set('select', '*'); endpoint.searchParams.set('building_slug', `eq.${slug}`); endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, { cache: 'no-store', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  if (!response.ok) return { availabilityStatus: 'unavailable', bedroomMinimums: {}, bedroomAvailableCounts: {} };
  const [row] = await response.json() as Array<{ studio_min_rent: number | null; one_bed_min_rent: number | null; two_bed_min_rent: number | null; three_bed_min_rent: number | null }>;
  if (!row) return { availabilityStatus: 'unavailable', bedroomMinimums: {}, bedroomAvailableCounts: {} };
  const bedroomMinimums = Object.fromEntries([[0, row.studio_min_rent], [1, row.one_bed_min_rent], [2, row.two_bed_min_rent], [3, row.three_bed_min_rent]].filter((entry): entry is [number, number] => typeof entry[1] === 'number'));
  return { availabilityStatus: Object.keys(bedroomMinimums).length ? 'available' : 'unavailable', bedroomMinimums, bedroomAvailableCounts: {} };
}

export async function fetchBuildingsPage({ page, pageSize, search = '', boroughs = [], neighborhoods = [], amenities = [], priceRanges = [], bedrooms = [], mapOnly = false }: { page: number; pageSize: number } & BuildingFilters): Promise<BuildingsPageResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Public building data is not configured.');
  const endpoint = new URL('/rest/v1/public_buildings', url);
  endpoint.searchParams.set('select', '*'); endpoint.searchParams.set('state', 'in.(NY,NJ)'); endpoint.searchParams.set('order', 'name.asc,id.asc');
  excludePreviewRows(endpoint);
  const hasRentFilters = priceRanges.length > 0 || bedrooms.length > 0;
  const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
  if (term) endpoint.searchParams.set('or', `(name.ilike.*${term}*,address.ilike.*${term}*,neighborhood.ilike.*${term}*,borough.ilike.*${term}*)`);
  const safeBoroughs = [...new Set(boroughs.filter((x) => ALLOWED_BOROUGHS.has(x)))];
  if (safeBoroughs.length === 1) endpoint.searchParams.set('borough', `eq.${safeBoroughs[0]}`); else if (safeBoroughs.length > 1) endpoint.searchParams.set('borough', `in.(${safeBoroughs.map((x) => `"${x}"`).join(',')})`);
  const safeNeighborhoods = [...new Set(neighborhoods.map((x) => x.replace(/"/g, '')).filter(Boolean))];
  if (safeNeighborhoods.length === 1) endpoint.searchParams.set('neighborhood', `eq.${safeNeighborhoods[0]}`); else if (safeNeighborhoods.length > 1) endpoint.searchParams.set('neighborhood', `in.(${safeNeighborhoods.map((x) => `"${x}"`).join(',')})`);
  const safeAmenities = [...new Set(amenities.filter((x) => ALLOWED_AMENITIES.has(x)))];
  if (safeAmenities.length) endpoint.searchParams.set('and', `(${safeAmenities.map((x) => `amenities.cs.{"${x}"}`).join(',')})`);
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Prefer: 'count=exact' };
  let candidateRows: Record<string, unknown>[];
  let unfilteredTotal = 0;
  if (mapOnly || hasRentFilters) {
    candidateRows = await fetchAllPublicViewRows<Record<string, unknown>>(endpoint, headers);
    unfilteredTotal = candidateRows.length;
  } else {
    endpoint.searchParams.set('offset', String((Math.max(1, page) - 1) * pageSize));
    endpoint.searchParams.set('limit', String(Math.min(500, Math.max(1, pageSize))));
    const response = await fetch(endpoint, { cache: 'no-store', headers });
    if (!response.ok) throw new Error('Unable to load buildings.');
    candidateRows = await response.json() as Record<string, unknown>[];
    unfilteredTotal = Number.parseInt(response.headers.get('content-range')?.split('/')[1] ?? '0', 10) || 0;
  }
  const candidateBuildings = candidateRows.filter(isPublicCatalogRow).map(projectPublicBuilding);
  const availability = new URL('/rest/v1/public_building_availability', url); availability.searchParams.set('select', '*'); availability.searchParams.set('order', 'building_slug.asc');
  const rentSummary = new URL('/rest/v1/public_building_rent_summary', url); rentSummary.searchParams.set('select', '*'); rentSummary.searchParams.set('order', 'building_slug.asc');
  const unitCounts = new URL('/rest/v1/public_building_unit_counts', url); unitCounts.searchParams.set('select', '*'); unitCounts.searchParams.set('order', 'building_slug.asc');
  const roommateCounts = new URL('/rest/v1/public_roommate_interest_counts', url); roommateCounts.searchParams.set('select', '*'); roommateCounts.searchParams.set('order', 'building_id.asc');
  type AvailabilityRow = { building_slug: string; availability_status: PublicAvailabilityStatus };
  type RentRow = { building_slug: string; studio_min_rent: number | null; one_bed_min_rent: number | null; two_bed_min_rent: number | null; three_bed_min_rent: number | null };
  type UnitCountRow = { building_slug: string; available_unit_count: number; studio_available_count: number; one_bed_available_count: number; two_bed_available_count: number; three_bed_available_count: number };
  type RoommateCountRow = { building_id: string; interested_count: number };
  const [availabilityRows, rentRows, unitCountRows, roommateRows] = await Promise.all([
    fetchAllPublicViewRows<AvailabilityRow>(availability, headers),
    fetchAllPublicViewRows<RentRow>(rentSummary, headers),
    fetchAllPublicViewRows<UnitCountRow>(unitCounts, headers),
    fetchAllPublicViewRows<RoommateCountRow>(roommateCounts, headers),
  ]);
  const bySlug = new Map<string, PublicAvailabilityStatus>();
  for (const row of availabilityRows) bySlug.set(row.building_slug, row.availability_status);
  const rents = new Map<string, Partial<Record<0 | 1 | 2 | 3, number>>>();
  for (const row of rentRows) rents.set(row.building_slug, Object.fromEntries([[0,row.studio_min_rent],[1,row.one_bed_min_rent],[2,row.two_bed_min_rent],[3,row.three_bed_min_rent]].filter((entry): entry is [number, number] => typeof entry[1] === 'number')));
  const availableCounts = new Map<string, number>();
  const bedroomAvailableCounts = new Map<string, Partial<Record<0 | 1 | 2 | 3, number>>>();
  for (const row of unitCountRows) {
    availableCounts.set(row.building_slug, row.available_unit_count);
    bedroomAvailableCounts.set(row.building_slug, { 0: row.studio_available_count, 1: row.one_bed_available_count, 2: row.two_bed_available_count, 3: row.three_bed_available_count });
  }
  const interestCounts = new Map<string, number>();
  for (const row of roommateRows) interestCounts.set(row.building_id, row.interested_count);
  const selectedBedrooms = bedrooms.filter((value) => ['0', '1', '2', '3', '4'].includes(value)).map(Number);
  const priceBounds = priceRanges.map((priceRange) => priceRange === '10000-plus' ? { min: 10000, max: Number.POSITIVE_INFINITY } : (() => { const match = /^(\d+)-(\d+)$/.exec(priceRange); return match ? { min: Number(match[1]), max: Number(match[2]) } : null; })()).filter((value): value is { min: number; max: number } => value != null);
  const rentFilteredBuildings = candidateBuildings.filter((building) => {
    const minimums = rents.get(building.slug) ?? {};
    const values = selectedBedrooms.length === 0 ? Object.values(minimums) : selectedBedrooms.map((bedroom) => minimums[bedroom as 0 | 1 | 2 | 3]);
    const knownRents = values.filter((value): value is number => typeof value === 'number');
    if (selectedBedrooms.length > 0 && knownRents.length === 0) return false;
    if (priceBounds.length > 0 && !knownRents.some((value) => priceBounds.some((range) => value >= range.min && value < range.max))) return false;
    return true;
  });
  const availabilitySortedBuildings = [...rentFilteredBuildings].sort((left, right) => {
    const leftCount = availableCounts.get(left.slug) ?? 0;
    const rightCount = availableCounts.get(right.slug) ?? 0;
    const countDifference = rightCount - leftCount;
    return countDifference || left.name.localeCompare(right.name);
  });
  const buildings = mapOnly ? availabilitySortedBuildings : hasRentFilters ? availabilitySortedBuildings.slice((Math.max(1, page) - 1) * pageSize, Math.max(1, page) * pageSize) : candidateBuildings;
  const inventoryByBuilding = Object.fromEntries(buildings.map((b) => {
    const availableCount = availableCounts.get(b.slug);
    return [b.id, { availabilityStatus: bySlug.get(b.slug) ?? 'unavailable', bedroomMinimums: rents.get(b.slug) ?? {}, bedroomAvailableCounts: bedroomAvailableCounts.get(b.slug) ?? {}, availableCount: availableCount != null && availableCount > 0 ? availableCount : undefined, roommateInterestCount: interestCounts.get(b.id) }];
  }));
  const total = mapOnly || hasRentFilters ? availabilitySortedBuildings.length : unfilteredTotal;
  return { buildings, total, inventoryByBuilding };
}

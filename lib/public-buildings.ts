import type { Building } from '@/lib/types';

export type PublicAvailabilityStatus = 'unavailable' | 'limited' | 'available';
export type BuildingInventorySummary = {
  availabilityStatus: PublicAvailabilityStatus;
  bedroomMinimums: Partial<Record<0 | 1 | 2 | 3, number>>;
  roommateInterestCount?: number;
  availableCount?: number; concessionText?: never; updatedAt?: never;
};
export type BuildingsPageResult = { buildings: Building[]; total: number; inventoryByBuilding: Record<string, BuildingInventorySummary> };
export type BuildingFilters = { search?: string; boroughs?: string[]; neighborhoods?: string[]; amenities?: string[]; priceRanges?: string[]; bedrooms?: string[]; bathrooms?: string[]; moveInDate?: string; moveInFlex?: string[]; mapOnly?: boolean };

const ALLOWED_BOROUGHS = new Set(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']);
const ALLOWED_AMENITIES = new Set(['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed', 'No Pets Allowed', 'Elevator', 'Gym', 'Doorman', 'Laundry In Building', 'In-Unit W/D Available', 'Dishwasher', 'Air Conditioning', 'Outdoor Space', 'Pool', 'Parking', 'Bike Storage', 'Package Room', 'Storage Available', 'Coworking Space', 'Lounge', 'Playroom', 'Wheelchair Accessible']);

const PUBLIC_VIEW_PAGE_SIZE = 1000;

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

function publicBuilding(row: Record<string, unknown>): Building {
  return {
    id: String(row.id), slug: String(row.slug), name: String(row.name), address: String(row.address), city: String(row.city), state: String(row.state),
    zip_code: row.zip_code as string | null, latitude: row.latitude as number | null, longitude: row.longitude as number | null,
    building_type: row.building_type as string | null, amenities: row.amenities as string[] | null, year_built: row.year_built as number | null,
    floors: (row.stories as number | null) ?? null, hero_image: row.hero_image as string | null, hero_image_url: row.hero_image_url as string | null,
    gallery: row.gallery as string[] | null, nearby_subway: row.nearby_subway as string[] | null, borough: row.borough as string | null,
    neighborhood: row.neighborhood as string | null, stories: row.stories as number | null, total_units: row.total_units as number | null,
    is_active: true, updated_at: String(row.updated_at), neighborhood_id: null, description: null, seo_title: null, seo_description: null,
    faqs: null, nearby_grocery: null, nearby_restaurants: null, transportation: null, neighborhood_summary: null, contact_email: null,
    contact_phone: null, building_id: null, building_name: null, street_address: null, building_class: null, luxury: null, pet_friendly: null,
    official_building_website: null, apply_online_url: null, virtual_tour_url: null, building_phone: null, building_leasing_email: null,
    management_company: null, developer: null, current_owner: null, source_url: null, last_verified_date: null, search_keywords: [], google_place_id: null,
    logo_url: null, gallery_folder: null, partnership_status: 'Not Contacted', leasing_contact_name: null, leasing_phone: null, data_confidence: 'Low',
    ai_summary: null, updated_by: null, created_at: String(row.updated_at), neighborhoods: null,
  };
}

export async function fetchPublicBuildingBySlug(slug: string): Promise<Building | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Public building data is not configured.');
  const endpoint = new URL('/rest/v1/public_buildings', url); endpoint.searchParams.set('select', '*'); endpoint.searchParams.set('slug', `eq.${slug}`); endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, { cache: 'no-store', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  if (!response.ok) throw new Error('Unable to load building.'); const rows = await response.json() as Record<string, unknown>[]; return rows[0] ? publicBuilding(rows[0]) : null;
}

export async function fetchPublicBuildingInventoryBySlug(slug: string): Promise<BuildingInventorySummary> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { availabilityStatus: 'unavailable', bedroomMinimums: {}, availableCount: 0 };
  const endpoint = new URL('/rest/v1/public_building_rent_summary', url); endpoint.searchParams.set('select', '*'); endpoint.searchParams.set('building_slug', `eq.${slug}`); endpoint.searchParams.set('limit', '1');
  const response = await fetch(endpoint, { cache: 'no-store', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  if (!response.ok) return { availabilityStatus: 'unavailable', bedroomMinimums: {}, availableCount: 0 };
  const [row] = await response.json() as Array<{ studio_min_rent: number | null; one_bed_min_rent: number | null; two_bed_min_rent: number | null; three_bed_min_rent: number | null }>;
  if (!row) return { availabilityStatus: 'unavailable', bedroomMinimums: {}, availableCount: 0 };
  const bedroomMinimums = Object.fromEntries([[0, row.studio_min_rent], [1, row.one_bed_min_rent], [2, row.two_bed_min_rent], [3, row.three_bed_min_rent]].filter((entry): entry is [number, number] => typeof entry[1] === 'number'));
  return { availabilityStatus: Object.keys(bedroomMinimums).length ? 'available' : 'unavailable', bedroomMinimums, availableCount: 0 };
}

export async function fetchBuildingsPage({ page, pageSize, search = '', boroughs = [], neighborhoods = [], amenities = [], priceRanges = [], bedrooms = [] }: { page: number; pageSize: number } & BuildingFilters): Promise<BuildingsPageResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Public building data is not configured.');
  const endpoint = new URL('/rest/v1/public_buildings', url);
  endpoint.searchParams.set('select', '*'); endpoint.searchParams.set('state', 'in.(NY,NJ)'); endpoint.searchParams.set('order', 'name.asc');
  const hasRentFilters = priceRanges.length > 0 || bedrooms.length > 0;
  endpoint.searchParams.set('offset', hasRentFilters ? '0' : String((Math.max(1, page) - 1) * pageSize)); endpoint.searchParams.set('limit', hasRentFilters ? '500' : String(Math.min(500, Math.max(1, pageSize))));
  const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
  if (term) endpoint.searchParams.set('or', `(name.ilike.*${term}*,address.ilike.*${term}*,neighborhood.ilike.*${term}*,borough.ilike.*${term}*)`);
  const safeBoroughs = [...new Set(boroughs.filter((x) => ALLOWED_BOROUGHS.has(x)))];
  if (safeBoroughs.length === 1) endpoint.searchParams.set('borough', `eq.${safeBoroughs[0]}`); else if (safeBoroughs.length > 1) endpoint.searchParams.set('borough', `in.(${safeBoroughs.map((x) => `"${x}"`).join(',')})`);
  const safeNeighborhoods = [...new Set(neighborhoods.map((x) => x.replace(/"/g, '')).filter(Boolean))];
  if (safeNeighborhoods.length === 1) endpoint.searchParams.set('neighborhood', `eq.${safeNeighborhoods[0]}`); else if (safeNeighborhoods.length > 1) endpoint.searchParams.set('neighborhood', `in.(${safeNeighborhoods.map((x) => `"${x}"`).join(',')})`);
  const safeAmenities = [...new Set(amenities.filter((x) => ALLOWED_AMENITIES.has(x)))];
  if (safeAmenities.length) endpoint.searchParams.set('and', `(${safeAmenities.map((x) => `amenities.cs.{"${x}"}`).join(',')})`);
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Prefer: 'count=exact' };
  const response = await fetch(endpoint, { cache: 'no-store', headers }); if (!response.ok) throw new Error('Unable to load buildings.');
  const candidateBuildings = (await response.json() as Record<string, unknown>[]).map(publicBuilding);
  const availability = new URL('/rest/v1/public_building_availability', url); availability.searchParams.set('select', '*');
  const rentSummary = new URL('/rest/v1/public_building_rent_summary', url); rentSummary.searchParams.set('select', '*');
  const unitCounts = new URL('/rest/v1/public_building_unit_counts', url); unitCounts.searchParams.set('select', '*');
  const roommateCounts = new URL('/rest/v1/public_roommate_interest_counts', url); roommateCounts.searchParams.set('select', '*');
  type AvailabilityRow = { building_slug: string; availability_status: PublicAvailabilityStatus };
  type RentRow = { building_slug: string; studio_min_rent: number | null; one_bed_min_rent: number | null; two_bed_min_rent: number | null; three_bed_min_rent: number | null };
  type UnitCountRow = { building_slug: string; available_unit_count: number };
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
  for (const row of unitCountRows) availableCounts.set(row.building_slug, row.available_unit_count);
  const interestCounts = new Map<string, number>();
  for (const row of roommateRows) interestCounts.set(row.building_id, row.interested_count);
  const selectedBedrooms = bedrooms.filter((value) => ['0', '1', '2', '3', '4'].includes(value)).map(Number);
  const priceBounds = priceRanges.map((priceRange) => priceRange === '10000-plus' ? { min: 10000, max: Number.POSITIVE_INFINITY } : (() => { const match = /^(\d+)-(\d+)$/.exec(priceRange); return match ? { min: Number(match[1]), max: Number(match[2]) } : null; })()).filter((value): value is { min: number; max: number } => value != null);
  const rentFilteredBuildings = candidateBuildings.filter((building) => {
    const minimums = rents.get(building.slug) ?? {};
    const values = selectedBedrooms.length === 0 ? Object.values(minimums) : selectedBedrooms.map((bedroom) => minimums[bedroom as 0 | 1 | 2 | 3]);
    const knownRents = values.filter((value): value is number => typeof value === 'number').map((value) => Math.ceil(value / 50) * 50);
    if (selectedBedrooms.length > 0 && knownRents.length === 0) return false;
    if (priceBounds.length > 0 && !knownRents.some((value) => priceBounds.some((range) => value >= range.min && value < range.max))) return false;
    return true;
  });
  const buildings = hasRentFilters ? rentFilteredBuildings.slice((Math.max(1, page) - 1) * pageSize, Math.max(1, page) * pageSize) : candidateBuildings;
  const inventoryByBuilding = Object.fromEntries(buildings.map((b) => [b.id, { availabilityStatus: bySlug.get(b.slug) ?? 'unavailable', bedroomMinimums: rents.get(b.slug) ?? {}, availableCount: availableCounts.get(b.slug) ?? 0, roommateInterestCount: interestCounts.get(b.id) }]));
  const total = hasRentFilters ? rentFilteredBuildings.length : Number.parseInt(response.headers.get('content-range')?.split('/')[1] ?? '0', 10) || 0;
  return { buildings, total, inventoryByBuilding };
}

import { BuildingBrowser } from '@/components/building-browser';
import { fetchBuildingsPage, type BuildingsPageResult } from '@/lib/public-buildings';

const PAGE_SIZE = 48;

type BuildingsSearchParams = {
  page?: string;
  q?: string;
  borough?: string | string[];
  neighborhood?: string | string[];
  amenity?: string | string[];
  price?: string | string[];
  bedrooms?: string | string[];
  bathrooms?: string | string[];
  moveInDate?: string;
  moveInFlex?: string | string[];
};

export default async function BuildingsPage({ searchParams }: { searchParams: Promise<BuildingsSearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const amenities = Array.isArray(params.amenity) ? params.amenity : params.amenity ? [params.amenity] : [];
  const boroughs = Array.isArray(params.borough) ? params.borough : params.borough ? [params.borough] : [];
  const neighborhoods = Array.isArray(params.neighborhood) ? params.neighborhood : params.neighborhood ? [params.neighborhood] : [];
  const filters = {
    search: params.q ?? '',
    boroughs,
    neighborhoods,
    amenities,
    priceRanges: Array.isArray(params.price) ? params.price : params.price ? [params.price] : [],
    bedrooms: Array.isArray(params.bedrooms) ? params.bedrooms : params.bedrooms ? [params.bedrooms] : [],
    bathrooms: Array.isArray(params.bathrooms) ? params.bathrooms : params.bathrooms ? [params.bathrooms] : [],
    moveInDate: params.moveInDate ?? '',
    moveInFlex: Array.isArray(params.moveInFlex) ? params.moveInFlex : params.moveInFlex ? [params.moveInFlex] : [],
  };
  let result: BuildingsPageResult = { buildings: [], total: 0, inventoryByBuilding: {} };
  let error: string | null = null;
  try {
    result = await fetchBuildingsPage({ page, pageSize: PAGE_SIZE, ...filters });
  } catch {
    error = 'Unable to load buildings.';
  }
  return <BuildingBrowser key={JSON.stringify({ page, ...filters })} initialPage={page} initialFilters={filters} initialResult={result} initialError={error} mode="buildings" />;
}

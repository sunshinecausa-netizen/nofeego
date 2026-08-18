import { AgentHomeBrowser } from '@/components/agent-home-browser';
import { fetchBuildingsPage, type BuildingsPageResult } from '@/lib/public-buildings';
import { canUseProductionPublicSnapshot, getProductionPublicSnapshotPage } from '@/lib/production-public-snapshot';

const PAGE_SIZE = 48;

type AgentSearchParams = {
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
  publicSnapshot?: string;
};

const list = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];

export default async function AgentHome({ searchParams }: { searchParams: Promise<AgentSearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const filters = {
    search: params.q ?? '',
    boroughs: list(params.borough),
    neighborhoods: list(params.neighborhood),
    amenities: list(params.amenity),
    priceRanges: list(params.price),
    bedrooms: list(params.bedrooms),
    bathrooms: list(params.bathrooms),
    moveInDate: params.moveInDate ?? '',
    moveInFlex: list(params.moveInFlex),
  };
  let result: BuildingsPageResult = { buildings: [], total: 0, inventoryByBuilding: {} };
  let error: string | null = null;

  if (canUseProductionPublicSnapshot(process.env.VERCEL_ENV ?? process.env.NODE_ENV, params.publicSnapshot)) {
    result = getProductionPublicSnapshotPage({ page, pageSize: PAGE_SIZE, ...filters });
  } else {
    try {
      result = await fetchBuildingsPage({ page, pageSize: PAGE_SIZE, ...filters });
    } catch {
      error = 'Unable to load buildings.';
    }
  }

  return <AgentHomeBrowser initialPage={page} initialFilters={filters} initialResult={result} initialError={error} publicSnapshot={params.publicSnapshot} />;
}

import { BuildingBrowser } from '@/components/building-browser';
import { fetchBuildingsPage, type BuildingsPageResult } from '@/lib/public-buildings';

const PAGE_SIZE = 24;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const query = params.q ?? '';
  let result: BuildingsPageResult = { buildings: [], total: 0, inventoryByBuilding: {} };
  let error: string | null = null;
  try {
    result = await fetchBuildingsPage({ page, pageSize: PAGE_SIZE, search: query });
  } catch {
    error = 'Unable to load buildings.';
  }
  return <BuildingBrowser key={`${page}:${query}`} initialPage={page} initialQuery={query} initialResult={result} initialError={error} mode="search" />;
}

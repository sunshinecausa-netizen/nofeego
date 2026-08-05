import { BuildingBrowser } from '@/components/building-browser';
import { fetchBuildingsPage, type BuildingsPageResult } from '@/lib/public-buildings';

const PAGE_SIZE = 24;

export default async function BuildingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  let result: BuildingsPageResult = { buildings: [], total: 0 };
  let error: string | null = null;
  try {
    result = await fetchBuildingsPage({ page, pageSize: PAGE_SIZE });
  } catch {
    error = 'Unable to load buildings.';
  }
  return <BuildingBrowser key={page} initialPage={page} initialResult={result} initialError={error} mode="buildings" />;
}

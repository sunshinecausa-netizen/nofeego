import { BuildingBrowser } from '@/components/building-browser';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  return <BuildingBrowser key={`${page}:${params.q ?? ''}`} initialPage={page} initialQuery={params.q ?? ''} mode="search" />;
}

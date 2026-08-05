import { BuildingBrowser } from '@/components/building-browser';

export default async function BuildingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  return <BuildingBrowser key={page} initialPage={page} mode="buildings" />;
}

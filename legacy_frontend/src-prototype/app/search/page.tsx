import { BuildingCatalog } from "@/components/BuildingCatalog";

type SearchPageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  return <BuildingCatalog initialPage={page} initialQuery={params.q ?? ""} mode="search" />;
}

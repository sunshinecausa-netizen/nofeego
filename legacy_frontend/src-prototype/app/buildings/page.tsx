import { BuildingCatalog } from "@/components/BuildingCatalog";

type BuildingsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function BuildingsPage({ searchParams }: BuildingsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  return <BuildingCatalog initialPage={page} mode="buildings" />;
}

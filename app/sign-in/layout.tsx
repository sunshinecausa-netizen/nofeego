import { BuildingBrowser } from '@/components/building-browser';
import { fetchBuildingsPage, type BuildingsPageResult } from '@/lib/public-buildings';

const filters = {
  search: '',
  boroughs: [] as string[],
  neighborhoods: [] as string[],
  amenities: [] as string[],
  priceRanges: [] as string[],
  bedrooms: [] as string[],
  bathrooms: [] as string[],
  moveInDate: '',
  moveInFlex: [] as string[],
};

export default async function SignInLayout({ children }: { children: React.ReactNode }) {
  let result: BuildingsPageResult = { buildings: [], total: 0, inventoryByBuilding: {} };
  let error: string | null = null;
  try {
    result = await fetchBuildingsPage({ page: 1, pageSize: 48, ...filters });
  } catch {
    error = 'Unable to load buildings.';
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[680px] w-full max-w-full overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <BuildingBrowser initialPage={1} initialFilters={filters} initialResult={result} initialError={error} mode="buildings" />
      </div>
      <div className="absolute inset-0 z-20 flex w-full items-center justify-end bg-[hsl(var(--navy)/.18)] p-3 sm:p-6 lg:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-background/60" />
        <div className="relative z-10 flex w-full justify-center lg:justify-end">{children}</div>
      </div>
    </div>
  );
}

export function BuildingBrowserLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-label="Loading buildings" aria-busy="true">
      <div className="mb-8 h-12 w-64 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-10 max-w-3xl animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />)}
      </div>
    </div>
  );
}

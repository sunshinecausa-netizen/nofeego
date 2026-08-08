export function BuildingBrowserLoading() {
  return (
    <div className="flex min-h-screen flex-col md:h-[calc(100dvh-4rem)] md:min-h-0 md:overflow-hidden" aria-label="Loading buildings" aria-busy="true">
      <div className="shrink-0 px-4 py-3"><div className="h-9 w-52 animate-pulse rounded bg-muted" /></div>
      <div className="shrink-0 border-y border-border bg-white p-3"><div className="grid gap-2 md:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-muted" />)}</div></div>
      <div className="min-h-0 flex-1 md:grid md:grid-cols-2 min-[1100px]:grid-cols-[55fr_45fr]">
        <div className="hidden animate-pulse bg-muted/70 md:block" />
        <div className="space-y-3 overflow-hidden bg-muted/20 p-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-[232px] animate-pulse rounded-2xl border border-border bg-white" />)}
        </div>
      </div>
    </div>
  );
}

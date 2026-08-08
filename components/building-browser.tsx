'use client';

import { FormEvent, useCallback, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Building2, ChevronDown, ChevronLeft, ChevronRight, GitCompareArrows, List, Map, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BuildingMap } from '@/components/building-map';
import { BuildingResultCard } from '@/components/building-result-card';
import type { Building } from '@/lib/types';
import type { BuildingFilters, BuildingsPageResult } from '@/lib/public-buildings';

const PAGE_SIZE = 24;
type NeighborhoodOption = readonly [value: string, label: string];
const neighborhoodOptions = (items: ReadonlyArray<string>): NeighborhoodOption[] => items.map((item) => [item, item]);
const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'] as const;
const NEIGHBORHOOD_GROUPS: ReadonlyArray<{ borough: string; title: string; options: ReadonlyArray<NeighborhoodOption> }> = [
  { borough: 'Manhattan', title: 'Downtown', options: [...neighborhoodOptions(['Battery Park City', 'Chelsea', 'Chinatown', 'Civic Center', 'East Village', 'Financial District', 'Flatiron District']), ['Gramercy', 'Gramercy Park'], ...neighborhoodOptions(['Greenwich Village', 'Little Italy', 'Lower East Side', 'NoHo', 'NoMad', 'Nolita', 'Seaport District', 'SoHo', 'Tribeca', 'Union Square', 'West Village'])] },
  { borough: 'Manhattan', title: 'Midtown East', options: neighborhoodOptions(['Beekman Place', 'Kips Bay', 'Midtown', 'Midtown East', 'Midtown South', 'Murray Hill', 'Roosevelt Island', 'Stuy Town / PC Village', 'Sutton Place', 'Tudor City', 'Turtle Bay']) },
  { borough: 'Manhattan', title: 'Midtown West', options: neighborhoodOptions(['Central Park South', "Hell's Kitchen", 'Hudson Yards', 'Midtown West']) },
  { borough: 'Manhattan', title: 'Upper East Side', options: neighborhoodOptions(['Carnegie Hill', 'Upper East Side']) },
  { borough: 'Manhattan', title: 'Upper West Side', options: neighborhoodOptions(['Central Park West', 'Lincoln Square', 'Manhattan Valley', 'Morningside Heights', 'Upper West Side']) },
  { borough: 'Manhattan', title: 'Upper Manhattan', options: neighborhoodOptions(['East Harlem', 'Fort George', 'Hamilton Heights', 'Harlem', 'Hudson Heights', 'Inwood', 'Mt. Morris Park', 'Washington Heights']) },
  { borough: 'Brooklyn', title: 'Brooklyn neighborhoods', options: neighborhoodOptions(['Brooklyn Heights', 'Coney Island', 'DUMBO', 'Downtown Brooklyn', 'Fort Greene', 'Gowanus', 'Greenpoint', 'Prospect Heights', 'Sheepshead Bay', 'Williamsburg']) },
  { borough: 'Queens', title: 'Queens neighborhoods', options: neighborhoodOptions(['Long Island City', 'Woodside']) },
  { borough: 'Bronx', title: 'Bronx neighborhoods', options: neighborhoodOptions(['Mott Haven', 'Riverdale']) },
  { borough: 'Staten Island', title: 'Staten Island neighborhoods', options: [['Stapleton', 'Stapleton'] as NeighborhoodOption] },
];
const PRICE_RANGES: ReadonlyArray<readonly [string, string]> = [...Array.from({ length: 8 }, (_, index) => {
  const min = 2000 + index * 1000;
  const max = min + 1000;
  return [`${min}-${max}`, `$${min.toLocaleString()}–$${(max - 1).toLocaleString()}`] as const;
}), ['10000-plus', '$10,000+']];
const DATE_SPECIFIC_MOVE_IN_OPTIONS = new Set(['exact', 'exact_7', 'exact_15']);
const PET_OPTIONS = [
  ['Small Dogs Allowed', 'Allows small dogs'],
  ['Large Dogs Allowed', 'Allows large dogs'],
  ['Cats Allowed', 'Allows cats'],
  ['No Pets Allowed', 'No pets allowed'],
] as const;
const PRIMARY_AMENITIES = [
  ['Elevator', 'Elevator'],
  ['Gym', 'Gym'],
  ['In-Unit W/D Available', 'In-unit Laundry'],
  ['Doorman', 'Doorman'],
  ['Parking', 'On-site Parking'],
  ['Pool', 'Swimming Pool'],
  ['Outdoor Space', 'Private Outdoor Space'],
  ['Pets Allowed', 'Pets Allowed'],
] as const;
const MORE_AMENITIES = [
  ['Laundry In Building', 'On-site Laundry'],
  ['Air Conditioning', 'Air-conditioner'],
  ['Bike Storage', 'Bike Storage'],
  ['Package Room', 'Package Room'],
  ['Storage Available', 'Storage Available'],
  ['Coworking Space', 'Coworking Space'],
  ['Lounge', 'Lounge'],
  ['Playroom', 'Playroom'],
  ['Wheelchair Accessible', 'Wheelchair Accessible'],
] as const;

type Props = {
  initialPage: number;
  initialQuery?: string;
  initialFilters?: BuildingFilters;
  initialResult: BuildingsPageResult;
  initialError?: string | null;
  mode: 'buildings' | 'search';
};

export function BuildingBrowser({ initialPage, initialQuery = '', initialFilters, initialResult: result, initialError = null, mode }: Props) {
  const starting = {
    search: initialFilters?.search ?? initialQuery,
    boroughs: initialFilters?.boroughs ?? [],
    neighborhoods: initialFilters?.neighborhoods ?? [],
    amenities: initialFilters?.amenities ?? [],
    priceRange: initialFilters?.priceRange ?? '',
    bedrooms: initialFilters?.bedrooms ?? '',
    bathrooms: initialFilters?.bathrooms ?? '',
    moveInDate: initialFilters?.moveInDate ?? '',
    moveInFlex: initialFilters?.moveInFlex ?? 'flexible',
  };
  const [query, setQuery] = useState(starting.search);
  const [boroughs, setBoroughs] = useState<string[]>(starting.boroughs);
  const [neighborhoods, setNeighborhoods] = useState<string[]>(starting.neighborhoods);
  const [amenities, setAmenities] = useState<string[]>(starting.amenities);
  const [priceRange, setPriceRange] = useState(starting.priceRange);
  const [bedrooms, setBedrooms] = useState(starting.bedrooms);
  const [bathrooms, setBathrooms] = useState(starting.bathrooms);
  const [moveInDate, setMoveInDate] = useState(starting.moveInDate);
  const [moveInFlex, setMoveInFlex] = useState(starting.moveInFlex);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [comparedBuildings, setComparedBuildings] = useState<Building[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const error = initialError;
  const route = mode === 'search' ? '/search' : '/buildings';
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeFilterCount = [starting.search, starting.priceRange, starting.bedrooms, starting.bathrooms, starting.moveInFlex !== 'flexible' ? starting.moveInFlex : '', DATE_SPECIFIC_MOVE_IN_OPTIONS.has(starting.moveInFlex) ? starting.moveInDate : ''].filter(Boolean).length + starting.boroughs.length + starting.neighborhoods.length + starting.amenities.length;

  function href(page: number, values: BuildingFilters = starting) {
    const params = new URLSearchParams();
    if (values.search?.trim()) params.set('q', values.search.trim());
    values.boroughs?.forEach((item) => params.append('borough', item));
    values.neighborhoods?.forEach((item) => params.append('neighborhood', item));
    values.amenities?.forEach((item) => params.append('amenity', item));
    if (values.priceRange) params.set('price', values.priceRange);
    if (values.bedrooms) params.set('bedrooms', values.bedrooms);
    if (values.bathrooms) params.set('bathrooms', values.bathrooms);
    if (values.moveInFlex && values.moveInFlex !== 'flexible') params.set('moveInFlex', values.moveInFlex);
    if (values.moveInFlex && DATE_SPECIFIC_MOVE_IN_OPTIONS.has(values.moveInFlex) && values.moveInDate) params.set('moveInDate', values.moveInDate);
    if (page > 1) params.set('page', String(page));
    return `${route}${params.size ? `?${params}` : ''}`;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.assign(href(1, { search: query, boroughs, neighborhoods, amenities, priceRange, bedrooms, bathrooms, moveInDate, moveInFlex }));
  }

  function toggleAmenity(value: string, checked: boolean) {
    setAmenities((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
  }

  function toggleNeighborhood(value: string, checked: boolean) {
    setNeighborhoods((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
  }

  function toggleNeighborhoodGroup(options: ReadonlyArray<NeighborhoodOption>, checked: boolean) {
    const groupValues = new Set(options.map(([value]) => value));
    setNeighborhoods((current) => checked ? [...new Set([...current, ...groupValues])] : current.filter((item) => !groupValues.has(item)));
  }

  function toggleBorough(value: string, checked: boolean) {
    setBoroughs((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
    if (!checked) {
      const hiddenNeighborhoods = new Set(NEIGHBORHOOD_GROUPS.filter((group) => group.borough === value).flatMap((group) => group.options.map(([option]) => option)));
      setNeighborhoods((current) => current.filter((item) => !hiddenNeighborhoods.has(item)));
    }
  }

  const selectBuilding = useCallback((id: string) => {
    setSelectedBuildingId(id);
    window.requestAnimationFrame(() => document.querySelector(`[data-building-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [setSelectedBuildingId]);

  function toggleCompare(building: Building, checked: boolean) {
    setComparedBuildings((current) => checked ? (current.some((item) => item.id === building.id) ? current : [...current, building]) : current.filter((item) => item.id !== building.id));
  }

  const compactFilters = (
    <form onSubmit={onSubmit} role="search" className="border-y border-border bg-white px-3 py-3 shadow-sm sm:px-5">
      <div className="grid items-end gap-2 md:grid-cols-6 min-[1100px]:grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(120px,1fr))_auto]">
        <div className="md:col-span-2 min-[1100px]:col-span-1"><label htmlFor="building-search" className="mb-1 block text-xs font-medium text-muted-foreground">Building or neighborhood</label><Input id="building-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or address" /></div>
        <div><label htmlFor="price-range" className="mb-1 block text-xs font-medium text-muted-foreground">Price</label><select id="price-range" value={priceRange} onChange={(event) => setPriceRange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Any price</option>{PRICE_RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label htmlFor="bedrooms" className="mb-1 block text-xs font-medium text-muted-foreground">Bedrooms</label><select id="bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Any</option>{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}+</option>)}</select></div>
        <div><label htmlFor="bathrooms" className="mb-1 block text-xs font-medium text-muted-foreground">Bathrooms</label><select id="bathrooms" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Any</option>{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}+</option>)}</select></div>
        <div><label htmlFor="move-in-flex" className="mb-1 block text-xs font-medium text-muted-foreground">Move-in</label><select id="move-in-flex" value={moveInFlex} onChange={(event) => setMoveInFlex(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="flexible">Flexible</option><option value="this_month">ASAP this month</option><option value="end_this_month">End of this month</option><option value="early_next_month">Early next month</option><option value="middle_next_month">Middle of next month</option><option value="end_next_month">End of next month</option><option value="exact">Exact date</option><option value="exact_7">Exact date ±7 days</option><option value="exact_15">Exact date ±15 days</option></select></div>
        <Button type="submit" className="min-h-10"><Search className="mr-2 h-4 w-4" />Apply</Button>
      </div>
      {DATE_SPECIFIC_MOVE_IN_OPTIONS.has(moveInFlex) && <div className="mt-2 max-w-52"><label htmlFor="move-in-date" className="mb-1 block text-xs text-muted-foreground">Move-in date</label><Input id="move-in-date" type="date" value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} /></div>}
      <details className="group mt-2" open={activeFilterCount > 0 ? undefined : false}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary"><SlidersHorizontal className="h-4 w-4" />More filters{activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount} active</Badge>}<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
        <div className="max-h-[42vh] space-y-4 overflow-y-auto border-t border-border pt-3">
          <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Borough</h3><div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-5">{BOROUGHS.map((borough) => <label key={borough} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={boroughs.includes(borough)} onCheckedChange={(checked) => toggleBorough(borough, checked === true)} />{borough}</label>)}</div></section>
          {NEIGHBORHOOD_GROUPS.filter((group) => boroughs.includes(group.borough)).map((group) => <section key={`${group.borough}:${group.title}`} className="border-t border-border/60 pt-3"><label className="mb-2 flex min-h-10 cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary"><Checkbox checked={group.options.every(([value]) => neighborhoods.includes(value))} onCheckedChange={(checked) => toggleNeighborhoodGroup(group.options, checked === true)} />{group.title}</label><div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-5">{group.options.map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={neighborhoods.includes(value)} onCheckedChange={(checked) => toggleNeighborhood(value, checked === true)} />{label}</label>)}</div></section>)}
          <fieldset className="border-t border-border/60 pt-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Amenities</legend><div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-5">{[...PRIMARY_AMENITIES, ...PET_OPTIONS, ...MORE_AMENITIES].map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={amenities.includes(value)} onCheckedChange={(checked) => toggleAmenity(value, checked === true)} />{label}</label>)}</div></fieldset>
          {activeFilterCount > 0 && <div className="flex justify-end"><Button asChild type="button" variant="outline"><Link href={route}><X className="mr-2 h-4 w-4" />Clear filters</Link></Button></div>}
        </div>
      </details>
    </form>
  );

  const resultCards = result.buildings.map((building) => (
    <BuildingResultCard
      key={building.id}
      building={building}
      inventory={result.inventoryByBuilding[building.id]}
      compared={comparedBuildings.some((item) => item.id === building.id)}
      highlighted={selectedBuildingId === building.id || hoveredBuildingId === building.id}
      onCompareChange={toggleCompare}
      onHover={setHoveredBuildingId}
      onSelect={setSelectedBuildingId}
    />
  ));

  if (error) return <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center" role="alert"><AlertCircle className="mb-3 h-10 w-10 text-destructive" /><h1 className="mb-1 text-xl font-semibold">We couldn&apos;t load the buildings</h1><p className="mb-4 text-sm text-muted-foreground">{error}</p><Button type="button" onClick={() => window.location.reload()}>Try again</Button></div>;
  if (result.buildings.length === 0) return <><div className="px-3 pt-4 sm:px-5"><h1 className="font-serif text-2xl font-bold">Buildings</h1></div>{compactFilters}<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center"><Building2 className="mb-3 h-10 w-10 text-muted-foreground" /><h2 className="mb-1 text-lg font-semibold">No buildings found</h2><p className="mb-4 text-sm text-muted-foreground">Try adjusting or clearing one or more filters.</p><Button asChild variant="outline"><Link href={route}>View all buildings</Link></Button></div></>;

  if (mode === 'search') return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Search results</p><h1 className="font-serif text-3xl font-bold">Buildings</h1></div><p className="text-sm text-muted-foreground">Showing {(initialPage - 1) * PAGE_SIZE + 1}–{Math.min(initialPage * PAGE_SIZE, result.total)} of {result.total}</p></div>
      {compactFilters}
      <div className="mt-4 space-y-3">{resultCards}</div>
      <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Buildings pagination"><Button asChild={initialPage > 1} variant="outline" disabled={initialPage <= 1}>{initialPage > 1 ? <Link href={href(initialPage - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Link> : <span>Previous</span>}</Button><span className="text-sm text-muted-foreground">Page {initialPage} of {pageCount}</span><Button asChild={initialPage < pageCount} variant="outline" disabled={initialPage >= pageCount}>{initialPage < pageCount ? <Link href={href(initialPage + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Link> : <span>Next</span>}</Button></nav>
    </div>
  );

  const mapItems = result.buildings.map((building) => ({ id: building.id, slug: building.slug, name: building.name, latitude: building.latitude, longitude: building.longitude }));

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-[calc(100dvh-4rem)] md:min-h-0 md:overflow-hidden">
      <header className="flex shrink-0 items-end justify-between gap-3 px-3 py-3 sm:px-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Verified New York buildings</p><h1 className="font-serif text-2xl font-bold sm:text-3xl">Buildings</h1></div><p className="text-sm text-muted-foreground">{result.total} matching buildings</p></header>
      <div className="shrink-0">{compactFilters}</div>
      <div className="min-h-0 flex-1 md:grid md:grid-cols-2 min-[1100px]:grid-cols-[55fr_45fr]">
        <section className="hidden min-h-0 overflow-hidden border-r border-border md:block" aria-label="Building map panel">
          <BuildingMap buildings={mapItems} hoveredBuildingId={hoveredBuildingId} selectedBuildingId={selectedBuildingId} onBuildingSelect={selectBuilding} className="h-full min-h-0 rounded-none border-0" />
        </section>
        <section className="min-h-0 bg-muted/25 md:overflow-y-auto" aria-label="Building results list">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4"><p className="text-sm font-medium">{result.total} results</p><Button type="button" size="sm" variant="outline" className="min-h-11 md:hidden" onClick={() => setMobileView('map')}><Map className="mr-2 h-4 w-4" />Map</Button></div>
          <div className="space-y-3 p-3 sm:p-4">{resultCards}</div>
        </section>
      </div>

      {mobileView === 'map' && <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden"><div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3"><Button type="button" variant="outline" className="min-h-11" onClick={() => setMobileView('list')}><List className="mr-2 h-4 w-4" />List</Button><span className="text-sm font-semibold">{result.total} buildings</span></div><BuildingMap buildings={mapItems} hoveredBuildingId={hoveredBuildingId} selectedBuildingId={selectedBuildingId} onBuildingSelect={selectBuilding} className="min-h-0 flex-1 rounded-none border-0" /></div>}

      {comparedBuildings.length > 0 && <>
        {compareOpen && <div className="fixed bottom-20 left-3 right-3 z-40 max-h-[55vh] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-2xl md:left-auto md:w-[min(720px,calc(100vw-2rem))]"><div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Selected buildings</h2><Button type="button" size="icon" variant="ghost" aria-label="Close comparison preview" onClick={() => setCompareOpen(false)}><X className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-2">{comparedBuildings.map((building) => <div key={building.id} className="rounded-xl border border-border p-3"><p className="font-semibold">{building.name}</p><p className="mb-2 text-xs text-muted-foreground">{building.neighborhood ?? building.borough ?? 'New York metro'}</p><p className="text-sm">{result.inventoryByBuilding[building.id] ? `${result.inventoryByBuilding[building.id].availableCount} units available` : 'Contact for availability'}</p><Button asChild variant="link" className="h-auto px-0"><Link href={`/buildings/${building.slug}`}>View building</Link></Button></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Comparison is stored only for this page session. Persistent saved comparisons can be added later.</p></div>}
        <div className="fixed bottom-3 left-1/2 z-40 flex w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary/20 bg-white px-3 py-2 shadow-2xl"><GitCompareArrows className="h-5 w-5 shrink-0 text-primary" /><p className="min-w-0 flex-1 truncate text-sm font-semibold">{comparedBuildings.length} selected</p><Button type="button" variant="ghost" className="min-h-11" onClick={() => { setComparedBuildings([]); setCompareOpen(false); }}>Clear</Button><Button type="button" className="min-h-11" onClick={() => setCompareOpen((open) => !open)}>Compare</Button></div>
      </>}
    </div>
  );
}

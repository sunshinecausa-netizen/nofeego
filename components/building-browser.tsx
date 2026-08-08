'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Building2, ChevronDown, ChevronLeft, ChevronRight, GitCompareArrows, List, Map, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BuildingMap } from '@/components/building-map';
import { BuildingCard } from '@/components/building-result-card';
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
const COMPARE_AMENITIES = [
  ['Doorman', ['Doorman']],
  ['Gym', ['Gym']],
  ['In-unit laundry', ['In-Unit W/D Available']],
  ['Pets', ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed']],
  ['Parking', ['Parking']],
  ['Pool', ['Pool', 'Indoor Pool', 'Outdoor Pool']],
] as const;

function formatStartingRent(value: number | undefined) {
  return value == null ? 'Not available' : `From ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}`;
}

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
  const [mobileView, setMobileView] = useState<'list' | 'map'>('map');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [comparedBuildings, setComparedBuildings] = useState<Building[]>([]);
  const [favoriteBuildingIds, setFavoriteBuildingIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const error = initialError;
  const route = mode === 'search' ? '/search' : '/';
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
  }, [setSelectedBuildingId]);

  const selectAreaBuildings = useCallback((ids: string[]) => {
    const selectedIds = new Set(ids);
    setComparedBuildings(result.buildings.filter((building) => selectedIds.has(building.id)));
    if (ids.length === 0) setCompareOpen(false);
  }, [result.buildings, setCompareOpen, setComparedBuildings]);

  const toggleCompare = useCallback((building: Building, checked: boolean) => {
    setComparedBuildings((current) => checked ? (current.some((item) => item.id === building.id) ? current : [...current, building]) : current.filter((item) => item.id !== building.id));
  }, [setComparedBuildings]);

  const toggleFavorite = useCallback((building: Building, checked: boolean) => {
    setFavoriteBuildingIds((current) => checked ? [...new Set([...current, building.id])] : current.filter((id) => id !== building.id));
  }, [setFavoriteBuildingIds]);

  const compactFilters = (
    <form onSubmit={onSubmit} role="search" className="border-y border-border bg-white px-3 py-3 shadow-sm sm:px-5">
      <div className="flex max-w-6xl flex-wrap items-end gap-2">
        <div className="w-full sm:w-64"><label htmlFor="building-search" className="mb-1 block text-xs font-medium text-muted-foreground">Search</label><Input id="building-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Building, address, neighborhood" /></div>
        <details className="group relative w-[170px]"><summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-md border border-input bg-background px-3 text-sm"><span>Borough{boroughs.length > 0 ? ` (${boroughs.length})` : ''}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><div className="absolute left-0 top-12 z-40 w-64 rounded-xl border border-border bg-white p-2 shadow-xl">{BOROUGHS.map((borough) => <label key={borough} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={boroughs.includes(borough)} onCheckedChange={(checked) => toggleBorough(borough, checked === true)} />{borough}</label>)}</div></details>
        <div className="w-36"><label htmlFor="price-range" className="mb-1 block text-xs font-medium text-muted-foreground">Price</label><select id="price-range" value={priceRange} onChange={(event) => setPriceRange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Any price</option>{PRICE_RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="w-28"><label htmlFor="bedrooms" className="mb-1 block text-xs font-medium text-muted-foreground">Bedrooms</label><select id="bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Any</option>{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}+</option>)}</select></div>
        <div className="w-28"><label htmlFor="bathrooms" className="mb-1 block text-xs font-medium text-muted-foreground">Bathrooms</label><select id="bathrooms" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Any</option>{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}+</option>)}</select></div>
        <div className="w-48"><label htmlFor="move-in-flex" className="mb-1 block text-xs font-medium text-muted-foreground">Move-in</label><select id="move-in-flex" value={moveInFlex} onChange={(event) => setMoveInFlex(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="flexible">Flexible</option><option value="this_month">ASAP this month</option><option value="end_this_month">End of this month</option><option value="early_next_month">Early next month</option><option value="middle_next_month">Middle of next month</option><option value="end_next_month">End of next month</option><option value="exact">Exact date</option><option value="exact_7">Exact date ±7 days</option><option value="exact_15">Exact date ±15 days</option></select></div>
        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-bold uppercase tracking-wide text-primary"><SlidersHorizontal className="h-4 w-4" />More filters{activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="absolute right-0 top-12 z-40 max-h-[60vh] w-[min(92vw,900px)] space-y-4 overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl">
          {NEIGHBORHOOD_GROUPS.filter((group) => boroughs.includes(group.borough)).map((group) => <section key={`${group.borough}:${group.title}`} className="border-t border-border/60 pt-3"><label className="mb-2 flex min-h-10 cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary"><Checkbox checked={group.options.every(([value]) => neighborhoods.includes(value))} onCheckedChange={(checked) => toggleNeighborhoodGroup(group.options, checked === true)} />{group.title}</label><div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-5">{group.options.map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={neighborhoods.includes(value)} onCheckedChange={(checked) => toggleNeighborhood(value, checked === true)} />{label}</label>)}</div></section>)}
          <fieldset className="border-t border-border/60 pt-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Amenities</legend><div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-5">{[...PRIMARY_AMENITIES, ...PET_OPTIONS, ...MORE_AMENITIES].map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={amenities.includes(value)} onCheckedChange={(checked) => toggleAmenity(value, checked === true)} />{label}</label>)}</div></fieldset>
          {activeFilterCount > 0 && <div className="flex justify-end"><Button asChild type="button" variant="outline"><Link href={route}><X className="mr-2 h-4 w-4" />Clear filters</Link></Button></div>}
          </div>
        </details>
        <Button type="submit" className="min-h-10"><Search className="mr-2 h-4 w-4" />Apply</Button>
      </div>
      {DATE_SPECIFIC_MOVE_IN_OPTIONS.has(moveInFlex) && <div className="mt-2 max-w-52"><label htmlFor="move-in-date" className="mb-1 block text-xs text-muted-foreground">Move-in date</label><Input id="move-in-date" type="date" value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} /></div>}
    </form>
  );

  const resultCards = result.buildings.map((building) => (
    <BuildingCard
      key={building.id}
      building={building}
      inventory={result.inventoryByBuilding[building.id]}
      compared={comparedBuildings.some((item) => item.id === building.id)}
      favorited={favoriteBuildingIds.includes(building.id)}
      highlighted={selectedBuildingId === building.id || hoveredBuildingId === building.id}
      onCompareChange={toggleCompare}
      onFavoriteChange={toggleFavorite}
      onHover={setHoveredBuildingId}
      onSelect={setSelectedBuildingId}
    />
  ));

  const mapItems = useMemo(() => result.buildings.map((building) => ({
    id: building.id,
    slug: building.slug,
    name: building.name,
    address: building.address,
    neighborhood: building.neighborhood ?? building.borough,
    imageUrl: building.hero_image_url ?? building.hero_image,
    amenities: building.amenities,
    availableCount: result.inventoryByBuilding[building.id]?.availableCount,
    bedroomMinimums: result.inventoryByBuilding[building.id]?.bedroomMinimums,
    concessionText: result.inventoryByBuilding[building.id]?.concessionText,
    building,
    inventory: result.inventoryByBuilding[building.id],
    latitude: building.latitude,
    longitude: building.longitude,
  })), [result.buildings, result.inventoryByBuilding]);

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

  return (
    <div className="flex min-h-screen flex-col bg-background md:h-[calc(100dvh-4rem)] md:min-h-0 md:overflow-hidden">
      <header className="flex shrink-0 items-end justify-between gap-3 px-3 py-3 sm:px-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Verified New York buildings</p><h1 className="font-serif text-2xl font-bold sm:text-3xl">Buildings</h1></div><p className="text-sm text-muted-foreground">{result.total} matching buildings</p></header>
      <div className="shrink-0">{compactFilters}</div>
      <div className="flex shrink-0 border-b border-border bg-white p-2 md:hidden" role="group" aria-label="Choose map or list view"><Button type="button" variant={mobileView === 'map' ? 'default' : 'ghost'} className="h-11 flex-1" onClick={() => setMobileView('map')}><Map className="mr-2 h-4 w-4" />Map</Button><Button type="button" variant={mobileView === 'list' ? 'default' : 'ghost'} className="h-11 flex-1" onClick={() => setMobileView('list')}><List className="mr-2 h-4 w-4" />List</Button></div>
      <div className="min-h-0 flex-1 md:grid md:grid-cols-2 min-[1100px]:grid-cols-[55fr_45fr]">
        <section className={`${mobileView === 'map' ? 'block' : 'hidden'} min-h-[55vh] overflow-hidden border-r border-border md:block md:min-h-0`} aria-label="Building map panel">
          <BuildingMap buildings={mapItems} hoveredBuildingId={hoveredBuildingId} selectedBuildingId={selectedBuildingId} comparedBuildingIds={comparedBuildings.map((building) => building.id)} favoriteBuildingIds={favoriteBuildingIds} onBuildingSelect={selectBuilding} onBuildingHover={setHoveredBuildingId} onAreaSelect={selectAreaBuildings} onCompareChange={toggleCompare} onFavoriteChange={toggleFavorite} className="h-full min-h-0 rounded-none border-0" />
        </section>
        <section className={`${mobileView === 'list' ? 'block' : 'hidden'} min-h-0 bg-muted/25 md:block md:overflow-y-auto`} aria-label="Building results list">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4"><p className="text-sm font-medium">{result.total} results</p></div>
          <div className="space-y-3 p-3 sm:p-4">{resultCards}</div>
        </section>
      </div>

      {comparedBuildings.length > 0 && <>
        {compareOpen && <div role="dialog" aria-modal="true" aria-labelledby="building-comparison-title" className="fixed bottom-20 left-3 right-3 top-16 z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl md:left-1/2 md:right-auto md:top-auto md:max-h-[72vh] md:w-[min(1200px,calc(100vw-2rem))] md:-translate-x-1/2">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3"><div><h2 id="building-comparison-title" className="font-serif text-xl font-bold">Building comparison</h2><p className="text-xs text-muted-foreground">Starting base rent, current availability, and verified amenities</p></div><Button type="button" size="icon" variant="ghost" aria-label="Close comparison" onClick={() => setCompareOpen(false)}><X className="h-4 w-4" /></Button></div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-muted/95 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur"><tr><th className="min-w-52 px-3 py-2">Building</th><th className="px-3 py-2">Available</th>{['Studio', '1 Bed', '2 Bed', '3 Bed'].map((label) => <th key={label} className="min-w-28 px-3 py-2">{label}</th>)}{COMPARE_AMENITIES.map(([label]) => <th key={label} className="px-3 py-2 text-center">{label}</th>)}<th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{comparedBuildings.map((building) => {
                const inventory = result.inventoryByBuilding[building.id];
                const amenities = new Set(building.amenities ?? []);
                return <tr key={building.id} className="border-t border-border align-middle hover:bg-muted/30">
                  <td className="px-3 py-3"><Link href={`/buildings/${building.slug}`} className="font-semibold text-primary hover:underline">{building.name}</Link><p className="mt-0.5 text-[11px] text-muted-foreground">{building.neighborhood ?? building.borough ?? 'New York metro'}</p></td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{inventory ? `${inventory.availableCount} ${inventory.availableCount === 1 ? 'unit' : 'units'}` : 'Not available'}</td>
                  {([0, 1, 2, 3] as const).map((bedroom) => <td key={bedroom} className="whitespace-nowrap px-3 py-3 font-semibold">{formatStartingRent(inventory?.bedroomMinimums[bedroom])}</td>)}
                  {COMPARE_AMENITIES.map(([label, values]) => {
                    const confirmed = values.some((value) => amenities.has(value));
                    return <td key={label} className={`px-3 py-3 text-center font-bold ${confirmed ? 'text-primary' : 'text-muted-foreground'}`} aria-label={`${label}: ${confirmed ? 'Verified' : 'Not verified'}`}>{confirmed ? 'Yes' : '—'}</td>;
                  })}
                  <td className="px-3 py-3"><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${building.name} from comparison`} onClick={() => toggleCompare(building, false)}><X className="h-4 w-4" /></Button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <p className="shrink-0 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">A dash means the amenity is not verified; it does not mean the building lacks it. Comparison is stored for this page session.</p>
        </div>}
        <div className="fixed bottom-3 left-1/2 z-40 flex w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary/20 bg-white px-3 py-2 shadow-2xl"><GitCompareArrows className="h-5 w-5 shrink-0 text-primary" /><p className="min-w-0 flex-1 truncate text-sm font-semibold">{comparedBuildings.length} selected</p><Button type="button" variant="ghost" className="min-h-11" onClick={() => { setComparedBuildings([]); setCompareOpen(false); }}>Clear</Button><Button type="button" className="min-h-11" onClick={() => setCompareOpen((open) => !open)}>Compare</Button></div>
      </>}
    </div>
  );
}

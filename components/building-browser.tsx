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
import { Footer } from '@/components/footer';
import type { Building } from '@/lib/types';
import type { BuildingFilters, BuildingsPageResult } from '@/lib/public-buildings';
import { useTenantData } from '@/lib/account/tenant-data-context';
import { useLocale } from '@/components/locale-provider';
import { AISearchInput } from '@/components/ai-search-input';

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
const BEDROOM_OPTIONS = [['0', 'Studio'], ['1', '1 Bedroom'], ['2', '2 Bedrooms'], ['3', '3 Bedrooms'], ['4', '3+ Bedrooms']] as const;
const BATHROOM_OPTIONS = [['1', '1 Bathroom'], ['2', '2 Bathrooms'], ['3', '3 Bathrooms'], ['4', '3+ Bathrooms']] as const;
const MOVE_IN_OPTIONS = [['this_month', 'ASAP this month'], ['end_this_month', 'End of this month'], ['early_next_month', 'Early next month'], ['middle_next_month', 'Middle of next month'], ['end_next_month', 'End of next month'], ['month_after_next', 'The month after next'], ['exact', 'Exact date'], ['exact_7', 'Exact date ±7 days'], ['exact_15', 'Exact date ±15 days']] as const;
const PRIMARY_AMENITIES = [
  ['Elevator', 'Elevator'],
  ['Gym', 'Gym'],
  ['In-Unit W/D Available', 'In-unit Laundry'],
  ['Dishwasher', 'Dishwasher'],
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
const QUICK_AMENITIES = PRIMARY_AMENITIES.slice(0, 6);
const FILTER_AMENITIES = [...PRIMARY_AMENITIES.slice(6), ...MORE_AMENITIES] as const;
const COMPARE_AMENITIES = [
  ['Doorman', ['Doorman']],
  ['Gym', ['Gym']],
  ['In-unit laundry', ['In-Unit W/D Available']],
  ['Pets', ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed']],
  ['Parking', ['Parking']],
  ['Pool', ['Pool', 'Indoor Pool', 'Outdoor Pool']],
] as const;

function MultiSelectMenu({ label, options, selected, onToggle, alignRight = false, fitOptions = false, truncateLabel = false }: { label: string; options: ReadonlyArray<readonly [string, string]>; selected: string[]; onToggle: (value: string, checked: boolean) => void; alignRight?: boolean; fitOptions?: boolean; truncateLabel?: boolean }) {
  const displayLabel = `${label}${selected.length > 0 ? ` (${selected.length})` : ''}`;
  return <details className={`group relative ${truncateLabel ? 'min-w-[92px] max-w-[138px] flex-[1_1_118px]' : 'w-auto shrink-0'}`}><summary className={`flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm ${truncateLabel ? 'min-w-0' : 'min-w-max'}`}><span className={truncateLabel ? 'min-w-0 truncate' : 'whitespace-nowrap'} title={displayLabel}>{displayLabel}</span><ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" /></summary><div className={`mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-white p-2 shadow-xl sm:absolute sm:top-10 sm:z-50 ${fitOptions ? 'w-max max-w-[calc(100vw-2rem)]' : 'min-w-56'} ${alignRight ? 'sm:right-0' : 'sm:left-0'}`}>{options.map(([value, optionLabel]) => <label key={value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60 ${fitOptions ? 'whitespace-nowrap' : ''}`}><Checkbox checked={selected.includes(value)} onCheckedChange={(checked) => onToggle(value, checked === true)} />{optionLabel}</label>)}</div></details>;
}

function formatStartingRent(value: number | undefined, hasStreetEasyRentData: boolean) {
  return value == null ? (hasStreetEasyRentData ? 'Unavailable' : 'Unknown') : `From ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}`;
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
  const locale = useLocale();
  const { favoriteIds: favoriteBuildingIds, compareIds, toggleFavorite: updateFavorite, toggleCompare: updateCompare, replaceCompare, clearCompare, error: accountError } = useTenantData();
  const starting = {
    search: initialFilters?.search ?? initialQuery,
    boroughs: initialFilters?.boroughs ?? [],
    neighborhoods: initialFilters?.neighborhoods ?? [],
    amenities: initialFilters?.amenities ?? [],
    priceRanges: initialFilters?.priceRanges ?? [],
    bedrooms: initialFilters?.bedrooms ?? [],
    bathrooms: initialFilters?.bathrooms ?? [],
    moveInDate: initialFilters?.moveInDate ?? '',
    moveInFlex: initialFilters?.moveInFlex ?? [],
  };
  const [query, setQuery] = useState(starting.search);
  const [boroughs, setBoroughs] = useState<string[]>(starting.boroughs);
  const [neighborhoods, setNeighborhoods] = useState<string[]>(starting.neighborhoods);
  const [amenities, setAmenities] = useState<string[]>(starting.amenities);
  const [priceRanges, setPriceRanges] = useState<string[]>(starting.priceRanges);
  const [bedrooms, setBedrooms] = useState<string[]>(starting.bedrooms);
  const [bathrooms, setBathrooms] = useState<string[]>(starting.bathrooms);
  const [moveInDate, setMoveInDate] = useState(starting.moveInDate);
  const [moveInFlex, setMoveInFlex] = useState<string[]>(starting.moveInFlex);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('map');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectionRequestKey, setSelectionRequestKey] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [hoveredBorough, setHoveredBorough] = useState<string>(starting.boroughs[0] ?? 'Manhattan');
  const [searchSubmitting, setSearchSubmitting] = useState(false);
  const error = initialError;
  const route = mode === 'search' ? '/search' : '/';
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeFilterCount = [query, moveInFlex.some((value) => DATE_SPECIFIC_MOVE_IN_OPTIONS.has(value)) ? moveInDate : ''].filter(Boolean).length + priceRanges.length + bedrooms.length + bathrooms.length + moveInFlex.length + boroughs.length + neighborhoods.length + amenities.length;
  const comparedBuildings = useMemo(() => result.buildings.filter((building) => compareIds.includes(building.id)), [compareIds, result.buildings]);

  function href(page: number, values: BuildingFilters = starting) {
    const params = new URLSearchParams();
    if (values.search?.trim()) params.set('q', values.search.trim());
    values.boroughs?.forEach((item) => params.append('borough', item));
    values.neighborhoods?.forEach((item) => params.append('neighborhood', item));
    values.amenities?.forEach((item) => params.append('amenity', item));
    values.priceRanges?.forEach((item) => params.append('price', item));
    values.bedrooms?.forEach((item) => params.append('bedrooms', item));
    values.bathrooms?.forEach((item) => params.append('bathrooms', item));
    values.moveInFlex?.forEach((item) => params.append('moveInFlex', item));
    if (values.moveInFlex?.some((value) => DATE_SPECIFIC_MOVE_IN_OPTIONS.has(value)) && values.moveInDate) params.set('moveInDate', values.moveInDate);
    if (page > 1) params.set('page', String(page));
    return `${route}${params.size ? `?${params}` : ''}`;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchSubmitting(true);
    window.location.assign(href(1, { search: query, boroughs, neighborhoods, amenities, priceRanges, bedrooms, bathrooms, moveInDate, moveInFlex }));
  }

  function toggleAmenity(value: string, checked: boolean) {
    setAmenities((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
  }

  function toggleValue(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, checked: boolean) {
    setter((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
  }

  function toggleNeighborhood(value: string, checked: boolean) {
    setNeighborhoods((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
  }

  function toggleNeighborhoodGroup(options: ReadonlyArray<NeighborhoodOption>, checked: boolean) {
    const values = options.map(([value]) => value);
    const groupValues = new Set(values);
    setNeighborhoods((current) => checked ? [...new Set([...current, ...values])] : current.filter((item) => !groupValues.has(item)));
  }

  function toggleBorough(value: string, checked: boolean) {
    setBoroughs((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
    if (!checked) {
      const hiddenNeighborhoods = new Set(NEIGHBORHOOD_GROUPS.filter((group) => group.borough === value).flatMap((group) => group.options.map(([option]) => option)));
      setNeighborhoods((current) => current.filter((item) => !hiddenNeighborhoods.has(item)));
    }
  }

  function clearDraftFilters() {
    setQuery('');
    setBoroughs([]);
    setNeighborhoods([]);
    setAmenities([]);
    setPriceRanges([]);
    setBedrooms([]);
    setBathrooms([]);
    setMoveInDate('');
    setMoveInFlex([]);
  }

  const draftTags = [
    ...(query.trim() ? [{ type: 'search', value: query.trim(), label: `Search: ${query.trim()}` }] : []),
    ...boroughs.map((value) => ({ type: 'borough', value, label: value })),
    ...neighborhoods.map((value) => ({ type: 'neighborhood', value, label: value })),
    ...priceRanges.map((value) => ({ type: 'price', value, label: PRICE_RANGES.find(([key]) => key === value)?.[1] ?? value })),
    ...bedrooms.map((value) => ({ type: 'bedrooms', value, label: BEDROOM_OPTIONS.find(([key]) => key === value)?.[1] ?? value })),
    ...bathrooms.map((value) => ({ type: 'bathrooms', value, label: BATHROOM_OPTIONS.find(([key]) => key === value)?.[1] ?? value })),
    ...moveInFlex.map((value) => ({ type: 'moveIn', value, label: value.replaceAll('_', ' ') })),
    ...amenities.map((value) => ({ type: 'amenity', value, label: [...PRIMARY_AMENITIES, ...MORE_AMENITIES].find(([key]) => key === value)?.[1] ?? value })),
  ];

  function removeDraftTag(type: string, value: string) {
    if (type === 'search') setQuery('');
    else if (type === 'borough') toggleBorough(value, false);
    else if (type === 'neighborhood') toggleNeighborhood(value, false);
    else if (type === 'price') toggleValue(setPriceRanges, value, false);
    else if (type === 'bedrooms') toggleValue(setBedrooms, value, false);
    else if (type === 'bathrooms') toggleValue(setBathrooms, value, false);
    else if (type === 'moveIn') { toggleValue(setMoveInFlex, value, false); if (DATE_SPECIFIC_MOVE_IN_OPTIONS.has(value)) setMoveInDate(''); }
    else if (type === 'amenity') toggleAmenity(value, false);
  }

  const selectBuilding = useCallback((id: string) => {
    setSelectedBuildingId(id);
    setMobileView('map');
    window.setTimeout(() => {
      const card = document.querySelector<HTMLElement>(`[data-building-id="${CSS.escape(id)}"][data-card-variant="list"]`);
      card?.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
    }, 80);
  }, [setSelectedBuildingId, setMobileView]);

  const focusBuildingFromCard = useCallback((id: string) => {
    setSelectedBuildingId(id);
    setSelectionRequestKey((value) => value + 1);
    setMobileView('map');
  }, []);

  const selectAreaBuildings = useCallback((ids: string[]) => {
    void replaceCompare(ids);
    if (ids.length === 0) setCompareOpen(false);
  }, [replaceCompare]);

  const toggleCompare = useCallback((building: Building, checked: boolean) => {
    void updateCompare(building.id, checked);
  }, [updateCompare]);

  const toggleFavorite = useCallback((building: Building, checked: boolean) => {
    void updateFavorite(building.id, checked);
  }, [updateFavorite]);

  const compactFilters = (
    <form onSubmit={onSubmit} role="search" className="border-y border-border bg-white px-3 py-3 shadow-sm sm:px-5">
      <div className="flex items-center gap-2 md:hidden"><Button type="button" variant="outline" className="flex-1 justify-between" onClick={() => setMobileFiltersOpen(true)}>Filters {draftTags.length > 0 && <Badge variant="secondary">{draftTags.length}</Badge>}</Button><Button type="submit"><Search className="mr-2 h-5 w-5" />Apply</Button></div>
      <div className={`${mobileFiltersOpen ? 'fixed inset-x-0 bottom-0 top-12 z-[70] overflow-y-auto rounded-t-2xl border bg-white p-4 shadow-2xl' : 'hidden'} md:static md:block md:overflow-visible md:border-0 md:p-0 md:shadow-none`}>
      <div className="mb-4 flex items-center justify-between md:hidden"><h2 className="font-serif text-xl font-bold">Filters</h2><Button type="button" size="icon" variant="ghost" aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)}><X className="h-5 w-5" /></Button></div>
      <div className="grid gap-2">
        <div className="min-w-0"><AISearchInput id="building-search" value={query} onChange={(event) => setQuery(event.target.value)} label={locale === 'zh-Hans' ? 'AI找房' : 'AI Search'} placeholder={locale === 'zh-Hans' ? '输入楼盘、地址、社区或你的找房需求' : 'Enter a building, address, neighborhood, or what you are looking for'} loading={searchSubmitting} /></div>
        <div className="flex min-w-0 flex-nowrap items-end gap-2">
          <MultiSelectMenu label="Price" options={PRICE_RANGES} selected={priceRanges} onToggle={(value, checked) => toggleValue(setPriceRanges, value, checked)} />
          <MultiSelectMenu label="Beds" options={BEDROOM_OPTIONS} selected={bedrooms} onToggle={(value, checked) => toggleValue(setBedrooms, value, checked)} />
          <MultiSelectMenu label="Bath" options={BATHROOM_OPTIONS} selected={bathrooms} onToggle={(value, checked) => toggleValue(setBathrooms, value, checked)} />
          <MultiSelectMenu label={locale === 'zh-Hans' ? '入住日期' : 'Move-in Date'} options={MOVE_IN_OPTIONS} selected={moveInFlex} onToggle={(value, checked) => toggleValue(setMoveInFlex, value, checked)} alignRight fitOptions truncateLabel />
          <details onMouseLeave={(event) => { if (window.innerWidth >= 768) event.currentTarget.removeAttribute('open'); }} className="group relative min-w-[108px] max-w-[180px] flex-[1.25_1_148px]">
            <summary className="flex h-10 min-w-0 cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm"><span className="min-w-0 truncate" title={locale === 'zh-Hans' ? '行政区与社区' : 'Borough & Neighborhood'}>{locale === 'zh-Hans' ? '行政区与社区' : 'Borough & Neighborhood'}{boroughs.length + neighborhoods.length > 0 ? ` (${boroughs.length + neighborhoods.length})` : ''}</span><ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" /></summary>
            <div className="mt-2 grid overflow-hidden rounded-xl border border-border bg-white shadow-xl md:fixed md:left-1/2 md:z-50 md:mt-0 md:w-[min(92vw,720px)] md:-translate-x-1/2 md:grid-cols-[180px_1fr]"><div className="border-b p-2 md:border-b-0 md:border-r">{BOROUGHS.map((borough) => <label key={borough} onMouseEnter={() => setHoveredBorough(borough)} onFocus={() => setHoveredBorough(borough)} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm ${hoveredBorough === borough ? 'bg-muted' : 'hover:bg-muted/60'}`}><Checkbox checked={boroughs.includes(borough)} onCheckedChange={(checked) => toggleBorough(borough, checked === true)} />{borough}</label>)}</div><div className="max-h-72 overflow-y-auto p-3">{NEIGHBORHOOD_GROUPS.filter((group) => group.borough === hoveredBorough).map((group) => { const selectedCount = group.options.filter(([value]) => neighborhoods.includes(value)).length; return <section key={group.title} className="mb-3"><label className="mb-1 flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-xs font-bold uppercase tracking-wide text-primary hover:bg-muted/60"><Checkbox className="rounded-none" checked={selectedCount === group.options.length ? true : selectedCount > 0 ? 'indeterminate' : false} onCheckedChange={(checked) => toggleNeighborhoodGroup(group.options, checked === true)} />All {group.title}</label>{group.options.map(([value, label]) => <label key={value} className="ml-6 flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={neighborhoods.includes(value)} onCheckedChange={(checked) => toggleNeighborhood(value, checked === true)} />{label}</label>)}</section>; })}</div></div>
          </details>
        <div className="flex min-w-[150px] flex-1 items-end gap-2">
        <details onMouseLeave={(event) => { if (window.innerWidth >= 768) event.currentTarget.removeAttribute('open'); }} className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-start gap-1.5 rounded-md border border-input bg-background px-3 text-left text-sm font-normal leading-tight text-foreground"><SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" /><span>Filters</span>{activeFilterCount > 0 && <Badge variant="secondary" className="px-1">{activeFilterCount}</Badge>}<ChevronDown className="ml-auto h-4 w-4 shrink-0 transition group-open:rotate-180" /></summary>
          <div className="mt-2 max-h-[70vh] w-full space-y-4 overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl md:fixed md:left-1/2 md:right-auto md:top-auto md:z-40 md:mt-0 md:w-[min(92vw,820px)] md:-translate-x-1/2">
          {moveInFlex.some((value) => DATE_SPECIFIC_MOVE_IN_OPTIONS.has(value)) && <div className="max-w-52"><label htmlFor="move-in-date" className="mb-1 block text-xs text-muted-foreground">Move-in date</label><Input id="move-in-date" type="date" value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} /></div>}
          <fieldset className="border-t border-border/60 pt-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Popular amenities</legend><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{QUICK_AMENITIES.map(([value, label]) => <button key={value} type="button" aria-pressed={amenities.includes(value)} onClick={() => toggleAmenity(value, !amenities.includes(value))} className={`min-h-11 rounded-md border px-3 text-left text-sm ${amenities.includes(value) ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background hover:border-primary/50'}`}>{label}</button>)}</div></fieldset>
          <fieldset className="border-t border-border/60 pt-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">More amenities</legend><div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">{FILTER_AMENITIES.map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"><Checkbox checked={amenities.includes(value)} onCheckedChange={(checked) => toggleAmenity(value, checked === true)} />{label}</label>)}</div></fieldset>
          </div>
        </details>
        <Button type="submit" className="h-10 min-w-[132px] flex-1 whitespace-nowrap"><Search className="mr-2 h-5 w-5 shrink-0" /><span>Search</span></Button>
        </div>
        </div>
      </div>
      <div className="sticky bottom-0 mt-4 grid grid-cols-2 gap-3 border-t bg-white py-3 md:hidden"><Button type="button" variant="outline" onClick={clearDraftFilters}>Clear All</Button><Button type="submit">Apply</Button></div>
      </div>
      {draftTags.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Selected filters">{draftTags.map((tag) => <Badge key={`${tag.type}:${tag.value}`} variant="secondary" className="gap-1 py-1 pl-2 pr-1">{tag.label}<button type="button" onClick={() => removeDraftTag(tag.type, tag.value)} aria-label={`Remove ${tag.label}`} className="rounded-full p-0.5 hover:bg-black/10"><X className="h-3 w-3" /></button></Badge>)}<Button type="button" variant="ghost" size="sm" onClick={clearDraftFilters}>Clear All</Button></div>}
    </form>
  );

  const resultCards = result.buildings.map((building) => (
    <BuildingCard
      key={building.id}
      building={building}
      inventory={result.inventoryByBuilding[building.id]}
      compared={comparedBuildings.some((item) => item.id === building.id)}
      favorited={favoriteBuildingIds.includes(building.id)}
      highlighted={selectedBuildingId === building.id}
      onCompareChange={toggleCompare}
      onFavoriteChange={toggleFavorite}
      onHover={setHoveredBuildingId}
      onSelect={focusBuildingFromCard}
    />
  ));

  const mapItems = useMemo(() => {
    const hasActiveLocationOrSearchFilter = Boolean(starting.search?.trim()) || starting.boroughs.length > 0 || starting.neighborhoods.length > 0;
    const mapBuildings = mode === 'buildings' && !hasActiveLocationOrSearchFilter
      ? result.buildings.filter((building) => building.id === selectedBuildingId || (building.latitude != null && building.longitude != null && building.latitude >= 40.742 && building.latitude <= 40.775 && building.longitude >= -74.01 && building.longitude <= -73.945))
      : result.buildings;
    return mapBuildings.map((building) => ({
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
    }));
  }, [mode, result.buildings, result.inventoryByBuilding, selectedBuildingId, starting.boroughs.length, starting.neighborhoods.length, starting.search]);

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
      <div className="flex shrink-0 border-b border-border bg-white p-2 md:hidden" role="group" aria-label="Choose map or list view"><Button type="button" variant={mobileView === 'map' ? 'default' : 'ghost'} className="h-11 flex-1" onClick={() => setMobileView('map')}><Map className="mr-2 h-4 w-4" />Map</Button><Button type="button" variant={mobileView === 'list' ? 'default' : 'ghost'} className="h-11 flex-1" onClick={() => setMobileView('list')}><List className="mr-2 h-4 w-4" />List</Button></div>
      <div className="min-h-0 flex-1 md:grid md:grid-cols-2">
        <section className={`${mobileView === 'list' ? 'flex' : 'hidden'} min-h-0 flex-col border-r border-border bg-muted/25 md:flex`} aria-label="Building results list">
          <div className="shrink-0">{compactFilters}</div>
          <div className="shrink-0 border-b border-border bg-background/95 px-3 py-2 sm:px-4"><p className="text-sm font-medium">{result.total} results</p></div>
          <div className="results-list-scrollbar min-h-0 flex-1 overflow-y-auto"><div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2">{resultCards}</div><Footer embedded /></div>
        </section>
        <section className={`${mobileView === 'map' ? 'block' : 'hidden'} min-h-[55vh] overflow-hidden md:block md:min-h-0`} aria-label="Building map panel">
          <BuildingMap buildings={mapItems} selectedBedrooms={starting.bedrooms} hoveredBuildingId={hoveredBuildingId} selectedBuildingId={selectedBuildingId} selectionRequestKey={selectionRequestKey} comparedBuildingIds={comparedBuildings.map((building) => building.id)} favoriteBuildingIds={favoriteBuildingIds} onBuildingSelect={selectBuilding} onBuildingClose={() => setSelectedBuildingId(null)} onBuildingHover={setHoveredBuildingId} onAreaSelect={selectAreaBuildings} onCompareChange={toggleCompare} onFavoriteChange={toggleFavorite} className="h-full min-h-0 rounded-none border-0" />
        </section>
      </div>
      {compareIds.length > 0 && <>
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
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{inventory?.availableCount != null ? `${inventory.availableCount} ${inventory.availableCount === 1 ? 'unit' : 'units'}` : 'Not verified'}</td>
                  {([0, 1, 2, 3] as const).map((bedroom) => <td key={bedroom} className="whitespace-nowrap px-3 py-3 font-semibold">{formatStartingRent(inventory?.bedroomMinimums[bedroom], Object.values(inventory?.bedroomMinimums ?? {}).some((value) => value != null))}</td>)}
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
        <div className="fixed bottom-3 left-1/2 z-40 flex w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-primary/20 bg-white px-3 py-2 shadow-2xl"><GitCompareArrows className="h-5 w-5 shrink-0 text-primary" /><p className="min-w-0 flex-1 truncate text-sm font-semibold">{compareIds.length} selected</p><Button type="button" variant="ghost" className="min-h-11" onClick={() => { void clearCompare(); setCompareOpen(false); }}>Clear</Button><Button asChild className="min-h-11"><Link href="/compare">Compare</Link></Button></div>
      </>}
      {accountError && <p role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground shadow-lg">{accountError}</p>}
    </div>
  );
}

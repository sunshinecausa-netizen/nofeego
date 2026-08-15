'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Dumbbell, GraduationCap, Heart, Home, MapPin, PawPrint, Shield, Train, Users, WashingMachine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ensureGoogleMaps, StreetViewStaticPreview } from '@/components/street-view-static-preview';
import type { BuildingInventorySummary } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

const BEDROOM_PRICE_LABELS = [[0, 'Studio'], [1, '1 Bed'], [2, '2 Beds'], [3, '3 Beds']] as const;
const CORE_AMENITIES = [
  { label: 'Doorman', values: ['Doorman'], Icon: Shield },
  { label: 'Gym', values: ['Gym'], Icon: Dumbbell },
  { label: 'In-Unit Laundry', values: ['In-Unit W/D Available'], Icon: WashingMachine },
  { label: 'Pets', values: ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed'], Icon: PawPrint },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.ceil(value / 50) * 50);
}

const NEW_YORK_UNIVERSITY = ['New York University', 40.7295, -73.9965] as const;
const COLUMBIA_UNIVERSITY = ['Columbia University', 40.8075, -73.9626] as const;
const UPPER_MANHATTAN_NEIGHBORHOODS = /upper west side|morningside heights|manhattan valley|harlem|hamilton heights|sugar hill|washington heights|hudson heights|fort george|inwood/i;

function publicStreetName(address: string) {
  return address.replace(/^\s*\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?\s+/, '').replace(/(?:,|\s)+(?:Apt|Apartment|Unit|Suite|Bldg|Building|Floor|#)\s*.*$/i, '').trim() || 'Street name unavailable';
}

function distanceMiles(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(targetLatitude - latitude); const lngDelta = radians(targetLongitude - longitude);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(targetLatitude)) * Math.sin(lngDelta / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function destinationUniversity(building: Building) {
  if (building.latitude == null || building.longitude == null) return null;
  const isManhattan = building.borough === 'Manhattan' || building.city === 'New York';
  const isUpperManhattan = isManhattan && (UPPER_MANHATTAN_NEIGHBORHOODS.test(building.neighborhood ?? '') || building.latitude >= 40.785);
  const [name, latitude, longitude] = isUpperManhattan ? COLUMBIA_UNIVERSITY : NEW_YORK_UNIVERSITY;
  return { name, miles: distanceMiles(building.latitude, building.longitude, latitude, longitude) };
}

type SubwayRoute = { label: string; minutes: number; distance: string };
type SubwayCandidate = { label: string; destination: string | google.maps.LatLngLiteral };
const subwayRouteCache = new Map<string, Promise<SubwayRoute | null>>();

function nearbySubwayCandidates(building: Building): Promise<SubwayCandidate[]> {
  if (building.nearby_subway?.length) return Promise.resolve(building.nearby_subway.slice(0, 4).map((label) => ({ label, destination: `${label}, subway station, ${building.city}, ${building.state}` })));
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.nearbySearch({ location: { lat: building.latitude!, lng: building.longitude! }, rankBy: google.maps.places.RankBy.DISTANCE, type: 'subway_station' }, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) { resolve([]); return; }
      resolve(results.slice(0, 4).flatMap((place) => place.name && place.geometry?.location ? [{ label: place.name, destination: place.geometry.location.toJSON() }] : []));
    });
  });
}

function walkingRouteToNearestSubway(building: Building) {
  const existing = subwayRouteCache.get(building.id);
  if (existing) return existing;
  const request = (async () => {
    if (building.latitude == null || building.longitude == null) return null;
    await ensureGoogleMaps();
    const service = new google.maps.DirectionsService();
    const candidates = await nearbySubwayCandidates(building);
    const routes = await Promise.all(candidates.map(async ({ label, destination }) => {
      try {
        const response = await service.route({
          origin: { lat: building.latitude!, lng: building.longitude! },
          destination,
          travelMode: google.maps.TravelMode.WALKING,
          provideRouteAlternatives: false,
        });
        const leg = response.routes[0]?.legs[0];
        if (!leg?.duration?.value || !leg.distance?.text) return null;
        return { label, seconds: leg.duration.value, minutes: Math.max(1, Math.round(leg.duration.value / 60)), distance: leg.distance.text };
      } catch { return null; }
    }));
    const nearest = routes.filter((route): route is NonNullable<typeof route> => route != null).sort((a, b) => a.seconds - b.seconds)[0];
    return nearest ? { label: nearest.label, minutes: nearest.minutes, distance: nearest.distance } : null;
  })();
  subwayRouteCache.set(building.id, request);
  return request;
}

function SubwayWalkingSummary({ building }: { building: Building }) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const fallback = building.nearby_subway?.[0] ?? 'Calculating nearest subway walk…';
  const [summary, setSummary] = useState(fallback);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || building.latitude == null || building.longitude == null) return;
    let active = true;
    const load = () => { void walkingRouteToNearestSubway(building).then((route) => { if (active) setSummary(route ? `${route.label} · ${route.minutes} min walk · ${route.distance}` : 'Nearest subway walking route unavailable'); }); };
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); load(); } }, { rootMargin: '240px' });
    observer.observe(marker);
    return () => { active = false; observer.disconnect(); };
  }, [building]);
  return <span ref={markerRef}>{summary}</span>;
}

type Props = {
  building: Building;
  inventory?: BuildingInventorySummary;
  compared?: boolean;
  favorited?: boolean;
  highlighted?: boolean;
  variant?: 'list' | 'map';
  onCompareChange?: (building: Building, checked: boolean) => void;
  onFavoriteChange?: (building: Building, checked: boolean) => void;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  onClose?: () => void;
};

export function BuildingCard({ building, inventory, compared = false, favorited = false, highlighted = false, variant = 'list', onCompareChange, onFavoriteChange, onHover, onSelect, onClose }: Props) {
  const heroImage = building.hero_image_url ?? building.hero_image;
  const amenities = new Set(building.amenities ?? []);
  const fullAddress = [building.address, building.city, building.state, building.zip_code].filter(Boolean).join(', ');
  const displayStreet = publicStreetName(building.address);
  const university = destinationUniversity(building);
  const compact = variant === 'map';
  const requestContext = new URLSearchParams({ buildingId: building.id, buildingSlug: building.slug, buildingName: building.name, neighborhood: building.neighborhood ?? building.borough ?? '', address: fullAddress }).toString();
  const savedAndCompared = favorited && compared;

  if (!compact) {
    const priceSummary = BEDROOM_PRICE_LABELS
      .map(([bedroom, label]) => {
        const minimum = inventory?.bedroomMinimums[bedroom];
        return minimum == null ? null : `${label} starting from $${formatCurrency(minimum)}`;
      })
      .filter((value): value is string => value != null);
    const amenitySummary = [
      amenities.has('Doorman') ? 'Doorman' : null,
      amenities.has('Gym') ? 'Gym' : null,
      amenities.has('In-Unit W/D Available') ? 'In-Unit Laundry' : null,
      amenities.has('Laundry In Building') ? 'Laundry' : null,
      ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed'].some((value) => amenities.has(value)) ? 'Pets' : null,
    ].filter((value): value is string => value != null).slice(0, 3);

    return (
      <article data-building-id={building.id} className={cn('group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition duration-200 focus-within:ring-2 focus-within:ring-primary/40 hover:-translate-y-0.5 hover:shadow-md lg:h-[480px]', highlighted && 'ring-2 ring-primary/40 shadow-[0_12px_30px_rgba(22,50,79,0.22)]')} onMouseEnter={() => onHover?.(building.id)} onMouseLeave={() => onHover?.(null)} onClickCapture={(event) => { const target = event.target as HTMLElement; if (target.closest('button, a, [data-copyable]')) return; onSelect?.(building.id); }}>
        <div className="relative aspect-[1.55/1] shrink-0 overflow-hidden bg-muted lg:aspect-auto lg:h-[60%]">
          <StreetViewStaticPreview buildingId={building.id} buildingName={displayStreet} latitude={building.latitude} longitude={building.longitude} snapshotUrl={heroImage} className="transition-transform duration-300 group-hover:scale-[1.02]" />
          <p className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
          <button type="button" className="absolute right-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-3 text-xs font-semibold text-navy shadow-md backdrop-blur transition hover:bg-white" aria-label={savedAndCompared ? `Remove ${building.name} from saved and compare` : `Save ${building.name} and add to compare`} aria-pressed={savedAndCompared} onClick={(event) => { event.stopPropagation(); const next = !savedAndCompared; onFavoriteChange?.(building, next); onCompareChange?.(building, next); }}><Heart className={cn('h-5 w-5 shrink-0', savedAndCompared && 'fill-destructive text-destructive')} /><span>Save and Compare</span></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 py-3.5">
          <div className="grid gap-1.5">
            <h2 data-copyable className="cursor-text select-text truncate font-sans text-xl font-bold leading-6 text-navy transition group-hover:text-primary">{displayStreet}</h2>
            <p className="truncate text-sm font-bold leading-5 text-navy">{priceSummary.length > 0 ? priceSummary.join('  ·  ') : 'Current pricing unavailable'}</p>
            <p className="truncate text-sm leading-5 text-muted-foreground">{amenitySummary.length > 0 ? amenitySummary.join('  ·  ') : 'Amenities unavailable'}</p>
            <p className="flex min-w-0 items-center gap-1.5 truncate text-xs leading-4 text-muted-foreground"><Train className="h-3.5 w-3.5 shrink-0 text-navy" /><span className="truncate"><SubwayWalkingSummary building={building} /></span></p>
            <p className="flex min-w-0 items-center gap-1.5 truncate text-xs leading-4 text-muted-foreground"><GraduationCap className="h-3.5 w-3.5 shrink-0 text-navy" /><span className="truncate">{university ? `${university.name} · ${university.miles.toFixed(1)} mi` : 'Nearby school distance unavailable'}</span></p>
          </div>
          <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-2.5">
            <Button asChild variant="ghost" className="h-9 justify-start px-0 text-sm font-semibold text-navy hover:bg-transparent hover:text-primary"><Link href={`/roommate-request?${requestContext}`} onClick={(event) => event.stopPropagation()}>Find a Roommate</Link></Button>
            <Button asChild variant="outline" className="h-9 rounded-xl border-primary bg-primary/[0.03] px-4 text-sm font-semibold text-primary hover:bg-primary/[0.08] hover:text-primary"><Link href={`/rent-request?${requestContext}`} onClick={(event) => event.stopPropagation()}>Check Latest Availability</Link></Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article data-building-id={building.id} className={cn('group relative overflow-hidden bg-white transition duration-200', compact ? 'w-full rounded-none border-0 shadow-none' : 'min-h-[300px] cursor-pointer rounded-2xl border shadow-sm focus-within:ring-2 focus-within:ring-primary/40 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md', !compact && (highlighted ? 'border-2 border-primary shadow-[0_0_0_4px_rgba(239,145,0,0.2),0_16px_40px_rgba(22,50,79,0.32)] hover:border-primary hover:shadow-[0_0_0_4px_rgba(239,145,0,0.2),0_16px_40px_rgba(22,50,79,0.32)]' : 'border-border'))} onMouseEnter={() => onHover?.(building.id)} onMouseLeave={() => onHover?.(null)} onClickCapture={(event) => { const target = event.target as HTMLElement; if (target.closest('button, a, [data-copyable]')) return; onSelect?.(building.id); }}>
      <div className="grid min-h-[300px] grid-cols-1">
        {!compact && <div className="relative min-h-[260px] overflow-hidden bg-muted sm:min-h-[340px]">
          <StreetViewStaticPreview buildingId={building.id} buildingName={displayStreet} latitude={building.latitude} longitude={building.longitude} snapshotUrl={heroImage} className="min-h-[260px] transition-transform duration-300 group-hover:scale-[1.02] sm:min-h-[340px]" />
          <p className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-sm sm:text-sm">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
          <button type="button" className="absolute right-4 top-4 z-20 inline-flex h-12 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-navy shadow-md backdrop-blur transition hover:bg-white" aria-label={savedAndCompared ? `Remove ${building.name} from saved and compare` : `Save ${building.name} and add to compare`} aria-pressed={savedAndCompared} onClick={(event) => { event.stopPropagation(); const next = !savedAndCompared; onFavoriteChange?.(building, next); onCompareChange?.(building, next); }}><Heart className={cn('h-6 w-6', savedAndCompared && 'fill-destructive text-destructive')} /><span>Save and Compare</span></button>
        </div>}

        <div className="relative flex min-w-0 flex-col p-5 sm:p-6">
          <div className={cn('min-w-0', compact && (onClose ? 'pr-52' : 'pr-44'))}>
            {compact && <p className="truncate text-sm font-bold uppercase tracking-[0.18em] text-primary">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>}
            <h2 data-copyable className={cn('mt-1 flex cursor-text select-text items-start gap-1.5 break-words font-sans font-bold leading-tight text-navy transition group-hover:text-primary', compact ? 'text-2xl' : 'text-3xl')}><MapPin className="mt-1 h-5 w-5 shrink-0" /><span>{displayStreet}</span></h2>
          </div>

          {compact && <button type="button" className={cn('absolute top-5 z-20 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-navy transition hover:bg-muted', onClose ? 'right-16' : 'right-4')} aria-label={savedAndCompared ? `Remove ${building.name} from saved and compare` : `Save ${building.name} and add to compare`} aria-pressed={savedAndCompared} onClick={(event) => { event.stopPropagation(); const next = !savedAndCompared; onFavoriteChange?.(building, next); onCompareChange?.(building, next); }}><Heart className={cn('h-6 w-6', savedAndCompared && 'fill-destructive text-destructive')} /><span className={cn(onClose && 'hidden min-[760px]:inline')}>Save and Compare</span></button>}
          {onClose && <button type="button" className="absolute right-3 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow" aria-label={`Close ${building.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}><X className="h-5 w-5" /></button>}

          <div className="mt-6 grid grid-cols-4 border-y border-border/70 py-4" aria-label="Starting base rents by apartment type">
            {BEDROOM_PRICE_LABELS.map(([bedroom, label], index) => { const minimum = inventory?.bedroomMinimums[bedroom]; return <div key={bedroom} className={cn('min-w-0 px-2 text-center', index > 0 && 'border-l border-border')}><p className="whitespace-nowrap text-sm font-medium text-navy">{label}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Starting from</p><p className={cn('whitespace-nowrap font-semibold text-navy', compact ? 'text-base' : 'text-xl')}>{minimum != null ? `$${formatCurrency(minimum)}` : '—'}</p></div>; })}
          </div>

          <div className="grid gap-2 border-b border-border/70 py-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex min-w-0 items-start gap-2"><Train className="mt-0.5 h-4 w-4 shrink-0 text-navy" /><SubwayWalkingSummary building={building} /></p>
            <p className="flex min-w-0 items-start gap-2"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-navy" /><span>{university ? `${university.name} · ${university.miles.toFixed(1)} mi` : 'Nearby school distance unavailable'}</span></p>
          </div>

          <div className="grid grid-cols-4 py-4" aria-label="Building amenities">
            {CORE_AMENITIES.map(({ label, values, Icon }, index) => { const confirmed = values.some((value) => amenities.has(value)); return <div key={label} className={cn('flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-center', index > 0 && 'border-l border-border', !confirmed && 'opacity-25')}><Icon className="h-7 w-7 text-navy" /><span className={cn('whitespace-nowrap font-medium text-navy', compact ? 'text-[11px]' : 'text-xs')}>{label}</span></div>; })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-20 justify-start border-primary px-4 text-left hover:bg-primary/5"><Link href={`/roommate-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Users className="mr-3 h-8 w-8 shrink-0 text-navy" /><span className="leading-5 text-navy"><span className="block whitespace-nowrap text-sm font-bold">Find a roommate</span>{(inventory?.roommateInterestCount ?? 0) >= 3 ? <span className="block text-[11px] font-medium leading-4">{inventory?.roommateInterestCount} people are interested in sharing this home</span> : <><span className="block whitespace-nowrap text-[11px] font-medium leading-4">Join others interested in</span><span className="block whitespace-nowrap text-[11px] font-medium leading-4">sharing this home.</span></>}</span></Link></Button>
            <Button asChild variant="outline" className="h-20 rounded-xl border-primary bg-primary/[0.03] px-4 text-primary hover:bg-primary/[0.08] hover:text-primary"><Link href={`/rent-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Home className="mr-3 h-8 w-8 shrink-0" /><span className="text-sm font-bold">Check Latest Availability</span></Link></Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export const BuildingResultCard = BuildingCard;

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Building2, CalendarDays, Camera, Check, ChevronDown, Heart, Home, Layers3, MapPin, TrainFront, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { BuildingInventorySummary } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

const CORE_AMENITIES = [
  { label: 'Doorman', values: ['Doorman'] },
  { label: 'Gym', values: ['Gym'] },
  { label: 'In-Unit W/D', values: ['In-Unit W/D Available'] },
  { label: 'Pets', values: ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed'] },
] as const;
const BEDROOM_PRICE_LABELS = [[0, 'Studio'], [1, '1 Bed'], [2, '2 Beds'], [3, '3 Beds']] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.ceil(value / 50) * 50);
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
};

export function BuildingCard({ building, inventory, compared = false, favorited = false, highlighted = false, variant = 'list', onCompareChange, onFavoriteChange, onHover, onSelect }: Props) {
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const heroImage = building.hero_image_url ?? building.hero_image;
  const images = [heroImage, ...(building.gallery ?? [])].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  const amenities = new Set(building.amenities ?? []);
  const subway = building.nearby_subway?.[0];
  const fullAddress = [building.address, building.city, building.state, building.zip_code].filter(Boolean).join(', ');
  const compact = variant === 'map';
  const hasStreetEasyRentData = Object.values(inventory?.bedroomMinimums ?? {}).some((value) => value != null);
  const storyCount = building.stories ?? building.floors;
  const requestContext = new URLSearchParams({ buildingId: building.id, buildingSlug: building.slug, buildingName: building.name, neighborhood: building.neighborhood ?? building.borough ?? '', address: fullAddress }).toString();
  return (
    <article data-building-id={building.id} className={cn('group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 focus-within:ring-2 focus-within:ring-primary/40 hover:border-primary/30 hover:shadow-md', compact ? 'max-h-[520px] w-[340px] overflow-y-auto' : 'min-h-[224px] cursor-pointer hover:-translate-y-0.5', highlighted ? 'border-primary ring-2 ring-primary/20' : 'border-border')} onMouseEnter={() => onHover?.(building.id)} onMouseLeave={() => onHover?.(null)} onClickCapture={(event) => { const target = event.target as HTMLElement; if (target.closest('button, a, input, label, [role="checkbox"]')) return; onSelect?.(building.id); }}>
      <div className={cn('grid h-full', compact ? 'grid-cols-1' : 'min-h-[224px] grid-cols-1 sm:grid-cols-[41%_59%]')}>
        <div className={cn('grid min-w-0 overflow-hidden border-border', compact ? 'grid-rows-[auto_auto] border-b' : 'sm:grid-rows-2 sm:border-r')}>
          <div className={cn('relative overflow-hidden bg-muted', compact ? 'min-h-36' : 'min-h-40')}>
            {heroImage ? <Image src={heroImage} alt={`${building.name} exterior`} fill unoptimized sizes={compact ? '340px' : '(min-width: 1100px) 18vw, (min-width: 640px) 36vw, 100vw'} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full min-h-36 items-center justify-center bg-gradient-to-br from-muted to-secondary/70"><Building2 className="h-10 w-10 text-muted-foreground/35" /><span className="sr-only">No building photo available</span></div>}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{images.length > 0 && <Badge className="gap-1 bg-foreground/80 text-background hover:bg-foreground/80"><Camera className="h-3 w-3" />{images.length}</Badge>}</div>
            <button type="button" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/95 shadow" aria-label={favorited ? `Remove ${building.name} from favorites` : `Save ${building.name}`} onClick={(event) => { event.stopPropagation(); onFavoriteChange?.(building, !favorited); }}><Heart className={cn('h-5 w-5', favorited && 'fill-destructive text-destructive')} /></button>
          </div>

          <div className="flex flex-col border-t border-border bg-muted/20 p-2" aria-label="Minimum base rent by apartment type">
            <p className="mb-1.5 flex flex-wrap items-baseline gap-1 text-muted-foreground"><span className="text-xs font-semibold uppercase tracking-[0.08em]">Starting base rents</span><span className="text-[11px] font-medium normal-case tracking-normal">· Approximately</span></p>
            <div className="grid grid-cols-2 gap-1.5">{BEDROOM_PRICE_LABELS.map(([bedroom, label]) => { const minimum = inventory?.bedroomMinimums[bedroom]; return <div key={bedroom} className="min-w-0 rounded-md border border-border/60 bg-white px-2.5 py-2"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="truncate text-sm font-bold leading-5 text-foreground">{minimum != null ? formatCurrency(minimum) : hasStreetEasyRentData ? 'Unavailable' : 'Unknown'}</p></div>; })}</div>
            <div className="mt-2 grid grid-cols-3 border-t border-border/70 pt-2 text-[11px] font-semibold text-foreground" aria-label="Building facts">
              <span className="flex min-w-0 items-center gap-1.5 border-r border-border/70 px-1"><Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{building.total_units != null ? `${building.total_units} units` : 'Units unknown'}</span></span>
              <span className="flex min-w-0 items-center justify-center gap-1.5 border-r border-border/70 px-1"><Layers3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{storyCount != null ? `${storyCount} stories` : 'Stories unknown'}</span></span>
              <span className="flex min-w-0 items-center justify-end gap-1.5 px-1"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{building.year_built != null ? `${building.year_built} built` : 'Year unknown'}</span></span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-3">
          <p className="truncate text-sm font-semibold uppercase tracking-[0.1em] text-primary">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
          <h2 className="truncate font-serif text-xl font-bold text-foreground transition group-hover:text-primary">{building.name}</h2>
          <p className="mb-2 flex items-start gap-1.5 text-sm leading-5 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="line-clamp-2">{fullAddress}</span></p>
          <div className="mb-2 grid grid-cols-2 gap-1.5">{CORE_AMENITIES.map((amenity) => { const confirmed = amenity.values.some((value) => amenities.has(value)); return confirmed ? <span key={amenity.label} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-accent-foreground"><Check className="h-3.5 w-3.5 text-primary-hover" />{amenity.label}</span> : <span key={amenity.label} aria-hidden="true" />; })}</div>
          {(building.amenities?.length ?? 0) > 0 && <div className="relative z-10 mb-1.5"><button type="button" className="flex min-h-8 w-full items-center justify-center gap-1 rounded-md border border-border/70 bg-white px-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground" aria-expanded={showAllAmenities} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setShowAllAmenities((value) => !value); }}>More <ChevronDown className={cn('h-4 w-4 transition-transform', showAllAmenities && 'rotate-180')} /></button>{showAllAmenities && <div className="mt-1.5 flex flex-wrap gap-1 rounded-md border border-border/60 bg-muted/20 p-2">{building.amenities?.map((amenity) => <span key={amenity} className="rounded-full bg-white px-2 py-1 text-xs font-medium text-foreground shadow-sm">{amenity}</span>)}</div>}</div>}

          {subway && <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><TrainFront className="h-3.5 w-3.5" />{subway}</span></div>}
          <div className="relative z-10 mt-auto border-t border-border/70 pt-2"><label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={(event) => event.stopPropagation()}><Checkbox checked={compared} onCheckedChange={(checked) => onCompareChange?.(building, checked === true)} aria-label={`Save ${building.name} and add it to compare`} />Save and Compare</label><div className="grid grid-cols-[46fr_54fr] gap-1.5"><Button asChild size="sm" variant="outline" className="h-11 whitespace-nowrap px-2 text-sm leading-none"><Link href={`/roommate-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Users className="mr-1 h-4 w-4 shrink-0" />Find a Roommate</Link></Button><Button asChild size="sm" className="h-11 whitespace-nowrap px-2 text-sm leading-none"><Link href={`/rent-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Home className="mr-1 h-4 w-4 shrink-0" />Rent the Entire Unit</Link></Button></div></div>
        </div>
      </div>
    </article>
  );
}

export const BuildingResultCard = BuildingCard;

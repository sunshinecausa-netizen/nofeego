'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Building2, Camera, Check, Clock3, Heart, Home, MapPin, TrainFront, Users } from 'lucide-react';
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function updatedLabel(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days <= 30) return `Updated ${days} days ago`;
  return `Updated ${new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const availabilityLabel = { available: 'Availability confirmed', limited: 'Limited availability', unavailable: 'No availability currently confirmed' } as const;

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
  const href = `/buildings/${building.slug}`;
  const heroImage = building.hero_image_url ?? building.hero_image;
  const images = [heroImage, ...(building.gallery ?? [])].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  const amenities = new Set(building.amenities ?? []);
  const updateText = updatedLabel(building.updated_at);
  const subway = building.nearby_subway?.[0];
  const fullAddress = [building.address, building.city, building.state, building.zip_code].filter(Boolean).join(', ');
  const compact = variant === 'map';
  const requestContext = new URLSearchParams({ buildingId: building.id, buildingSlug: building.slug, buildingName: building.name, neighborhood: building.neighborhood ?? building.borough ?? '', address: fullAddress }).toString();
  return (
    <article data-building-id={building.id} className={cn('group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 focus-within:ring-2 focus-within:ring-primary/40 hover:border-primary/30 hover:shadow-md', compact ? 'max-h-[520px] w-[340px] overflow-y-auto' : 'min-h-[224px] hover:-translate-y-0.5', highlighted ? 'border-primary ring-2 ring-primary/20' : 'border-border')} onMouseEnter={() => onHover?.(building.id)} onMouseLeave={() => onHover?.(null)} onClick={() => onSelect?.(building.id)}>
      <Link href={href} className="absolute inset-0 z-0" aria-label={`View ${building.name} details`} />
      <div className={cn('grid h-full', compact ? 'grid-cols-1' : 'min-h-[224px] grid-cols-1 sm:grid-cols-[41%_59%]')}>
        <div className={cn('grid min-w-0 overflow-hidden border-border', compact ? 'grid-rows-[auto_auto] border-b' : 'sm:grid-rows-2 sm:border-r')}>
          <div className={cn('relative overflow-hidden bg-muted', compact ? 'min-h-36' : 'min-h-40')}>
            {heroImage ? <Image src={heroImage} alt={`${building.name} exterior`} fill unoptimized sizes={compact ? '340px' : '(min-width: 1100px) 18vw, (min-width: 640px) 36vw, 100vw'} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full min-h-36 items-center justify-center bg-gradient-to-br from-muted to-secondary/70"><Building2 className="h-10 w-10 text-muted-foreground/35" /><span className="sr-only">No building photo available</span></div>}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{images.length > 0 && <Badge className="gap-1 bg-foreground/80 text-background hover:bg-foreground/80"><Camera className="h-3 w-3" />{images.length}</Badge>}</div>
            <button type="button" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/95 shadow" aria-label={favorited ? `Remove ${building.name} from favorites` : `Save ${building.name}`} onClick={(event) => { event.stopPropagation(); onFavoriteChange?.(building, !favorited); }}><Heart className={cn('h-5 w-5', favorited && 'fill-destructive text-destructive')} /></button>
          </div>

          <div className="border-t border-border bg-muted/20 p-2" aria-label="Minimum base rent by apartment type">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Minimum base rent</p>
            <div className="grid grid-cols-2 gap-1.5">{BEDROOM_PRICE_LABELS.map(([bedroom, label]) => { const minimum = inventory?.bedroomMinimums[bedroom]; return <div key={bedroom} className="min-w-0 rounded-md border border-border/60 bg-white px-2 py-1.5"><p className="text-[10px] font-medium text-muted-foreground">{label}</p><p className="truncate text-[11px] font-bold leading-4 text-foreground">{minimum != null ? `From ${formatCurrency(minimum)}` : 'Unknown'}</p></div>; })}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-3">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-primary">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
          <h2 className="truncate font-serif text-lg font-bold text-foreground transition group-hover:text-primary">{building.name}</h2>
          <p className="mb-1.5 flex items-start gap-1 text-xs leading-4 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{fullAddress}</span></p>
          <p className="mb-1.5 text-[11px] text-muted-foreground">{availabilityLabel[inventory?.availabilityStatus ?? 'unavailable']}</p>

          <div className="mb-1.5 grid grid-cols-2 gap-1">{CORE_AMENITIES.map((amenity) => { const confirmed = amenity.values.some((value) => amenities.has(value)); return <span key={amenity.label} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium', confirmed ? 'bg-accent text-accent-foreground' : 'bg-muted/60 text-muted-foreground')}><Check className={cn('h-3 w-3 text-primary-hover', !confirmed && 'invisible')} />{amenity.label}{!confirmed && ' · Not verified'}</span>; })}</div>

          <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">{subway && <span className="inline-flex items-center gap-1"><TrainFront className="h-3 w-3" />{subway}</span>}{updateText && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{updateText}</span>}</div>
          <div className="relative z-10 mt-auto border-t border-border/70 pt-2"><label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={(event) => event.stopPropagation()}><Checkbox checked={compared} onCheckedChange={(checked) => onCompareChange?.(building, checked === true)} aria-label={`Save ${building.name} and add it to compare`} />Save and Compare</label><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Button asChild size="sm" variant="outline" className="h-10 whitespace-normal px-3 text-xs leading-tight"><Link href={`/roommate-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Users className="mr-1 h-4 w-4 shrink-0" />Find Someone to Rent With</Link></Button><Button asChild size="sm" className="h-10 whitespace-normal px-3 text-xs leading-tight"><Link href={`/rent-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Home className="mr-1 h-4 w-4 shrink-0" />Rent the Entire Place</Link></Button></div></div>
        </div>
      </div>
    </article>
  );
}

export const BuildingResultCard = BuildingCard;

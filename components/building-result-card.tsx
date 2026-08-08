'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Building2, Camera, Check, Clock3, MapPin, TrainFront } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { BuildingInventorySummary } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

const CORE_AMENITIES = [
  { label: 'Doorman', values: ['Doorman'] },
  { label: 'Gym', values: ['Gym'] },
  { label: 'In-unit Laundry', values: ['In-Unit W/D Available'] },
  { label: 'Pets', values: ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed'] },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function bedroomLabel(value: number) {
  return value === 0 ? 'Studio' : `${value}BR`;
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

type Props = {
  building: Building;
  inventory?: BuildingInventorySummary;
  compared: boolean;
  highlighted: boolean;
  onCompareChange: (building: Building, checked: boolean) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export function BuildingResultCard({ building, inventory, compared, highlighted, onCompareChange, onHover, onSelect }: Props) {
  const href = `/buildings/${building.slug}`;
  const heroImage = building.hero_image_url ?? building.hero_image;
  const images = [heroImage, ...(building.gallery ?? [])].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  const amenities = new Set(building.amenities ?? []);
  const confirmedCoreAmenities = CORE_AMENITIES.filter((amenity) => amenity.values.some((value) => amenities.has(value)));
  const updateText = updatedLabel(inventory?.updatedAt ?? building.updated_at);
  const subway = building.nearby_subway?.[0];
  const fullAddress = [building.address, building.city, building.state, building.zip_code].filter(Boolean).join(', ');

  return (
    <article
      data-building-id={building.id}
      className={cn(
        'group relative min-h-[224px] overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 focus-within:ring-2 focus-within:ring-primary/40 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        highlighted ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
      onMouseEnter={() => onHover(building.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(building.id)}
    >
      <Link href={href} className="absolute inset-0 z-0" aria-label={`View ${building.name} details`} />
      <div className="grid h-full min-h-[224px] grid-cols-1 sm:grid-cols-[41%_59%]">
        <div className="relative min-h-44 overflow-hidden bg-muted sm:min-h-full">
          {heroImage ? (
            <Image src={heroImage} alt={`${building.name} exterior`} fill unoptimized sizes="(min-width: 1100px) 18vw, (min-width: 640px) 36vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full min-h-44 items-center justify-center bg-gradient-to-br from-muted to-secondary/70"><Building2 className="h-12 w-12 text-muted-foreground/35" /><span className="sr-only">No building photo available</span></div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {images.length > 0 && <Badge className="gap-1 bg-black/70 text-white hover:bg-black/70"><Camera className="h-3 w-3" />{images.length}</Badge>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-3">
          <div className="mb-1 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-primary">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
              <h2 className="truncate font-serif text-lg font-bold text-foreground transition group-hover:text-primary">{building.name}</h2>
            </div>
          </div>
          <p className="mb-1.5 flex items-start gap-1 text-xs leading-4 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{fullAddress}</span></p>

          {inventory ? (
            <div className="mb-1.5">
              <p className="font-serif text-lg font-bold text-primary">{inventory.minPrice === inventory.maxPrice ? formatCurrency(inventory.minPrice) : `${formatCurrency(inventory.minPrice)}–${formatCurrency(inventory.maxPrice)}`}<span className="ml-1 font-sans text-xs font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground">{inventory.bedrooms.map(bedroomLabel).join(' · ')}{inventory.bedrooms.length > 0 ? ' · ' : ''}{inventory.availableCount} {inventory.availableCount === 1 ? 'unit' : 'units'} available</p>
            </div>
          ) : <p className="mb-2 font-medium text-foreground">Contact for availability</p>}

          {confirmedCoreAmenities.length > 0 && <div className="mb-1.5 flex flex-wrap gap-1">{confirmedCoreAmenities.map((amenity) => <span key={amenity.label} className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"><Check className="h-3 w-3" />{amenity.label}</span>)}</div>}

          <div className="mb-2 mt-auto flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {subway && <span className="inline-flex items-center gap-1"><TrainFront className="h-3 w-3" />{subway}</span>}
            {updateText && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{updateText}</span>}
          </div>

          <div className="relative z-10 flex items-center gap-2 border-t border-border/70 pt-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={(event) => event.stopPropagation()}>
              <Checkbox checked={compared} onCheckedChange={(checked) => onCompareChange(building, checked === true)} aria-label={`Add ${building.name} to compare`} />
              Add to compare
            </label>
            <Button asChild size="sm" className="ml-auto min-h-11 px-4"><Link href={`${href}?intent=request-info`} onClick={(event) => event.stopPropagation()}>Request information</Link></Button>
          </div>
        </div>
      </div>
    </article>
  );
}

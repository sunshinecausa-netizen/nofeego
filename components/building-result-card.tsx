'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Building2, Dumbbell, Heart, Home, MapPin, PawPrint, Shield, Users, WashingMachine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.ceil(value / 50) * 50)}+`;
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
  const compact = variant === 'map';
  const requestContext = new URLSearchParams({ buildingId: building.id, buildingSlug: building.slug, buildingName: building.name, neighborhood: building.neighborhood ?? building.borough ?? '', address: fullAddress }).toString();
  const savedAndCompared = favorited && compared;

  if (!compact) {
    const priceSummary = BEDROOM_PRICE_LABELS
      .map(([bedroom, label]) => {
        const minimum = inventory?.bedroomMinimums[bedroom];
        return minimum == null ? null : `${label} $${formatCurrency(minimum)}`;
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
        <div className="relative aspect-[1.55/1] shrink-0 overflow-hidden bg-muted lg:aspect-auto lg:h-[66%]">
          {heroImage ? <Image src={heroImage} alt={`${building.name} exterior`} fill unoptimized sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-secondary/70"><Building2 className="h-14 w-14 text-muted-foreground/35" /><span className="sr-only">No building photo available</span></div>}
          <p className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
          <button type="button" className="absolute right-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-3 text-xs font-semibold text-navy shadow-md backdrop-blur transition hover:bg-white" aria-label={savedAndCompared ? `Remove ${building.name} from saved and compare` : `Save ${building.name} and add to compare`} aria-pressed={savedAndCompared} onClick={(event) => { event.stopPropagation(); const next = !savedAndCompared; onFavoriteChange?.(building, next); onCompareChange?.(building, next); }}><Heart className={cn('h-5 w-5 shrink-0', savedAndCompared && 'fill-destructive text-destructive')} /><span>Save and Compare</span></button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 py-3.5">
          <div className="grid gap-1.5">
            <h2 data-copyable className="cursor-text select-text truncate font-sans text-xl font-bold leading-6 text-navy transition group-hover:text-primary">{building.name}</h2>
            <p data-copyable className="cursor-text select-text truncate text-sm leading-5 text-muted-foreground">{fullAddress}</p>
            <p className="truncate text-sm font-bold leading-5 text-navy">{priceSummary.length > 0 ? priceSummary.join('  ·  ') : 'Current pricing unavailable'}</p>
            <p className="truncate text-sm leading-5 text-muted-foreground">{amenitySummary.length > 0 ? amenitySummary.join('  ·  ') : 'Amenities unavailable'}</p>
          </div>
          <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-2.5">
            <Button asChild variant="ghost" className="h-9 justify-start px-0 text-sm font-semibold text-navy hover:bg-transparent hover:text-primary"><Link href={`/roommate-request?${requestContext}`} onClick={(event) => event.stopPropagation()}>Find a Roommate</Link></Button>
            <Button asChild variant="outline" className="h-9 rounded-xl border-primary bg-primary/[0.03] px-4 text-sm font-semibold text-primary hover:bg-primary/[0.08] hover:text-primary"><Link href={`/rent-request?${requestContext}`} onClick={(event) => event.stopPropagation()}>View Units</Link></Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article data-building-id={building.id} className={cn('group relative overflow-hidden bg-white transition duration-200', compact ? 'w-full rounded-none border-0 shadow-none' : 'min-h-[300px] cursor-pointer rounded-2xl border shadow-sm focus-within:ring-2 focus-within:ring-primary/40 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md', !compact && (highlighted ? 'border-2 border-primary shadow-[0_0_0_4px_rgba(239,145,0,0.2),0_16px_40px_rgba(22,50,79,0.32)] hover:border-primary hover:shadow-[0_0_0_4px_rgba(239,145,0,0.2),0_16px_40px_rgba(22,50,79,0.32)]' : 'border-border'))} onMouseEnter={() => onHover?.(building.id)} onMouseLeave={() => onHover?.(null)} onClickCapture={(event) => { const target = event.target as HTMLElement; if (target.closest('button, a, [data-copyable]')) return; onSelect?.(building.id); }}>
      <div className="grid min-h-[300px] grid-cols-1">
        {!compact && <div className="relative min-h-[260px] overflow-hidden bg-muted sm:min-h-[340px]">
          {heroImage ? <Image src={heroImage} alt={`${building.name} exterior`} fill unoptimized sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full min-h-[260px] items-center justify-center bg-gradient-to-br from-muted to-secondary/70 sm:min-h-[340px]"><Building2 className="h-14 w-14 text-muted-foreground/35" /><span className="sr-only">No building photo available</span></div>}
          <p className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-sm sm:text-sm">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>
          <button type="button" className="absolute right-4 top-4 z-20 inline-flex h-12 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-navy shadow-md backdrop-blur transition hover:bg-white" aria-label={savedAndCompared ? `Remove ${building.name} from saved and compare` : `Save ${building.name} and add to compare`} aria-pressed={savedAndCompared} onClick={(event) => { event.stopPropagation(); const next = !savedAndCompared; onFavoriteChange?.(building, next); onCompareChange?.(building, next); }}><Heart className={cn('h-6 w-6', savedAndCompared && 'fill-destructive text-destructive')} /><span>Save and Compare</span></button>
        </div>}

        <div className="relative flex min-w-0 flex-col p-5 sm:p-6">
          <div className={cn('min-w-0', compact && (onClose ? 'pr-52' : 'pr-44'))}>
            {compact && <p className="truncate text-sm font-bold uppercase tracking-[0.18em] text-primary">{building.neighborhood ?? building.borough ?? 'New York metro'}</p>}
            <h2 data-copyable className={cn('mt-1 cursor-text select-text break-words font-serif font-bold leading-tight text-navy transition group-hover:text-primary', compact ? 'text-2xl' : 'text-3xl')}>{building.name}</h2>
            <p data-copyable className="mt-1 flex cursor-text select-text items-start gap-1.5 text-base leading-6 text-muted-foreground"><MapPin className="mt-0.5 h-5 w-5 shrink-0" /><span className="line-clamp-2">{fullAddress}</span></p>
          </div>

          {compact && <button type="button" className={cn('absolute top-5 z-20 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-navy transition hover:bg-muted', onClose ? 'right-16' : 'right-4')} aria-label={savedAndCompared ? `Remove ${building.name} from saved and compare` : `Save ${building.name} and add to compare`} aria-pressed={savedAndCompared} onClick={(event) => { event.stopPropagation(); const next = !savedAndCompared; onFavoriteChange?.(building, next); onCompareChange?.(building, next); }}><Heart className={cn('h-6 w-6', savedAndCompared && 'fill-destructive text-destructive')} /><span className={cn(onClose && 'hidden min-[760px]:inline')}>Save and Compare</span></button>}
          {onClose && <button type="button" className="absolute right-3 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow" aria-label={`Close ${building.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}><X className="h-5 w-5" /></button>}

          <div className="mt-6 grid grid-cols-4 border-y border-border/70 py-4" aria-label="Starting base rents by apartment type">
            {BEDROOM_PRICE_LABELS.map(([bedroom, label], index) => { const minimum = inventory?.bedroomMinimums[bedroom]; return <div key={bedroom} className={cn('min-w-0 px-2 text-center', index > 0 && 'border-l border-border')}><p className="whitespace-nowrap text-sm font-medium text-navy">{label}</p><p className={cn('mt-1 whitespace-nowrap font-semibold text-navy', compact ? 'text-base' : 'text-xl')}>{minimum != null ? formatCurrency(minimum) : '—'}</p></div>; })}
          </div>

          <div className="grid grid-cols-4 py-4" aria-label="Building amenities">
            {CORE_AMENITIES.map(({ label, values, Icon }, index) => { const confirmed = values.some((value) => amenities.has(value)); return <div key={label} className={cn('flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-center', index > 0 && 'border-l border-border', !confirmed && 'opacity-25')}><Icon className="h-7 w-7 text-navy" /><span className={cn('whitespace-nowrap font-medium text-navy', compact ? 'text-[11px]' : 'text-xs')}>{label}</span></div>; })}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-20 justify-start border-primary px-4 text-left hover:bg-primary/5"><Link href={`/roommate-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Users className="mr-3 h-8 w-8 shrink-0 text-navy" /><span className="leading-5 text-navy"><span className="block whitespace-nowrap text-sm font-bold">Find a roommate</span>{(inventory?.roommateInterestCount ?? 0) >= 3 ? <span className="block text-[11px] font-medium leading-4">{inventory?.roommateInterestCount} people are interested in sharing this home</span> : <><span className="block whitespace-nowrap text-[11px] font-medium leading-4">Join others interested in</span><span className="block whitespace-nowrap text-[11px] font-medium leading-4">sharing this home.</span></>}</span></Link></Button>
            <Button asChild variant="outline" className="h-20 rounded-xl border-primary bg-primary/[0.03] px-4 text-primary hover:bg-primary/[0.08] hover:text-primary"><Link href={`/rent-request?${requestContext}`} onClick={(event) => event.stopPropagation()}><Home className="mr-3 h-8 w-8 shrink-0" /><span className="text-sm font-bold">View all available units</span></Link></Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export const BuildingResultCard = BuildingCard;

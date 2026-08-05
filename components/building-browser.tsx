'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Building2, ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Building } from '@/lib/types';
import type { BuildingsPageResult } from '@/lib/public-buildings';

const PAGE_SIZE = 24;

type Props = {
  initialPage: number;
  initialQuery?: string;
  initialResult: BuildingsPageResult;
  initialError?: string | null;
  mode: 'buildings' | 'search';
};

export function BuildingBrowser({ initialPage, initialQuery = '', initialResult, initialError = null, mode }: Props) {
  const result = initialResult;
  const [query, setQuery] = useState(initialQuery);
  const error = initialError;

  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const route = mode === 'search' ? '/search' : '/buildings';

  function href(page: number, search = initialQuery) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (page > 1) params.set('page', String(page));
    return `${route}${params.size ? `?${params}` : ''}`;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.assign(href(1, query));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Verified New York buildings</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
            {mode === 'search' ? 'Search Buildings' : 'Buildings'}
          </h1>
          {!error && <p className="text-sm text-muted-foreground">{result.total} verified buildings</p>}
        </div>
      </div>

      <form onSubmit={onSubmit} role="search" className="mb-8 flex max-w-3xl gap-2">
        <label htmlFor="building-search" className="sr-only">Building, address, or neighborhood</label>
        <Input id="building-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Building, address, or neighborhood" />
        <Button type="submit"><Search className="mr-2 h-4 w-4" />Search</Button>
      </form>

      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
          <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
          <h2 className="mb-1 text-lg font-semibold">We couldn&apos;t load the buildings</h2>
          <p className="mb-4 max-w-xl text-sm text-muted-foreground">{error}</p>
          <Button type="button" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      )}

      {!error && result.buildings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-semibold">No buildings found</h2>
          <p className="mb-4 text-sm text-muted-foreground">Try another name, address, or neighborhood.</p>
          {initialQuery && <Button asChild variant="outline"><Link href={href(1, '')}>View all buildings</Link></Button>}
        </div>
      )}

      {!error && result.buildings.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {(initialPage - 1) * PAGE_SIZE + 1}–{Math.min(initialPage * PAGE_SIZE, result.total)} of {result.total}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.buildings.map((building: Building) => (
              <Link key={building.id} href={`/buildings/${building.slug}`} className="group overflow-hidden rounded-xl border border-border bg-white transition hover:border-primary/30 hover:shadow-lg">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                  {(building.hero_image_url ?? building.hero_image) ? (
                    <Image src={(building.hero_image_url ?? building.hero_image)!} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="font-serif text-8xl text-muted-foreground/20" aria-hidden="true">{building.name.slice(0, 1)}</span>
                  )}
                  {building.building_id && <span className="absolute left-3 top-3 rounded bg-white/95 px-2 py-1 text-xs font-medium">{building.building_id}</span>}
                </div>
                <div className="p-4">
                  <h2 className="mb-1 font-serif text-lg font-bold transition-colors group-hover:text-primary">{building.name}</h2>
                  <p className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{building.address}, {building.city}, {building.state} {building.zip_code ?? ''}</p>
                  {(building.neighborhood || building.borough) && <p className="mt-2 text-xs text-muted-foreground">{[building.neighborhood, building.borough].filter(Boolean).join(' · ')}</p>}
                </div>
              </Link>
            ))}
          </div>
          <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Buildings pagination">
            <Button asChild={initialPage > 1} variant="outline" disabled={initialPage <= 1}>
              {initialPage > 1 ? <Link href={href(initialPage - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Link> : <span><ChevronLeft className="mr-1 inline h-4 w-4" />Previous</span>}
            </Button>
            <span className="text-sm text-muted-foreground">Page {initialPage} of {pageCount}</span>
            <Button asChild={initialPage < pageCount} variant="outline" disabled={initialPage >= pageCount}>
              {initialPage < pageCount ? <Link href={href(initialPage + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Link> : <span>Next<ChevronRight className="ml-1 inline h-4 w-4" /></span>}
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}

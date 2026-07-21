'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { MapPlaceholder } from '@/components/map-placeholder';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Listing, Neighborhood, SearchFilters } from '@/lib/types';
import { fetchListings, fetchNeighborhoods } from '@/lib/services';

function SearchContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<'split' | 'list' | 'map'>('split');
  const [sort, setSort] = useState<string>('newest');

  const filters: SearchFilters = {
    neighborhood: searchParams.get('neighborhood') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
    bedrooms: searchParams.get('bedrooms') ?? undefined,
    bathrooms: searchParams.get('bathrooms') ?? undefined,
    petPolicy: searchParams.get('petPolicy') ?? undefined,
    furnished: searchParams.get('furnished') ?? undefined,
    moveInDate: searchParams.get('moveInDate') ?? undefined,
    leaseTerm: searchParams.get('leaseTerm') ?? undefined,
    listingType: searchParams.get('listingType') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
  };

  useEffect(() => {
    fetchNeighborhoods().then(setNeighborhoods).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchListings({ ...filters, sort })
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), sort]);

  const mapListings = listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    price: l.price,
    latitude: l.latitude,
    longitude: l.longitude,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Search bar */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <SearchBar neighborhoods={neighborhoods} defaultListingType={filters.listingType} variant="compact" />
        </div>
      </div>

      {/* Results header */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">
              {loading ? 'Searching...' : `${listings.length} Apartment${listings.length !== 1 ? 's' : ''} Found`}
            </h1>
            {filters.neighborhood && filters.neighborhood !== 'all' && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {neighborhoods.find((n) => n.slug === filters.neighborhood)?.name ?? filters.neighborhood}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="lg:hidden">
              <TabsList className="h-9">
                <TabsTrigger value="list" className="px-3 py-1 text-xs">
                  <List className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="map" className="px-3 py-1 text-xs">
                  <MapIcon className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop split view */}
        <div className="hidden lg:flex h-full">
          <div className="w-[55%] xl:w-[50%] overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-muted rounded-2xl animate-pulse aspect-[4/3]" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold text-lg mb-1">No apartments found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Try adjusting your filters or search criteria to see more results.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} onHover={setHoveredId} />
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 p-4 pl-0">
            <MapPlaceholder
              listings={mapListings}
              hoveredId={hoveredId}
              onMarkerHover={setHoveredId}
              height="100%"
            />
          </div>
        </div>

        {/* Mobile list view */}
        {view === 'list' && (
          <div className="lg:hidden h-full overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted rounded-2xl animate-pulse aspect-[4/3]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile map view */}
        {view === 'map' && (
          <div className="lg:hidden h-full p-4">
            <MapPlaceholder
              listings={mapListings}
              hoveredId={hoveredId}
              onMarkerHover={setHoveredId}
              height="100%"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground">Loading search...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

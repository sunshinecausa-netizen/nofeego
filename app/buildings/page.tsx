'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Building, Neighborhood } from '@/lib/types';
import { fetchBuildings, fetchNeighborhoods } from '@/lib/data';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([fetchBuildings(), fetchNeighborhoods()])
      .then(([b, n]) => {
        setBuildings(b);
        setNeighborhoods(n);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = neighborhoodFilter === 'all'
    ? buildings
    : buildings.filter((b) => b.neighborhoods?.slug === neighborhoodFilter);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
          Manhattan Buildings
        </h1>
        <p className="text-muted-foreground">
          Browse {buildings.length} residential buildings across Manhattan&apos;s finest neighborhoods.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-muted-foreground">Filter by neighborhood:</span>
        <Select value={neighborhoodFilter} onValueChange={setNeighborhoodFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Neighborhoods</SelectItem>
            {neighborhoods.map((n) => (
              <SelectItem key={n.id} value={n.slug}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-muted rounded-xl animate-pulse aspect-[4/3]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((building) => (
            <Link key={building.id} href={`/buildings/${building.slug}`} className="group">
              <div className="bg-white rounded-xl border border-border overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={building.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
                    alt={building.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {building.building_type && (
                    <Badge className="absolute top-3 left-3 bg-white/95 text-foreground text-xs">
                      {building.building_type}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {building.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{building.address}</span>
                  </div>
                  {building.neighborhoods && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {building.neighborhoods.name}
                    </p>
                  )}
                  {building.amenities && building.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {building.amenities.slice(0, 4).map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs font-normal">
                          {a}
                        </Badge>
                      ))}
                      {building.amenities.length > 4 && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          +{building.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">No buildings found</h3>
          <p className="text-sm text-muted-foreground">Try a different neighborhood filter.</p>
        </div>
      )}
    </div>
  );
}

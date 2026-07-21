'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, TrendingUp } from 'lucide-react';
import type { Neighborhood } from '@/lib/types';
import { fetchNeighborhoods } from '@/lib/data';

export default function NeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNeighborhoods()
      .then(setNeighborhoods)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
          Manhattan Neighborhoods
        </h1>
        <p className="text-muted-foreground">
          Explore {neighborhoods.length} neighborhoods across Manhattan and find your perfect area.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-muted rounded-xl animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {neighborhoods.map((n) => (
            <Link key={n.id} href={`/neighborhoods/${n.slug}`} className="group">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
                <img
                  src={n.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
                  alt={n.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium opacity-90">{n.borough}</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-2">{n.name}</h3>
                  <p className="text-sm text-white/80 line-clamp-2 mb-3">{n.description ?? ''}</p>
                  {n.avg_rent && (
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="font-semibold">${n.avg_rent.toLocaleString()}</span>
                      <span className="opacity-80">/mo avg</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

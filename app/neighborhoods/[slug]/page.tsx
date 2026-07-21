'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, ArrowLeft, TrendingUp, Building as BuildingIcon, Home, Train,
  Utensils, Coffee, Trees, GraduationCap, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ListingCard } from '@/components/listing-card';
import { MapPlaceholder } from '@/components/map-placeholder';
import { FaqSection } from '@/components/faq-section';
import type { Neighborhood, Building, Listing } from '@/lib/types';
import {
  fetchNeighborhoodBySlug, fetchListingsByNeighborhood, fetchBuildingsByNeighborhood,
} from '@/lib/services';

export default function NeighborhoodDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const n = await fetchNeighborhoodBySlug(slug);
        setNeighborhood(n as Neighborhood);
        if (n) {
          const [l, b] = await Promise.all([
            fetchListingsByNeighborhood(n.id),
            fetchBuildingsByNeighborhood(n.id),
          ]);
          setListings(l);
          setBuildings(b);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-muted rounded-2xl animate-pulse aspect-[16/9] mb-6" />
      </div>
    );
  }

  if (!neighborhood) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Neighborhood Not Found</h1>
        <p className="text-muted-foreground mb-6">The neighborhood you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/neighborhoods">Back to Neighborhoods</Link>
        </Button>
      </div>
    );
  }

  const mapListings = listings.map((l) => ({
    id: l.id, slug: l.slug, title: l.title, price: l.price,
    latitude: l.latitude ?? neighborhood.latitude, longitude: l.longitude ?? neighborhood.longitude,
  }));

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[300px] sm:h-[400px] bg-muted overflow-hidden">
        <img
          src={neighborhood.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
          alt={neighborhood.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Neighborhoods', href: '/neighborhoods' },
                { label: neighborhood.name },
              ]}
            />
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-3 mb-2">
              {neighborhood.name}
            </h1>
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {neighborhood.borough}
              </span>
              {neighborhood.avg_rent && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" /> ${neighborhood.avg_rent.toLocaleString()}/mo avg
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard icon={Home} label="Available Units" value={listings.length.toString()} />
          <StatCard icon={BuildingIcon} label="Buildings" value={buildings.length.toString()} />
          <StatCard icon={TrendingUp} label="Avg Rent" value={neighborhood.avg_rent ? `$${neighborhood.avg_rent.toLocaleString()}` : 'N/A'} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Overview */}
            <h2 className="font-serif text-2xl font-bold mb-3">About {neighborhood.name}</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {neighborhood.description ?? 'A vibrant Manhattan neighborhood.'}
            </p>

            {/* Average Rent */}
            {neighborhood.avg_rent && (
              <div className="mb-8 p-5 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Rent</p>
                    <p className="font-serif text-2xl font-bold text-primary">${neighborhood.avg_rent.toLocaleString()}/mo</p>
                  </div>
                </div>
              </div>
            )}

            {/* Featured Buildings */}
            {buildings.length > 0 && (
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-4">Featured Buildings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buildings.map((b) => (
                    <Link key={b.id} href={`/buildings/${b.slug}`} className="group">
                      <div className="bg-white rounded-xl border border-border overflow-hidden transition-all hover:shadow-md">
                        <div className="aspect-[4/3] overflow-hidden bg-muted">
                          <img
                            src={b.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
                            alt={b.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{b.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{b.address}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Transportation */}
            {neighborhood.transportation && neighborhood.transportation.length > 0 && (
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                  <Train className="h-5 w-5 text-primary" /> Transportation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {neighborhood.transportation.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg p-3">
                      <Train className="h-4 w-4 text-primary shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Restaurants, Coffee, Parks, Schools */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {neighborhood.restaurants && neighborhood.restaurants.length > 0 && (
                <InfoListCard icon={Utensils} title="Restaurants" items={neighborhood.restaurants} />
              )}
              {neighborhood.coffee_shops && neighborhood.coffee_shops.length > 0 && (
                <InfoListCard icon={Coffee} title="Coffee Shops" items={neighborhood.coffee_shops} />
              )}
              {neighborhood.parks && neighborhood.parks.length > 0 && (
                <InfoListCard icon={Trees} title="Parks" items={neighborhood.parks} />
              )}
              {neighborhood.schools && neighborhood.schools.length > 0 && (
                <InfoListCard icon={GraduationCap} title="Schools" items={neighborhood.schools} />
              )}
            </div>

            {/* Lifestyle */}
            {neighborhood.lifestyle && neighborhood.lifestyle.length > 0 && (
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Lifestyle
                </h3>
                <div className="flex flex-wrap gap-2">
                  {neighborhood.lifestyle.map((item) => (
                    <Badge key={item} variant="secondary" className="text-sm py-1.5 px-3">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Listings */}
            <div className="mb-8">
              <h3 className="font-serif text-xl font-bold mb-4">Available Apartments ({listings.length})</h3>
              {listings.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
                  No apartments currently available in this neighborhood.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {listings.slice(0, 6).map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>

            {/* FAQ */}
            <FaqSection faqs={neighborhood.faqs} />
          </div>

          {/* Map sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <h3 className="font-serif text-xl font-bold mb-4">Map</h3>
              <MapPlaceholder listings={mapListings} height="300px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4 text-center">
      <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
      <p className="font-serif text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoListCard({ icon: Icon, title, items }: { icon: React.ComponentType<{ className?: string }>; title: string; items: string[] }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-xs text-muted-foreground">{item}</li>
        ))}
      </ul>
    </div>
  );
}

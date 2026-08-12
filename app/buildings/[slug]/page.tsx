'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Calendar, Building as BuildingIcon, ArrowLeft, Maximize, Train,
  ShoppingBag, Utensils, Check, Heart, GitCompareArrows,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { MapPlaceholder } from '@/components/map-placeholder';
import { FaqSection } from '@/components/faq-section';
import type { Building } from '@/lib/types';
import { fetchBuildingBySlug } from '@/lib/services';
import { useTenantData } from '@/lib/account/tenant-data-context';

export default function BuildingDetailPage() {
  const { favoriteIds, compareIds, toggleFavorite, toggleCompare } = useTenantData();
  const params = useParams();
  const slug = params.slug as string;
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const b = await fetchBuildingBySlug(slug);
        setBuilding(b as Building);
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

  if (!building) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <BuildingIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Building Not Found</h1>
        <p className="text-muted-foreground mb-6">The building you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/buildings">Back to Buildings</Link>
        </Button>
      </div>
    );
  }

  const gallery = building.gallery?.length
    ? building.gallery
    : [building.hero_image].filter(Boolean) as string[];

  const mapListings = [{ id: building.id, slug: building.slug, title: building.name, price: 0, latitude: building.latitude, longitude: building.longitude }];
  const isFavorite = favoriteIds.includes(building.id);
  const isCompared = compareIds.includes(building.id);

  return (
    <div>
      {/* Hero image */}
      <div className="relative h-[300px] sm:h-[400px] bg-muted overflow-hidden">
        <img
          src={building.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
          alt={building.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Buildings', href: '/buildings' },
                { label: building.name },
              ]}
            />
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-3 mb-2">
              {building.name}
            </h1>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <MapPin className="h-4 w-4" />
              <span>{building.address}, {building.city}, {building.state} {building.zip_code}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Key info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <InfoCard icon={BuildingIcon} label="Building Type" value={building.building_type ?? 'Mixed'} />
              <InfoCard icon={Calendar} label="Year Built" value={building.year_built?.toString() ?? 'N/A'} />
              <InfoCard icon={Maximize} label="Floors" value={building.floors?.toString() ?? 'N/A'} />
              <InfoCard icon={MapPin} label="Neighborhood" value={building.neighborhoods?.name ?? 'Manhattan'} />
            </div>

            {/* Overview */}
            <h2 className="font-serif text-2xl font-bold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {building.description ?? 'A premier residential building in the heart of Manhattan.'}
            </p>

            {/* Amenities */}
            {building.amenities && building.amenities.length > 0 && (
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-4">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {building.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Public inventory is intentionally coarse. */}
            <div className="mb-8">
              <h3 className="font-serif text-xl font-bold mb-4">Availability</h3>
              <div className="rounded-xl bg-muted/30 p-6"><p className="text-muted-foreground">Contact NoFeeGo for current availability and rental details.</p></div>
            </div>

            {/* Transportation */}
            {building.transportation && building.transportation.length > 0 && (
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                  <Train className="h-5 w-5 text-primary" /> Transportation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {building.transportation.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg p-3">
                      <Train className="h-4 w-4 text-primary shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {building.nearby_subway && building.nearby_subway.length > 0 && (
                <NearbyCard icon={Train} title="Nearby Subway" items={building.nearby_subway} />
              )}
              {building.nearby_grocery && building.nearby_grocery.length > 0 && (
                <NearbyCard icon={ShoppingBag} title="Nearby Grocery" items={building.nearby_grocery} />
              )}
              {building.nearby_restaurants && building.nearby_restaurants.length > 0 && (
                <NearbyCard icon={Utensils} title="Nearby Restaurants" items={building.nearby_restaurants} />
              )}
            </div>

            {/* Neighborhood Summary */}
            {building.neighborhood_summary && (
              <div className="mb-8 p-5 bg-muted/30 rounded-xl">
                <h3 className="font-serif text-xl font-bold mb-2">Neighborhood Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{building.neighborhood_summary}</p>
                {building.neighborhoods && (
                  <Link
                    href={`/neighborhoods/${building.neighborhoods.slug}`}
                    className="inline-block mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    Explore {building.neighborhoods.name} &rarr;
                  </Link>
                )}
              </div>
            )}

            {/* FAQ */}
            <FaqSection faqs={building.faqs} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Contact card */}
              <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
                <h3 className="font-serif text-lg font-bold mb-4">Contact</h3>
                <div className="mb-3 grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => void toggleFavorite(building.id, !isFavorite)}><Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />{isFavorite ? 'Saved' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => void toggleCompare(building.id, !isCompared)}><GitCompareArrows className="mr-2 h-4 w-4" />{isCompared ? 'Added' : 'Compare'}</Button></div>
                <Button className="w-full mb-2" size="lg">
                  Schedule a Tour
                </Button>
                <Button variant="outline" className="w-full mb-4" size="lg">
                  Contact Agent
                </Button>
                <Button asChild variant="outline" className="h-auto w-full py-3" size="lg"><Link href={`/roommate-request?${new URLSearchParams({buildingId:building.id,buildingSlug:building.slug,buildingName:building.name,address:building.address,floorPlan:'Any available floor plan'}).toString()}`}><span><span className="block font-semibold">Find a roommate</span><span className="block text-xs font-normal">Share this home</span></span></Link></Button>
              </div>

              {/* Map */}
              <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-sm mb-3">Location</h3>
                <MapPlaceholder listings={mapListings} height="250px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <Icon className="h-4 w-4 text-primary mb-2" />
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function NearbyCard({ icon: Icon, title, items }: { icon: React.ComponentType<{ className?: string }>; title: string; items: string[] }) {
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

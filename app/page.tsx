'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, CalendarClock, Users, ArrowRight, TrendingUp, Shield, Search, Heart, Zap } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { ListingCard } from '@/components/listing-card';
import { SectionHeader } from '@/components/section-header';
import { Badge } from '@/components/ui/badge';
import type { Neighborhood, Listing, Building } from '@/lib/types';
import {
  fetchNeighborhoods,
  fetchFeaturedBuildings,
  fetchLatestListings,
  fetchLuxuryListings,
  fetchListingsByType,
} from '@/lib/services';

export default function HomePage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [featuredBuildings, setFeaturedBuildings] = useState<Building[]>([]);
  const [latestListings, setLatestListings] = useState<Listing[]>([]);
  const [luxuryListings, setLuxuryListings] = useState<Listing[]>([]);
  const [shortStays, setShortStays] = useState<Listing[]>([]);
  const [sharedLiving, setSharedLiving] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [n, fb, latest, luxury, ss, sl] = await Promise.all([
          fetchNeighborhoods(),
          fetchFeaturedBuildings(6),
          fetchLatestListings(8),
          fetchLuxuryListings(4),
          fetchListingsByType('short_stay', 4),
          fetchListingsByType('shared_living', 4),
        ]);
        setNeighborhoods(n);
        setFeaturedBuildings(fb);
        setLatestListings(latest);
        setLuxuryListings(luxury);
        setShortStays(ss);
        setSharedLiving(sl);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Compact search section */}
      <section className="bg-gradient-to-b from-accent/30 to-background border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center mb-6 max-w-2xl mx-auto">
            <Badge variant="secondary" className="mb-3 gap-1">
              <TrendingUp className="h-3 w-3" />
              {latestListings.length}+ Active Listings
            </Badge>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 text-balance">
              Find Your Manhattan Apartment
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Browse rentals, short stays, and shared living across NYC&apos;s best neighborhoods.
            </p>
          </div>
          <SearchBar neighborhoods={neighborhoods} />
        </div>
      </section>

      {/* Featured Buildings */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full">
        <SectionHeader
          title="Featured Buildings"
          subtitle="Discover Manhattan's premier residential buildings"
          href="/buildings"
        />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl animate-pulse aspect-[4/3]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBuildings.map((building) => (
              <Link key={building.id} href={`/buildings/${building.slug}`} className="group">
                <div className="bg-white rounded-2xl border border-border overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={building.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
                      alt={building.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
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
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{building.address}</span>
                    </div>
                    {building.neighborhoods && (
                      <p className="text-xs text-muted-foreground mt-1">{building.neighborhoods.name}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular Neighborhoods */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeader
            title="Popular Neighborhoods"
            subtitle="Explore Manhattan's most sought-after areas"
            href="/neighborhoods"
          />
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-muted rounded-2xl animate-pulse aspect-[4/5]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {neighborhoods.slice(0, 8).map((n) => (
                <Link key={n.id} href={`/neighborhoods/${n.slug}`} className="group relative aspect-[4/5] rounded-2xl overflow-hidden">
                  <img
                    src={n.hero_image ?? 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg'}
                    alt={n.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs font-medium opacity-90">{n.borough}</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold leading-tight">{n.name}</h3>
                    {n.avg_rent && (
                      <p className="text-xs mt-1 opacity-90">From ${n.avg_rent.toLocaleString()}/mo</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Luxury Apartments */}
      {luxuryListings.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full">
          <SectionHeader
            title="Luxury Apartments"
            subtitle="Premium living spaces starting at $5,000/mo"
            href="/search?minPrice=5000"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {luxuryListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Short Stay Rentals */}
      {shortStays.length > 0 && (
        <section className="bg-muted/30 border-y border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeader
              title="Short Stay Rentals"
              subtitle="Furnished apartments for daily, weekly, or monthly stays"
              href="/short-stays"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {shortStays.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shared Living */}
      {sharedLiving.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full">
          <SectionHeader
            title="Shared Living"
            subtitle="Private and shared rooms for flexible, affordable living"
            href="/shared-living"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sharedLiving.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Listings */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <SectionHeader
            title="Latest Listings"
            subtitle="Newest apartments added to our platform"
            href="/search"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {latestListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-3">Why Choose ManhattanLiving</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We make finding your next Manhattan apartment simple, transparent, and fast.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={Search}
            title="Comprehensive Search"
            description="Filter by neighborhood, price, bedrooms, pet policy, furnished status, and more to find exactly what you need."
          />
          <FeatureCard
            icon={Shield}
            title="Verified Listings"
            description="Every listing is reviewed by our team before going live, so you can browse with confidence."
          />
          <FeatureCard
            icon={Heart}
            title="Save Favorites"
            description="Create an account to save your favorite apartments and track new listings that match your criteria."
          />
          <FeatureCard
            icon={Zap}
            title="Fast & Mobile-First"
            description="Our platform is optimized for speed and designed mobile-first, so you can search on the go."
          />
        </div>
      </section>

      {/* List Your Property CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-serif text-3xl font-bold mb-3">List Your Property</h2>
              <p className="text-primary-foreground/80 text-lg">
                Reach thousands of qualified renters searching for apartments in Manhattan. List your property in minutes.
              </p>
            </div>
            <Link
              href="/list-your-property"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shrink-0"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 transition-all hover:shadow-md">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-serif text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

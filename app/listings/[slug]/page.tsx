'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BedDouble, Bath, Maximize, PawPrint, Sofa, Calendar, Clock,
  MapPin, Building as BuildingIcon, Check, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapView } from '@/components/map-view';
import { ListingCard } from '@/components/listing-card';
import type { Listing } from '@/lib/types';
import { PET_POLICY_LABELS, LISTING_TYPE_LABELS } from '@/lib/types';
import { fetchListingBySlug, fetchListings, formatPrice, formatBedrooms, formatBathrooms, formatDate } from '@/lib/data';

export default function ListingDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [related, setRelated] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const l = await fetchListingBySlug(slug);
        setListing(l as Listing);
        if (l) {
          const all = await fetchListings({
            neighborhood: l.neighborhoods?.slug,
            listingType: l.listing_type,
          });
          setRelated(all.filter((r) => r.id !== l.id).slice(0, 3));
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
        <div className="bg-muted rounded-xl animate-pulse aspect-[16/9] mb-6" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <BuildingIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Listing Not Found</h1>
        <p className="text-muted-foreground mb-6">This apartment may have been removed or is no longer available.</p>
        <Button asChild>
          <Link href="/search">Search Apartments</Link>
        </Button>
      </div>
    );
  }

  const images = listing.images?.length
    ? listing.images
    : [listing.buildings?.hero_image ?? 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'];

  const specs = [
    { icon: BedDouble, label: 'Bedrooms', value: formatBedrooms(listing.bedrooms) },
    { icon: Bath, label: 'Bathrooms', value: formatBathrooms(listing.bathrooms) },
    { icon: Maximize, label: 'Square Feet', value: listing.sqft ? `${listing.sqft} sqft` : 'N/A' },
    { icon: PawPrint, label: 'Pet Policy', value: PET_POLICY_LABELS[listing.pet_policy] ?? listing.pet_policy },
    { icon: Sofa, label: 'Furnished', value: listing.furnished ? 'Yes' : 'No' },
    { icon: Calendar, label: 'Move-in', value: formatDate(listing.move_in_date) },
    { icon: Clock, label: 'Lease Term', value: listing.lease_term_months ? `${listing.lease_term_months} months` : 'Flexible' },
    { icon: BuildingIcon, label: 'Unit', value: listing.unit_number ?? 'N/A' },
  ];

  const mapListings = [{
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    latitude: listing.latitude ?? listing.buildings?.latitude ?? null,
    longitude: listing.longitude ?? listing.buildings?.longitude ?? null,
  }];

  return (
    <div>
      {/* Gallery */}
      <div className="relative h-[300px] sm:h-[450px] bg-muted overflow-hidden">
        <img src={images[currentImage]} alt={listing.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`h-2 rounded-full transition-all ${i === currentImage ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-4 left-4">
          <Button asChild variant="ghost" size="sm" className="bg-white/80 hover:bg-white text-foreground">
            <Link href="/search">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Search
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Title section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                {listing.listing_type !== 'rental' && (
                  <Badge variant="secondary">{LISTING_TYPE_LABELS[listing.listing_type]}</Badge>
                )}
                {listing.furnished && <Badge variant="secondary">Furnished</Badge>}
              </div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">{listing.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {listing.neighborhoods?.name ?? 'Manhattan'}
                  {listing.buildings?.name && ` · ${listing.buildings.name}`}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-border">
              <span className="font-serif text-3xl font-bold text-primary">{formatPrice(listing.price)}</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            {/* Specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {specs.map((spec) => (
                <div key={spec.label} className="bg-muted/40 rounded-lg p-4">
                  <spec.icon className="h-4 w-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">{spec.label}</p>
                  <p className="font-semibold text-sm">{spec.value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <h2 className="font-serif text-2xl font-bold mb-3">About This Apartment</h2>
            <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">
              {listing.description ?? 'No description available.'}
            </p>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-4">Apartment Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {listing.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Building info */}
            {listing.buildings && (
              <div className="mb-8 p-5 bg-muted/30 rounded-xl">
                <h3 className="font-serif text-xl font-bold mb-2">Building: {listing.buildings.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{listing.buildings.address}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/buildings/${listing.buildings.slug}`}>
                    View Building Details
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Contact card */}
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Monthly Rent</p>
                <p className="font-serif text-3xl font-bold text-primary mb-4">{formatPrice(listing.price)}</p>
                <Button className="w-full mb-2" size="lg">
                  Schedule a Tour
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  Contact Agent
                </Button>
              </div>

              {/* Map */}
              <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-sm mb-3">Location</h3>
                <MapView listings={mapListings} height="250px" />
                {listing.neighborhoods && (
                  <Link
                    href={`/neighborhoods/${listing.neighborhoods.slug}`}
                    className="block mt-3 text-sm text-primary hover:underline"
                  >
                    Explore {listing.neighborhoods.name} &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related listings */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold mb-6">Similar Apartments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => (
                <ListingCard key={r.id} listing={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BedDouble, Bath, Maximize, MapPin, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from '@/components/favorite-button';
import type { Listing } from '@/lib/types';
import { PET_POLICY_LABELS, LISTING_TYPE_LABELS } from '@/lib/types';
import { formatPrice, formatBedrooms, formatBathrooms } from '@/lib/services';

export function ListingCard({
  listing,
  onHover,
}: {
  listing: Listing;
  onHover?: (id: string | null) => void;
}) {
  const [currentImage, setCurrentImage] = useState(0);
  const images = listing.images?.length
    ? listing.images
    : [listing.buildings?.hero_image ?? 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'];

  const neighborhoodName = listing.neighborhoods?.name ?? 'Manhattan';
  const isAvailable = !listing.move_in_date || new Date(listing.move_in_date) <= new Date(Date.now() + 7 * 86400000);

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block"
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="bg-white rounded-2xl border border-border overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={images[currentImage]}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Favorite button */}
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton listingId={listing.id} size="sm" />
          </div>

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentImage(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentImage ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {isAvailable && (
              <Badge className="bg-green-600 text-white text-xs gap-1">
                <CheckCircle className="h-3 w-3" /> Available Now
              </Badge>
            )}
            {listing.listing_type !== 'rental' && (
              <Badge variant="secondary" className="bg-white/95 text-foreground text-xs">
                {LISTING_TYPE_LABELS[listing.listing_type] ?? listing.listing_type}
              </Badge>
            )}
            {listing.furnished && (
              <Badge variant="secondary" className="bg-white/95 text-foreground text-xs">
                Furnished
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
            <MapPin className="h-3 w-3" />
            <span>{neighborhoodName}</span>
            {listing.buildings?.name && (
              <>
                <span>·</span>
                <span className="truncate">{listing.buildings.name}</span>
              </>
            )}
          </div>
          <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {listing.title}
          </h3>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-serif text-xl font-bold text-primary">{formatPrice(listing.price)}</span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" />
              {formatBedrooms(listing.bedrooms)}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              {formatBathrooms(listing.bathrooms)}
            </span>
            {listing.sqft && (
              <span className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" />
                {listing.sqft} sqft
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {PET_POLICY_LABELS[listing.pet_policy] ?? listing.pet_policy}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

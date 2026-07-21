'use client';

import { useEffect, useState } from 'react';
import { Users, BedDouble, Home, DoorOpen } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { SectionHeader } from '@/components/section-header';
import { Badge } from '@/components/ui/badge';
import type { Listing } from '@/lib/types';
import { fetchListingsByType } from '@/lib/services';

export default function SharedLivingPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListingsByType('shared_living', 24)
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Categorize by bedrooms: 0 = shared room, 1 = private room, 2+ = entire apartment
  const sharedRooms = listings.filter((l) => l.bedrooms === 0);
  const privateRooms = listings.filter((l) => l.bedrooms === 1);
  const entireApartments = listings.filter((l) => l.bedrooms >= 2);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <Badge variant="secondary" className="mb-3 gap-1">
          <Users className="h-3 w-3" /> Shared Living
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Shared Living in Manhattan
        </h1>
        <p className="text-muted-foreground text-lg">
          Affordable and flexible living options. Choose a private room, shared room, or entire apartment with housemates.
        </p>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <TypeCard
          icon={DoorOpen}
          title="Private Room"
          description="Your own bedroom in a shared apartment. Common areas like kitchen and living room are shared."
          count={privateRooms.length}
        />
        <TypeCard
          icon={BedDouble}
          title="Shared Room"
          description="A bed in a shared bedroom. The most affordable option, great for students and young professionals."
          count={sharedRooms.length}
        />
        <TypeCard
          icon={Home}
          title="Entire Apartment"
          description="Rent an entire apartment and share with your chosen housemates. More space and privacy."
          count={entireApartments.length}
        />
      </div>

      {/* All shared living listings */}
      <SectionHeader title="All Shared Living Listings" subtitle={`${listings.length} rooms and apartments available`} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-muted rounded-2xl animate-pulse aspect-[4/3]" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">No shared living available</h3>
          <p className="text-sm text-muted-foreground">Check back soon for new shared living listings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function TypeCard({
  icon: Icon,
  title,
  description,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 transition-all hover:shadow-md">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-serif text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <Badge variant="secondary" className="text-xs">{count} available</Badge>
    </div>
  );
}

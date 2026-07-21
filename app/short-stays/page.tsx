'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Sun, Moon, Calendar } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import { SectionHeader } from '@/components/section-header';
import { Badge } from '@/components/ui/badge';
import type { Listing } from '@/lib/types';
import { fetchListingsByType } from '@/lib/services';

export default function ShortStaysPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListingsByType('short_stay', 24)
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const daily = listings.filter((l) => l.lease_term_months === 1 || (l.lease_term_months && l.lease_term_months <= 1));
  const weekly = listings.filter((l) => l.lease_term_months === 3);
  const monthly = listings.filter((l) => l.lease_term_months === 6 || l.lease_term_months === 12 || !l.lease_term_months);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <Badge variant="secondary" className="mb-3 gap-1">
          <CalendarClock className="h-3 w-3" /> Short Stay Rentals
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Short-Term Stays in Manhattan
        </h1>
        <p className="text-muted-foreground text-lg">
          Fully furnished apartments for daily, weekly, or monthly stays. Perfect for business travelers, relocators, and extended visits.
        </p>
      </div>

      {/* Duration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <DurationCard
          icon={Sun}
          title="Daily Stays"
          description="Flexible day-to-day rentals for short visits and business trips."
          count={daily.length}
        />
        <DurationCard
          icon={Calendar}
          title="Weekly Stays"
          description="Great for week-long assignments, vacations, or temporary housing."
          count={weekly.length}
        />
        <DurationCard
          icon={Moon}
          title="Monthly Stays"
          description="Extended monthly leases for relocators, students, and digital nomads."
          count={monthly.length}
        />
      </div>

      {/* All short stay listings */}
      <SectionHeader title="All Short Stay Apartments" subtitle={`${listings.length} furnished apartments available`} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-muted rounded-2xl animate-pulse aspect-[4/3]" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl">
          <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">No short stays available</h3>
          <p className="text-sm text-muted-foreground">Check back soon for new furnished short-term listings.</p>
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

function DurationCard({
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

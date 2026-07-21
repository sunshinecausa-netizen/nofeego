'use client';

import { MapPin, Building2, Navigation } from 'lucide-react';

export type MapPlaceholderListing = {
  id: string;
  slug: string;
  title: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
};

export function MapPlaceholder({
  listings = [],
  hoveredId,
  onMarkerHover,
  height = '100%',
}: {
  listings?: MapPlaceholderListing[];
  hoveredId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  height?: string;
}) {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200 border border-border"
      style={{ height, minHeight: '400px' }}
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(26, 107, 79, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26, 107, 79, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Water area */}
      <div className="absolute left-0 right-0 bottom-0 h-1/3 bg-gradient-to-t from-blue-50 to-transparent" />

      {/* Center label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-border">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Manhattan, NYC</span>
      </div>

      {/* Map markers */}
      {listings
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((listing) => {
          const lat = listing.latitude!;
          const lng = listing.longitude!;
          const x = ((lng + 74.05) / 0.12) * 100;
          const y = ((40.88 - lat) / 0.18) * 100;
          if (x < 0 || x > 100 || y < 0 || y > 100) return null;

          const isHovered = hoveredId === listing.id;

          return (
            <div
              key={listing.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                zIndex: isHovered ? 30 : 10,
              }}
              onMouseEnter={() => onMarkerHover?.(listing.id)}
              onMouseLeave={() => onMarkerHover?.(null)}
            >
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-md border-2 border-white transition-all duration-200 ${
                  isHovered
                    ? 'bg-primary text-primary-foreground scale-125 z-30'
                    : 'bg-primary text-primary-foreground hover:scale-110'
                }`}
              >
                ${listing.price.toLocaleString()}
              </div>
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-border p-3 w-48 z-40 animate-fade-in">
                  <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
                  <p className="text-xs text-primary font-medium mt-1">${listing.price.toLocaleString()}/mo</p>
                </div>
              )}
            </div>
          );
        })}

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-border">
          <Navigation className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">{listings.length} listings on map</span>
        </div>
        <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-border">
          <span className="text-xs text-muted-foreground">Interactive map coming with Google Maps API</span>
        </div>
      </div>
    </div>
  );
}

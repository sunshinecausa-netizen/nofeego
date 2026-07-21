'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Map as MapIcon } from 'lucide-react';

export type MapListing = {
  id: string;
  slug: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  latitude: number | null;
  longitude: number | null;
};

const MANHATTAN_CENTER = { lat: 40.7831, lng: -73.9712 };

export function MapView({
  listings,
  hoveredId,
  onMarkerHover,
  height = '100%',
}: {
  listings: MapListing[];
  hoveredId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  height?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Check for API key
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (key) setApiKey(key);
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey || scriptLoaded || loadError) return;
    if (window.google?.maps) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [apiKey, scriptLoaded, loadError]);

  // Initialize map
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || map) return;
    const newMap = new google.maps.Map(mapRef.current, {
      center: MANHATTAN_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
      ],
    });
    const iw = new google.maps.InfoWindow();
    setMap(newMap);
    setInfoWindow(iw);
  }, [scriptLoaded, map]);

  // Update markers when listings change
  useEffect(() => {
    if (!map || !infoWindow) return;

    // Clear existing markers
    markers.forEach((m) => m.setMap(null));

    const validListings = listings.filter(
      (l) => l.latitude != null && l.longitude != null
    );

    if (validListings.length === 0) {
      setMarkers([]);
      return;
    }

    const newMarkers = validListings.map((listing) => {
      const marker = new google.maps.Marker({
        position: { lat: listing.latitude!, lng: listing.longitude! },
        map,
        title: listing.title,
        label: {
          text: `$${Math.round(listing.price / 1000)}k`,
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#fff',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
      });

      // Custom styled label via overlay
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        background: #1a6b4f;
        color: white;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        font-family: Inter, sans-serif;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        border: 2px solid white;
        transition: all 0.2s;
      `;
      labelDiv.textContent = `$${listing.price.toLocaleString()}`;

      const overlay = new google.maps.OverlayView();
      overlay.onAdd = function () {
        const panes = this.getPanes();
        if (panes) panes.floatPane.appendChild(labelDiv);
      };
      overlay.draw = function () {
        const projection = this.getProjection();
        const point = projection.fromLatLngToDivPixel(marker.getPosition()!);
        if (point) {
          labelDiv.style.left = point.x - labelDiv.offsetWidth / 2 + 'px';
          labelDiv.style.top = point.y - labelDiv.offsetHeight / 2 + 'px';
        }
      };
      overlay.onRemove = function () {
        if (labelDiv.parentNode) labelDiv.parentNode.removeChild(labelDiv);
      };
      overlay.setMap(map);

      labelDiv.addEventListener('mouseenter', () => {
        labelDiv.style.background = '#0d4d3a';
        labelDiv.style.transform = 'scale(1.1)';
        onMarkerHover?.(listing.id);
      });
      labelDiv.addEventListener('mouseleave', () => {
        labelDiv.style.background = '#1a6b4f';
        labelDiv.style.transform = 'scale(1)';
        onMarkerHover?.(null);
      });
      labelDiv.addEventListener('click', () => {
        infoWindow.setContent(`
          <div style="padding: 8px; min-width: 180px;">
            <a href="/listings/${listing.slug}" style="text-decoration: none; color: inherit;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1a6b4f;">${listing.title}</div>
              <div style="font-size: 13px; color: #666;">$${listing.price.toLocaleString()}/mo · ${listing.bedrooms} bed · ${listing.bathrooms} bath</div>
            </a>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      // Store overlay reference for cleanup
      (marker as any)._overlay = overlay;

      return marker;
    });

    setMarkers(newMarkers);

    // Fit bounds to all markers
    if (newMarkers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      validListings.forEach((l) => {
        bounds.extend({ lat: l.latitude!, lng: l.longitude! });
      });
      map.fitBounds(bounds, 60);
    } else if (newMarkers.length === 1) {
      map.setCenter({ lat: validListings[0].latitude!, lng: validListings[0].longitude! });
      map.setZoom(14);
    }

    return () => {
      newMarkers.forEach((m) => {
        (m as any)._overlay?.setMap(null);
        m.setMap(null);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, infoWindow, listings]);

  // Highlight hovered marker
  useEffect(() => {
    if (!map || !infoWindow) return;
    if (hoveredId) {
      const listing = listings.find((l) => l.id === hoveredId);
      if (listing && listing.latitude && listing.longitude) {
        infoWindow.setContent(`
          <div style="padding: 8px; min-width: 180px;">
            <a href="/listings/${listing.slug}" style="text-decoration: none; color: inherit;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1a6b4f;">${listing.title}</div>
              <div style="font-size: 13px; color: #666;">$${listing.price.toLocaleString()}/mo · ${listing.bedrooms} bed · ${listing.bathrooms} bath</div>
            </a>
          </div>
        `);
        infoWindow.setPosition({ lat: listing.latitude, lng: listing.longitude });
        infoWindow.open(map);
      }
    } else {
      infoWindow.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredId]);

  // No API key fallback
  if (!apiKey) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-muted rounded-lg border border-border text-center p-8"
        style={{ height }}
      >
        <MapIcon className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Interactive Map</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add a Google Maps API key to <code className="text-xs bg-muted-foreground/10 px-1 rounded">.env</code> as{' '}
          <code className="text-xs bg-muted-foreground/10 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the interactive map.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-sm">
          {listings.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center gap-1 text-xs bg-white border border-border rounded-full px-2.5 py-1">
              <MapPin className="h-3 w-3 text-primary" />
              ${l.price.toLocaleString()}/mo
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-muted rounded-lg border border-border text-center p-8"
        style={{ height }}
      >
        <MapIcon className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Failed to load Google Maps. Please check your API key.</p>
      </div>
    );
  }

  return (
    <div ref={mapRef} style={{ width: '100%', height, minHeight: '400px' }} className="rounded-lg overflow-hidden" />
  );
}

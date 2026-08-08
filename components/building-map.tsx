'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BuildingMapItem = {
  id: string;
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
const NYC_CENTER = { lat: 40.7306, lng: -73.9352 };
const NEARBY_CATEGORIES = ['Transit', 'Grocery', 'Dining & cafés', 'Parks', 'Schools', 'Healthcare'];

function NearbyLegend({ buildingCount, locationCount }: { buildingCount: number; locationCount: number }) {
  return (
    <div className="absolute left-3 right-14 top-3 z-10 flex flex-wrap items-center gap-1.5" aria-label="Nearby places shown on map">
      <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">{buildingCount} buildings · {locationCount} locations</span>
      {NEARBY_CATEGORIES.map((category) => <span key={category} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">{category}</span>)}
    </div>
  );
}

type BuildingMapProps = {
  buildings: BuildingMapItem[];
  hoveredBuildingId?: string | null;
  selectedBuildingId?: string | null;
  onBuildingSelect?: (id: string) => void;
  className?: string;
};

export function BuildingMap({ buildings, hoveredBuildingId = null, selectedBuildingId = null, onBuildingSelect, className }: BuildingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef(new Map<string, google.maps.Marker>());
  const [scriptLoaded, setScriptLoaded] = useState(() => typeof window !== 'undefined' && Boolean(window.google?.maps));
  const [loadError, setLoadError] = useState(false);
  const validBuildings = useMemo(() => buildings.filter((building) => building.latitude != null && building.longitude != null), [buildings]);
  const locationGroups = useMemo(() => Array.from(validBuildings.reduce((groups, building) => {
    const key = `${building.latitude!.toFixed(6)},${building.longitude!.toFixed(6)}`;
    const group = groups.get(key);
    if (group) group.push(building);
    else groups.set(key, [building]);
    return groups;
  }, new Map<string, BuildingMapItem[]>()).values()), [validBuildings]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || scriptLoaded || loadError) return;
    if (window.google?.maps) {
      queueMicrotask(() => setScriptLoaded(true));
      return;
    }
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-nofeego-google-maps]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true), { once: true });
      existingScript.addEventListener('error', () => setLoadError(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.dataset.nofeegoGoogleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);
  }, [scriptLoaded, loadError]);

  useEffect(() => {
    if (!scriptLoaded || !mapRef.current) return;
    const map = new google.maps.Map(mapRef.current, {
      center: NYC_CENTER,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
    });
    const infoWindow = new google.maps.InfoWindow();
    const bounds = new google.maps.LatLngBounds();
    const markerRegistry = markersRef.current;
    const markers = locationGroups.map((group) => {
      const [building] = group;
      const position = { lat: building.latitude!, lng: building.longitude! };
      bounds.extend(position);
      const marker = new google.maps.Marker({
        map,
        position,
        title: group.map((item) => item.name).join(', '),
        label: group.length > 1 ? String(group.length) : undefined,
      });
      marker.addListener('click', () => {
        const content = document.createElement('div');
        content.className = 'p-1';
        if (group.length > 1) {
          const heading = document.createElement('div');
          heading.textContent = `${group.length} buildings at this location`;
          heading.style.cssText = 'font-size:12px;font-weight:700;margin-bottom:6px;';
          content.appendChild(heading);
        }
        group.forEach((item) => {
          const link = document.createElement('a');
          link.href = `/buildings/${encodeURIComponent(item.slug)}`;
          link.textContent = item.name;
          link.style.cssText = 'color:#1a6b4f;display:block;font-size:14px;font-weight:700;padding:2px 0;text-decoration:none;';
          content.appendChild(link);
        });
        onBuildingSelect?.(group[0].id);
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });
      group.forEach((item) => markerRegistry.set(item.id, marker));
      return marker;
    });
    if (validBuildings.length > 1) map.fitBounds(bounds, 56);
    else if (validBuildings.length === 1) {
      map.setCenter({ lat: validBuildings[0].latitude!, lng: validBuildings[0].longitude! });
      map.setZoom(15);
    }
    return () => {
      markerRegistry.clear();
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [scriptLoaded, locationGroups, onBuildingSelect, validBuildings]);

  useEffect(() => {
    const activeMarkers = new Set<google.maps.Marker>();
    if (hoveredBuildingId) activeMarkers.add(markersRef.current.get(hoveredBuildingId)!);
    if (selectedBuildingId) activeMarkers.add(markersRef.current.get(selectedBuildingId)!);
    new Set(markersRef.current.values()).forEach((marker) => {
      const active = activeMarkers.has(marker);
      marker.setZIndex(active ? 1000 : undefined);
      marker.setAnimation(active ? google.maps.Animation.BOUNCE : null);
      if (active) window.setTimeout(() => marker.setAnimation(null), 700);
    });
  }, [hoveredBuildingId, selectedBuildingId]);

  if (!GOOGLE_MAPS_API_KEY || loadError) {
    return (
        <div className={cn('relative min-h-[420px] overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200', className)}>
        <NearbyLegend buildingCount={validBuildings.length} locationCount={locationGroups.length} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(26,107,79,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(26,107,79,.12) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        {validBuildings.map((building) => {
          const x = ((building.longitude! + 74.08) / 0.3) * 100;
          const y = ((40.93 - building.latitude!) / 0.35) * 100;
          if (x < 0 || x > 100 || y < 0 || y > 100) return null;
          return <a key={building.id} href={`/buildings/${building.slug}`} title={building.name} aria-label={building.name} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary p-1.5 shadow-md transition hover:scale-125" style={{ left: `${x}%`, top: `${y}%` }}><Building2 className="h-3 w-3 text-white" /></a>;
        })}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-white/95 px-3 py-2 text-sm shadow-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><span>Interactive map unavailable. Building locations remain selectable in this fallback view.</span></div>
        </div>
    );
  }

  return <div className={cn('relative min-h-[420px] overflow-hidden bg-muted', className)}><NearbyLegend buildingCount={validBuildings.length} locationCount={locationGroups.length} /><div ref={mapRef} className="h-full min-h-[420px] w-full" aria-label="Building results map" /></div>;
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { AlertTriangle, MapPin, Pencil, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuildingInventorySummary } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

export type BuildingMapItem = {
  id: string;
  slug: string;
  name: string;
  address?: string | null;
  neighborhood?: string | null;
  imageUrl?: string | null;
  amenities?: string[] | null;
  availableCount?: number;
  bedroomMinimums?: Partial<Record<0 | 1 | 2 | 3, number>>;
  concessionText?: string | null;
  building: Building;
  inventory?: BuildingInventorySummary;
  latitude: number | null;
  longitude: number | null;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
const NYC_CENTER = { lat: 40.7306, lng: -73.9352 };
function MapResultCount({ buildingCount, locationCount }: { buildingCount: number; locationCount: number }) {
  return (
    <span className="absolute left-3 top-3 z-10 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
      {buildingCount} buildings · {locationCount} locations
    </span>
  );
}

type BuildingMapProps = {
  buildings: BuildingMapItem[];
  hoveredBuildingId?: string | null;
  selectedBuildingId?: string | null;
  selectionRequestKey?: number;
  comparedBuildingIds?: string[];
  favoriteBuildingIds?: string[];
  onBuildingSelect?: (id: string) => void;
  onBuildingHover?: (id: string | null) => void;
  onAreaSelect?: (ids: string[]) => void;
  onCompareChange?: (building: Building, checked: boolean) => void;
  onFavoriteChange?: (building: Building, checked: boolean) => void;
  className?: string;
};

type ScreenPoint = { x: number; y: number };

function MapBuildingCard({ item }: { item: BuildingMapItem }) {
  const address = [item.building.address, item.building.city, item.building.state, item.building.zip_code].filter(Boolean).join(', ');
  return <div className="w-[230px] max-w-full bg-transparent px-2 py-1.5 text-[#16324f]"><p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.neighborhood ?? item.building.borough ?? 'New York metro'}</p><h2 className="mt-0.5 truncate font-serif text-base font-bold leading-5">{item.name}</h2><p className="mt-0.5 flex items-start gap-1 text-xs font-medium leading-4 text-[#29445f]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{address || item.address}</span></p></div>;
}

function isInsideArea(point: { lat: number; lng: number }, area: Array<{ lat: number; lng: number }>) {
  let inside = false;
  for (let index = 0, previous = area.length - 1; index < area.length; previous = index++) {
    const currentPoint = area[index];
    const previousPoint = area[previous];
    if ((currentPoint.lat > point.lat) !== (previousPoint.lat > point.lat)
      && point.lng < ((previousPoint.lng - currentPoint.lng) * (point.lat - currentPoint.lat)) / (previousPoint.lat - currentPoint.lat) + currentPoint.lng) inside = !inside;
  }
  return inside;
}

export function BuildingMap({ buildings, hoveredBuildingId = null, selectedBuildingId = null, selectionRequestKey = 0, onBuildingSelect, onBuildingHover, onAreaSelect, className }: BuildingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const projectionOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const areaPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const areaBuildingIdsRef = useRef(new Set<string>());
  const drawingModeRef = useRef(false);
  const pinnedPreviewIdRef = useRef<string | null>(null);
  const markersRef = useRef(new Map<string, google.maps.Marker>());
  const [scriptLoaded, setScriptLoaded] = useState(() => typeof window !== 'undefined' && Boolean(window.google?.maps));
  const [loadError, setLoadError] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [screenPath, setScreenPath] = useState<ScreenPoint[]>([]);
  const [areaCount, setAreaCount] = useState<number | null>(null);
  const [areaTotal, setAreaTotal] = useState(0);
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
    drawingModeRef.current = drawingMode;
    if (drawingMode) infoWindowRef.current?.close();
  }, [drawingMode]);


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
    const infoWindow = new google.maps.InfoWindow({ headerDisabled: true, maxWidth: 260 });
    infoWindowRef.current = infoWindow;
    let closeTimer: number | null = null;
    let previewTimer: number | null = null;
    let previewRoot: Root | null = null;
    const cancelClose = () => {
      if (closeTimer != null) window.clearTimeout(closeTimer);
      closeTimer = null;
    };
    const scheduleClose = () => {
      cancelClose();
      closeTimer = window.setTimeout(() => {
        if (pinnedPreviewIdRef.current) return;
        infoWindow.close();
        previewRoot?.unmount();
        previewRoot = null;
      }, 180);
    };
    const cancelPreview = () => {
      if (previewTimer != null) window.clearTimeout(previewTimer);
      previewTimer = null;
    };
    googleMapRef.current = map;
    const projectionOverlay = new google.maps.OverlayView();
    projectionOverlay.onAdd = () => undefined;
    projectionOverlay.draw = () => undefined;
    projectionOverlay.onRemove = () => undefined;
    projectionOverlay.setMap(map);
    projectionOverlayRef.current = projectionOverlay;
    const bounds = new google.maps.LatLngBounds();
    const markerRegistry = markersRef.current;
    const areaBuildingIds = areaBuildingIdsRef.current;
    const designTokens = getComputedStyle(document.documentElement);
    const markerColor = designTokens.getPropertyValue('--map-marker').trim() || '#DC2626';
    const markerClusterColor = designTokens.getPropertyValue('--map-marker-cluster').trim() || 'rgba(232, 144, 36, 0.28)';
    const markerRingColor = designTokens.getPropertyValue('--map-marker-ring').trim() || '#ffffff';
    const markerLabelColor = designTokens.getPropertyValue('--map-marker-label').trim() || '#16324F';
    const markers = locationGroups.map((group) => {
      const [building] = group;
      const position = { lat: building.latitude!, lng: building.longitude! };
      bounds.extend(position);
      const dotRadius = group.length > 1 ? 9 : 8;
      const markerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="${dotRadius}" fill="${markerColor}" stroke="${markerRingColor}" stroke-width="2"/></svg>`;
      const marker = new google.maps.Marker({
        map,
        position,
        title: group.map((item) => item.name).join(', '),
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15),
          labelOrigin: new google.maps.Point(15, 15),
        },
        shape: { type: 'circle', coords: [15, 15, 14] },
        label: group.length > 1 ? { text: String(group.length), color: markerLabelColor, fontSize: '10px', fontWeight: '700' } : undefined,
      });

      const openPreview = () => {
        cancelClose();
        previewRoot?.unmount();
        const content = document.createElement('div');
        content.className = 'building-map-preview';
        content.style.cssText = 'width:min(230px,calc(100vw - 72px));overflow:visible;padding:1px;';
        content.addEventListener('mouseenter', cancelClose);
        content.addEventListener('mouseleave', scheduleClose);
        previewRoot = createRoot(content);
        previewRoot.render(<div className="divide-y divide-border">{group.map((item) => <MapBuildingCard key={item.id} item={item} />)}</div>);
        infoWindow.setContent(content);
        infoWindow.setPosition(position);
        infoWindow.open({ map, shouldFocus: false });
      };

      const focusAndOpenPreview = () => {
        let opened = false;
        const openOnce = () => {
          if (opened) return;
          opened = true;
          openPreview();
        };
        google.maps.event.addListenerOnce(map, 'idle', openOnce);
        if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
        map.panTo(position);
        window.setTimeout(openOnce, 600);
      };

      marker.addListener('mouseover', () => {
        if (drawingModeRef.current) return;
        if (pinnedPreviewIdRef.current && !group.some((item) => item.id === pinnedPreviewIdRef.current)) return;
        cancelPreview();
        previewTimer = window.setTimeout(() => {
          if (drawingModeRef.current) return;
          onBuildingHover?.(group[0].id);
          openPreview();
        }, 450);
      });
      marker.addListener('mouseout', () => {
        cancelPreview();
        onBuildingHover?.(null);
        scheduleClose();
      });
      marker.addListener('click', () => {
        if (drawingModeRef.current) return;
        const focusedBuilding = group[0];
        pinnedPreviewIdRef.current = focusedBuilding.id;
        onBuildingSelect?.(focusedBuilding.id);
        focusAndOpenPreview();
      });
      group.forEach((item) => markerRegistry.set(item.id, marker));
      return marker;
    });
    const markerClusterer = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render: ({ count, position }) => new google.maps.Marker({
          position,
          zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" fill="${markerClusterColor}"/></svg>`)}`,
            scaledSize: new google.maps.Size(42, 42),
            anchor: new google.maps.Point(21, 21),
            labelOrigin: new google.maps.Point(21, 21),
          },
          label: { text: String(count), color: markerLabelColor, fontSize: '12px', fontWeight: '700' },
        }),
      },
    });
    if (validBuildings.length > 1) map.fitBounds(bounds, 56);
    else if (validBuildings.length === 1) {
      map.setCenter({ lat: validBuildings[0].latitude!, lng: validBuildings[0].longitude! });
      map.setZoom(15);
    }
    return () => {
      infoWindow.close();
      previewRoot?.unmount();
      previewRoot = null;
      cancelClose();
      cancelPreview();
      projectionOverlay.setMap(null);
      projectionOverlayRef.current = null;
      areaPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      areaPolygonsRef.current = [];
      areaBuildingIds.clear();
      infoWindowRef.current = null;
      googleMapRef.current = null;
      markerRegistry.clear();
      markerClusterer.clearMarkers();
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [scriptLoaded, locationGroups, onBuildingHover, onBuildingSelect, validBuildings]);

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): ScreenPoint {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function startArea(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setScreenPath([pointFromEvent(event)]);
    setDrawing(true);
  }

  function continueArea(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    const next = pointFromEvent(event);
    setScreenPath((path) => {
      const previous = path[path.length - 1];
      return previous && Math.hypot(next.x - previous.x, next.y - previous.y) < 5 ? path : [...path, next];
    });
  }

  function finishArea(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDrawing(false);
    const projection = projectionOverlayRef.current?.getProjection();
    if (!projection || screenPath.length < 3) return;
    const area = screenPath.map((point) => projection.fromContainerPixelToLatLng(new google.maps.Point(point.x, point.y))?.toJSON()).filter((point): point is google.maps.LatLngLiteral => Boolean(point));
    if (area.length < 3) return;
    const colors = ['#1a6b4f', '#2563eb', '#9333ea', '#d97706', '#dc2626'];
    const color = colors[areaPolygonsRef.current.length % colors.length];
    const polygon = new google.maps.Polygon({ map: googleMapRef.current, paths: area, strokeColor: color, strokeOpacity: 0.95, strokeWeight: 3, fillColor: color, fillOpacity: 0.14, clickable: false });
    areaPolygonsRef.current.push(polygon);
    const ids = validBuildings.filter((building) => isInsideArea({ lat: building.latitude!, lng: building.longitude! }, area)).map((building) => building.id);
    ids.forEach((id) => areaBuildingIdsRef.current.add(id));
    const combinedIds = [...areaBuildingIdsRef.current];
    setAreaTotal(areaPolygonsRef.current.length);
    setAreaCount(combinedIds.length);
    onAreaSelect?.(combinedIds);
    setDrawingMode(false);
    setScreenPath([]);
  }

  function clearArea() {
    areaPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    areaPolygonsRef.current = [];
    areaBuildingIdsRef.current.clear();
    setAreaCount(null);
    setAreaTotal(0);
    setScreenPath([]);
    setDrawingMode(false);
    onAreaSelect?.([]);
  }

  useEffect(() => {
    if (!selectedBuildingId) return;
    const building = validBuildings.find((item) => item.id === selectedBuildingId);
    const map = googleMapRef.current;
    if (!building || !map) return;
    map.panTo({ lat: building.latitude!, lng: building.longitude! });
    if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
    const marker = markersRef.current.get(selectedBuildingId);
    if (!marker) return;
    const previewTimer = window.setTimeout(() => google.maps.event.trigger(marker, 'click'), 250);
    return () => window.clearTimeout(previewTimer);
  }, [selectedBuildingId, selectionRequestKey, validBuildings]);

  useEffect(() => {
    const activeMarkers = new Set<google.maps.Marker>();
    const hoveredMarker = hoveredBuildingId ? markersRef.current.get(hoveredBuildingId) : undefined;
    const selectedMarker = selectedBuildingId ? markersRef.current.get(selectedBuildingId) : undefined;
    if (hoveredMarker) activeMarkers.add(hoveredMarker);
    if (selectedMarker) activeMarkers.add(selectedMarker);
    const designTokens = getComputedStyle(document.documentElement);
    const markerColor = designTokens.getPropertyValue('--map-marker').trim() || '#DC2626';
    const markerRingColor = designTokens.getPropertyValue('--map-marker-ring').trim() || '#ffffff';
    new Set(markersRef.current.values()).forEach((marker) => {
      const active = activeMarkers.has(marker);
      const selected = marker === selectedMarker;
      const label = marker.getLabel();
      const multipleLocations = typeof label === 'object' && Boolean(label?.text);
      const size = selected ? 48 : 30;
      const center = size / 2;
      const markerSvg = selected
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="rgba(220,38,38,0.24)"/><circle cx="24" cy="24" r="${multipleLocations ? 11 : 10}" fill="${markerColor}" stroke="${markerRingColor}" stroke-width="3"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="${multipleLocations ? 9 : 8}" fill="${markerColor}" stroke="${markerRingColor}" stroke-width="2"/></svg>`;
      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(center, center),
        labelOrigin: new google.maps.Point(center, center),
      });
      marker.setZIndex(selected ? 2000 : active ? 1000 : undefined);
      marker.setAnimation(selected ? google.maps.Animation.BOUNCE : null);
      if (selected) window.setTimeout(() => marker.setAnimation(null), 900);
    });
  }, [hoveredBuildingId, selectedBuildingId]);

  if (!GOOGLE_MAPS_API_KEY || loadError) {
    return (
        <div className={cn('relative min-h-[420px] overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200', className)}>
        <MapResultCount buildingCount={validBuildings.length} locationCount={locationGroups.length} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(26,107,79,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(26,107,79,.12) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        {validBuildings.map((building) => {
          const x = ((building.longitude! + 74.08) / 0.3) * 100;
          const y = ((40.93 - building.latitude!) / 0.35) * 100;
          if (x < 0 || x > 100 || y < 0 || y > 100) return null;
          return <a key={building.id} href={`/buildings/${building.slug}`} title={building.name} aria-label={building.name} className="group absolute flex h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full" style={{ left: `${x}%`, top: `${y}%` }}><span className="h-4 w-4 rounded-full border-2 border-[var(--map-marker-ring)] bg-[var(--map-marker)] transition-transform group-hover:scale-125" /></a>;
        })}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-white/95 px-3 py-2 text-sm shadow-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><span>Interactive map unavailable. Building locations remain selectable in this fallback view.</span></div>
        </div>
    );
  }

  return <div className={cn('relative min-h-[420px] overflow-hidden bg-muted', className)}>
    <MapResultCount buildingCount={validBuildings.length} locationCount={locationGroups.length} />
    <div className="absolute right-14 top-3 z-20 flex items-center gap-2">
      <button type="button" onClick={() => setDrawingMode((active) => !active)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-md ${drawingMode ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground'}`} aria-pressed={drawingMode}><Pencil className="h-4 w-4" />{drawingMode ? 'Draw on map' : areaCount == null ? 'Draw area' : 'Add area'}</button>
      {areaCount != null && <><span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-md">{areaTotal} {areaTotal === 1 ? 'area' : 'areas'} · {areaCount} selected</span><button type="button" onClick={clearArea} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold shadow-md"><RotateCcw className="h-4 w-4" />Clear</button></>}
    </div>
    <div ref={mapRef} className="h-full min-h-[420px] w-full" aria-label="Building results map" />
    {drawingMode && <svg className="absolute inset-0 z-10 h-full w-full cursor-crosshair touch-none" onPointerDown={startArea} onPointerMove={continueArea} onPointerUp={finishArea} onPointerCancel={() => { setDrawing(false); setScreenPath([]); }} aria-label="Draw a free-form search area">
      {screenPath.length > 1 && <polyline points={screenPath.map((point) => `${point.x},${point.y}`).join(' ')} fill="rgba(26,107,79,.14)" stroke="#1a6b4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>}
  </div>;
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Building2, Pencil, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  latitude: number | null;
  longitude: number | null;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
const NYC_CENTER = { lat: 40.7306, lng: -73.9352 };
const NEARBY_CATEGORIES = ['Transit', 'Grocery', 'Dining & cafés', 'Parks', 'Schools', 'Healthcare'];

function NearbyLegend({ buildingCount, locationCount }: { buildingCount: number; locationCount: number }) {
  return (
    <div className="absolute left-3 right-56 top-3 z-10 flex flex-wrap items-center gap-1.5" aria-label="Nearby places shown on map">
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
  onBuildingHover?: (id: string | null) => void;
  onAreaSelect?: (ids: string[]) => void;
  className?: string;
};

type ScreenPoint = { x: number; y: number };

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

export function BuildingMap({ buildings, hoveredBuildingId = null, selectedBuildingId = null, onBuildingSelect, onBuildingHover, onAreaSelect, className }: BuildingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const projectionOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const areaPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const areaBuildingIdsRef = useRef(new Set<string>());
  const drawingModeRef = useRef(false);
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
    const infoWindow = new google.maps.InfoWindow({ headerDisabled: true });
    infoWindowRef.current = infoWindow;
    let closeTimer: number | null = null;
    let previewTimer: number | null = null;
    const cancelClose = () => {
      if (closeTimer != null) window.clearTimeout(closeTimer);
      closeTimer = null;
    };
    const scheduleClose = () => {
      cancelClose();
      closeTimer = window.setTimeout(() => infoWindow.close(), 180);
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

      const openPreview = () => {
        cancelClose();
        const content = document.createElement('div');
        content.style.cssText = 'width:290px;padding:4px 2px 6px;';
        content.addEventListener('mouseenter', cancelClose);
        content.addEventListener('mouseleave', scheduleClose);
        if (group.length > 1) {
          const heading = document.createElement('div');
          heading.textContent = `${group.length} buildings at this location`;
          heading.style.cssText = 'font-size:12px;font-weight:700;margin-bottom:6px;';
          content.appendChild(heading);
        }
        group.forEach((item) => {
          const link = document.createElement('a');
          link.href = `/buildings/${encodeURIComponent(item.slug)}`;
          link.setAttribute('aria-label', `View ${item.name}`);
          link.style.cssText = 'color:#17201c;display:grid;grid-template-columns:72px 1fr;gap:10px;align-items:center;padding:6px 0;text-decoration:none;';
          if (item.imageUrl) {
            const image = document.createElement('img');
            image.src = item.imageUrl;
            image.alt = '';
            image.style.cssText = 'width:72px;height:58px;border-radius:8px;object-fit:cover;background:#eef2ef;';
            link.appendChild(image);
          } else {
            const placeholder = document.createElement('div');
            placeholder.textContent = 'Building';
            placeholder.style.cssText = 'width:72px;height:58px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#eef2ef;color:#66736d;font-size:10px;';
            link.appendChild(placeholder);
          }
          const details = document.createElement('span');
          const title = document.createElement('strong');
          title.textContent = item.name;
          title.style.cssText = 'display:block;color:#1a6b4f;font-size:14px;line-height:1.25;';
          const location = document.createElement('span');
          location.textContent = [item.neighborhood, item.address].filter(Boolean).join(' · ');
          location.style.cssText = 'display:block;margin-top:3px;color:#66736d;font-size:11px;line-height:1.3;';
          const action = document.createElement('span');
          action.textContent = 'View building →';
          action.style.cssText = 'display:block;margin-top:5px;color:#1a6b4f;font-size:11px;font-weight:700;';
          details.append(title, location, action);
          link.appendChild(details);
          content.appendChild(link);

          const amenities = new Set(item.amenities ?? []);
          const featureGrid = document.createElement('div');
          featureGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:7px 0;';
          const features = [
            ['Doorman', amenities.has('Doorman')],
            ['Pets allowed', ['Pets Allowed', 'Small Dogs Allowed', 'Large Dogs Allowed', 'Cats Allowed'].some((value) => amenities.has(value))],
            ['In-unit laundry', amenities.has('In-Unit W/D Available')],
          ] as const;
          features.forEach(([label, confirmed]) => {
            const feature = document.createElement('div');
            feature.style.cssText = `border-radius:6px;padding:5px;background:${confirmed ? '#eef8f3' : '#f4f5f4'};color:${confirmed ? '#1a6b4f' : '#66736d'};font-size:10px;font-weight:700;line-height:1.2;`;
            feature.textContent = `${confirmed ? '✓' : '—'} ${label}${confirmed ? '' : ' · Not verified'}`;
            featureGrid.appendChild(feature);
          });
          content.appendChild(featureGrid);

          const priceGrid = document.createElement('div');
          priceGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-top:6px;';
          const bedroomLabels = [[0, 'Studio'], [1, '1 Bed'], [2, '2 Bed'], [3, '3 Bed']] as const;
          bedroomLabels.forEach(([bedroom, label]) => {
            const minimum = item.bedroomMinimums?.[bedroom];
            const price = document.createElement('div');
            price.style.cssText = 'border-radius:6px;padding:5px 7px;background:#f4f5f4;font-size:10px;line-height:1.35;';
            price.innerHTML = `<span style="color:#66736d">${label}</span><br><strong>${minimum != null ? `From ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(minimum)}` : 'Not available'}</strong>`;
            priceGrid.appendChild(price);
          });
          content.appendChild(priceGrid);

          const availability = document.createElement('div');
          availability.style.cssText = 'margin-top:7px;font-size:11px;font-weight:700;color:#17201c;';
          availability.textContent = item.availableCount ? `${item.availableCount} current ${item.availableCount === 1 ? 'unit' : 'units'} available` : 'Not available';
          content.appendChild(availability);
          if (item.concessionText) {
            const concession = document.createElement('div');
            concession.style.cssText = 'margin-top:5px;border-radius:6px;background:#fff4d8;padding:6px 8px;color:#805b00;font-size:11px;font-weight:700;';
            concession.textContent = `Special offer: ${item.concessionText}`;
            content.appendChild(concession);
          }
        });
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      };

      marker.addListener('mouseover', () => {
        if (drawingModeRef.current) return;
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
        onBuildingSelect?.(focusedBuilding.id);
        openPreview();
        map.panTo(position);
        if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
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
      infoWindow.close();
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
  }, [selectedBuildingId, validBuildings]);

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

  return <div className={cn('relative min-h-[420px] overflow-hidden bg-muted', className)}>
    <NearbyLegend buildingCount={validBuildings.length} locationCount={locationGroups.length} />
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

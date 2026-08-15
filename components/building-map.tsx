'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { AlertTriangle, Pencil, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuildingCard } from '@/components/building-result-card';
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
function publicStreetName(address?: string | null) {
  if (!address) return 'Available building';
  return address.replace(/^\s*\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?\s+/, '').replace(/(?:,|\s)+(?:Apt|Apartment|Unit|Suite|Bldg|Building|Floor|#)\s*.*$/i, '').trim() || 'Available building';
}
function MapResultCount({ buildingCount, locationCount }: { buildingCount: number; locationCount: number }) {
  return (
    <span className="absolute left-3 top-3 z-10 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
      {buildingCount} buildings · {locationCount} locations
    </span>
  );
}

type BuildingMapProps = {
  buildings: BuildingMapItem[];
  selectedBedrooms?: string[];
  hoveredBuildingId?: string | null;
  selectedBuildingId?: string | null;
  selectionRequestKey?: number;
  comparedBuildingIds?: string[];
  favoriteBuildingIds?: string[];
  onBuildingSelect?: (id: string) => void;
  onBuildingClose?: () => void;
  onBuildingHover?: (id: string | null) => void;
  onAreaSelect?: (ids: string[]) => void;
  onCompareChange?: (building: Building, checked: boolean) => void;
  onFavoriteChange?: (building: Building, checked: boolean) => void;
  className?: string;
};

type ScreenPoint = { x: number; y: number };

type PriceLabel = { key: string; text: string };

function priceLabels(item: BuildingMapItem, selectedBedrooms: string[]): PriceLabel[] {
  const selected = [...new Set(selectedBedrooms.map(Number).filter((bedroom): bedroom is 0 | 1 | 2 | 3 => bedroom >= 0 && bedroom <= 3))];
  const available = ([0, 1, 2, 3] as const).map((bedroom) => ({ bedroom, price: item.bedroomMinimums?.[bedroom] })).filter((entry): entry is { bedroom: 0 | 1 | 2 | 3; price: number } => typeof entry.price === 'number');
  const visible = selected.length > 0
    ? available.filter(({ bedroom }) => selected.includes(bedroom))
    : available.length > 0 ? [available.reduce((lowest, entry) => entry.price < lowest.price ? entry : lowest)] : [];
  if (visible.length === 0) return [];
  const minimum = visible.reduce((lowest, entry) => entry.price < lowest.price ? entry : lowest).price;
  return [{ key: 'price', text: `${Math.round(minimum)}+` }];
}

function priceMarkerIcon(labels: PriceLabel[], color: string, selected = false) {
  const rowHeight = 22;
  const halo = selected ? 4 : 0;
  const width = Math.max(54, ...labels.map(({ text }) => text.length * 6.2 + 18)) + halo * 2;
  const bodyHeight = labels.length * rowHeight;
  const height = bodyHeight + 8 + halo * 2;
  const dividerLines = labels.slice(1).map((_, index) => `<line x1="${halo + 7}" x2="${width - halo - 7}" y1="${halo + (index + 1) * rowHeight}" y2="${halo + (index + 1) * rowHeight}" stroke="rgba(255,255,255,.35)"/>`).join('');
  const text = labels.map((label, index) => `<text x="${width / 2}" y="${halo + index * rowHeight + 15}" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="12" font-weight="700">${label.text}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${selected ? `<rect width="${width}" height="${bodyHeight + halo * 2}" rx="16" fill="rgba(220,38,38,.22)"/>` : ''}<rect x="${halo}" y="${halo}" width="${width - halo * 2}" height="${bodyHeight}" rx="12.5" fill="${color}"/><path d="M ${width / 2 - 5} ${halo + bodyHeight - 1} L ${width / 2} ${halo + bodyHeight + 7} L ${width / 2 + 5} ${halo + bodyHeight - 1} Z" fill="${color}"/>${dividerLines}${text}</svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new google.maps.Size(width, height), anchor: new google.maps.Point(width / 2, height) };
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

export function BuildingMap({ buildings, selectedBedrooms = [], hoveredBuildingId = null, selectedBuildingId = null, selectionRequestKey = 0, comparedBuildingIds = [], favoriteBuildingIds = [], onBuildingSelect, onBuildingClose, onBuildingHover, onAreaSelect, onCompareChange, onFavoriteChange, className }: BuildingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const projectionOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const areaPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const areaBuildingIdsRef = useRef(new Set<string>());
  const drawingModeRef = useRef(false);
  const pinnedPreviewIdRef = useRef<string | null>(null);
  const markersRef = useRef(new Map<string, google.maps.Marker>());
  const previewOpenersRef = useRef(new Map<string, () => void>());
  const streetViewVisibilityListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const previewOptionsRef = useRef({ comparedBuildingIds, favoriteBuildingIds, onCompareChange, onFavoriteChange, onBuildingClose });
  useEffect(() => { previewOptionsRef.current = { comparedBuildingIds, favoriteBuildingIds, onCompareChange, onFavoriteChange, onBuildingClose }; }, [comparedBuildingIds, favoriteBuildingIds, onCompareChange, onFavoriteChange, onBuildingClose]);
  const [scriptLoaded, setScriptLoaded] = useState(() => typeof window !== 'undefined' && Boolean(window.google?.maps));
  const [loadError, setLoadError] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [screenPath, setScreenPath] = useState<ScreenPoint[]>([]);
  const [areaCount, setAreaCount] = useState<number | null>(null);
  const [areaTotal, setAreaTotal] = useState(0);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');
  const [streetViewActive, setStreetViewActive] = useState(false);
  const [streetViewError, setStreetViewError] = useState<string | null>(null);
  const validBuildings = useMemo(() => buildings.filter((building) => building.latitude != null && building.longitude != null && building.latitude >= 39 && building.latitude <= 43.5 && building.longitude >= -76 && building.longitude <= -69), [buildings]);
  const markerPositions = useMemo(() => {
    const coordinateGroups = validBuildings.reduce((groups, building) => {
      const key = `${building.latitude!.toFixed(6)},${building.longitude!.toFixed(6)}`;
      const group = groups.get(key);
      if (group) group.push(building);
      else groups.set(key, [building]);
      return groups;
    }, new Map<string, BuildingMapItem[]>());
    const positions = new Map<string, google.maps.LatLngLiteral>();
    coordinateGroups.forEach((group) => group.forEach((building, index) => {
      const angle = group.length > 1 ? (Math.PI * 2 * index) / group.length : 0;
      const offset = group.length > 1 ? 0.000045 : 0;
      positions.set(building.id, { lat: building.latitude! + Math.sin(angle) * offset, lng: building.longitude! + Math.cos(angle) * offset });
    }));
    return positions;
  }, [validBuildings]);
  const locationGroups = useMemo(() => validBuildings.map((building) => [building]), [validBuildings]);

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
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
      streetViewControl: true,
      streetViewControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      fullscreenControl: true,
      clickableIcons: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
    });
    const infoWindow = new google.maps.InfoWindow({ headerDisabled: true, maxWidth: 720 });
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
    const previewOpeners = previewOpenersRef.current;
    const areaBuildingIds = areaBuildingIdsRef.current;
    const designTokens = getComputedStyle(document.documentElement);
    const markerColor = designTokens.getPropertyValue('--map-marker').trim() || '#DC2626';
    const markerClusterColor = designTokens.getPropertyValue('--map-marker-cluster').trim() || 'rgba(232, 144, 36, 0.28)';
    const markerLabelColor = designTokens.getPropertyValue('--map-marker-label').trim() || '#16324F';
    const markers = locationGroups.map((group) => {
      const [building] = group;
      const position = markerPositions.get(building.id) ?? { lat: building.latitude!, lng: building.longitude! };
      bounds.extend(position);
      const labels = priceLabels(building, selectedBedrooms);
      const marker = new google.maps.Marker({
        map,
        position,
        title: group.map((item) => publicStreetName(item.address)).join(', '),
        icon: priceMarkerIcon(labels, markerColor),
      });

      const openPreview = (focusedBuildingId = group[0].id) => {
        cancelClose();
        previewRoot?.unmount();
        const content = document.createElement('div');
        content.className = 'building-map-preview';
        content.style.cssText = 'width:min(680px,calc(100vw - 72px));overflow:visible;padding:0;';
        content.addEventListener('mouseenter', cancelClose);
        content.addEventListener('mouseleave', scheduleClose);
        previewRoot = createRoot(content);
        const closePreview = () => {
          pinnedPreviewIdRef.current = null;
          infoWindow.close();
          onBuildingHover?.(null);
          previewOptionsRef.current.onBuildingClose?.();
          const rootToUnmount = previewRoot;
          previewRoot = null;
          queueMicrotask(() => rootToUnmount?.unmount());
        };
        const options = previewOptionsRef.current;
        const orderedGroup = [...group].sort((left, right) => Number(right.id === focusedBuildingId) - Number(left.id === focusedBuildingId));
        previewRoot.render(<div className="space-y-3">{orderedGroup.map((item) => <BuildingCard key={item.id} building={item.building} inventory={item.inventory} compared={options.comparedBuildingIds.includes(item.id)} favorited={options.favoriteBuildingIds.includes(item.id)} highlighted={item.id === focusedBuildingId} variant="map" onCompareChange={options.onCompareChange} onFavoriteChange={options.onFavoriteChange} onSelect={(id) => { pinnedPreviewIdRef.current = id; onBuildingSelect?.(id); }} onClose={closePreview} />)}</div>);
        infoWindow.setContent(content);
        const markerClearance = labels.length * 25 + 24;
        infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -markerClearance) });
        infoWindow.setPosition(position);
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          window.requestAnimationFrame(() => {
            const mapBounds = map.getDiv().getBoundingClientRect();
            const previewBounds = content.getBoundingClientRect();
            const horizontalOffset = previewBounds.left + previewBounds.width / 2 - (mapBounds.left + mapBounds.width / 2);
            const verticalOffset = previewBounds.top + previewBounds.height / 2 - (mapBounds.top + mapBounds.height / 2);
            if (Math.abs(horizontalOffset) > 4 || Math.abs(verticalOffset) > 4) map.panBy(horizontalOffset, verticalOffset);
          });
        });
        infoWindow.open({ map, shouldFocus: false });
      };

      const focusAndOpenPreview = (focusedBuildingId = group[0].id) => {
        let opened = false;
        const openOnce = () => {
          if (opened) return;
          opened = true;
          openPreview(focusedBuildingId);
        };
        google.maps.event.addListenerOnce(map, 'idle', openOnce);
        if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
        map.panTo(position);
        window.setTimeout(openOnce, 600);
      };

      marker.addListener('mouseover', () => {
        if (drawingModeRef.current) return;
        if (pinnedPreviewIdRef.current && !group.some((item) => item.id === pinnedPreviewIdRef.current)) return;
        onBuildingHover?.(group[0].id);
      });
      marker.addListener('mouseout', () => {
        onBuildingHover?.(null);
      });
      marker.addListener('click', () => {
        if (drawingModeRef.current) return;
        const focusedBuilding = group[0];
        pinnedPreviewIdRef.current = focusedBuilding.id;
        onBuildingSelect?.(focusedBuilding.id);
        focusAndOpenPreview(focusedBuilding.id);
      });
      group.forEach((item) => {
        markerRegistry.set(item.id, marker);
        previewOpeners.set(item.id, () => {
          pinnedPreviewIdRef.current = item.id;
          focusAndOpenPreview(item.id);
        });
      });
      return marker;
    });
    const markerClusterer = new MarkerClusterer({
      map,
      markers,
      algorithm: new SuperClusterAlgorithm({ radius: 18, maxZoom: 9 }),
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
      streetViewVisibilityListenerRef.current?.remove();
      streetViewVisibilityListenerRef.current = null;
      projectionOverlayRef.current = null;
      areaPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      areaPolygonsRef.current = [];
      areaBuildingIds.clear();
      infoWindowRef.current = null;
      googleMapRef.current = null;
      markerRegistry.clear();
      previewOpeners.clear();
      markerClusterer.clearMarkers();
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [scriptLoaded, locationGroups, markerPositions, onBuildingHover, onBuildingSelect, selectedBedrooms, validBuildings]);

  useEffect(() => {
    googleMapRef.current?.setMapTypeId(mapTypeId);
  }, [mapTypeId]);

  async function toggleStreetView() {
    const map = googleMapRef.current;
    if (!map) return;
    // The panorama is requested only after this explicit user action.
    const panorama = map.getStreetView();
    if (!streetViewVisibilityListenerRef.current) {
      panorama.setOptions({ addressControl: false, enableCloseButton: true, fullscreenControl: true });
      streetViewVisibilityListenerRef.current = panorama.addListener('visible_changed', () => {
        setStreetViewActive(panorama.getVisible());
        if (!panorama.getVisible()) setStreetViewError(null);
      });
    }
    if (panorama.getVisible()) {
      panorama.setVisible(false);
      return;
    }
    const selectedBuilding = selectedBuildingId ? validBuildings.find((building) => building.id === selectedBuildingId) : null;
    const location = selectedBuilding
      ? { lat: selectedBuilding.latitude!, lng: selectedBuilding.longitude! }
      : map.getCenter()?.toJSON();
    if (!location) return;
    setStreetViewError(null);
    try {
      const response = await new google.maps.StreetViewService().getPanorama({
        location,
        radius: 150,
        preference: google.maps.StreetViewPreference.NEAREST,
        source: google.maps.StreetViewSource.OUTDOOR,
      });
      const panoramaLocation = response.data.location?.latLng;
      if (!panoramaLocation) throw new Error('No nearby Street View');
      panorama.setPosition(panoramaLocation);
      panorama.setPov({ heading: 0, pitch: 0 });
      panorama.setVisible(true);
    } catch {
      setStreetViewError('Street View is not available near this location.');
    }
  }

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
    const openPreview = previewOpenersRef.current.get(selectedBuildingId);
    if (!openPreview) return;
    const previewTimer = window.setTimeout(openPreview, 250);
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
    new Set(markersRef.current.values()).forEach((marker) => {
      const active = activeMarkers.has(marker);
      const selected = marker === selectedMarker;
      const item = selected && selectedBuildingId
        ? validBuildings.find((building) => building.id === selectedBuildingId)
        : validBuildings.find((building) => markersRef.current.get(building.id) === marker);
      if (item) marker.setIcon(priceMarkerIcon(priceLabels(item, selectedBedrooms), markerColor, selected));
      marker.setZIndex(selected ? 2000 : active ? 1000 : undefined);
      marker.setAnimation(selected ? google.maps.Animation.BOUNCE : null);
      if (selected) window.setTimeout(() => marker.setAnimation(null), 900);
    });
  }, [hoveredBuildingId, selectedBuildingId, selectedBedrooms, validBuildings]);

  if (!GOOGLE_MAPS_API_KEY || loadError) {
    return (
        <div className={cn('relative min-h-[420px] overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200', className)}>
        <MapResultCount buildingCount={validBuildings.length} locationCount={locationGroups.length} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(26,107,79,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(26,107,79,.12) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        {validBuildings.map((building) => {
          const x = ((building.longitude! + 74.08) / 0.3) * 100;
          const y = ((40.93 - building.latitude!) / 0.35) * 100;
          if (x < 0 || x > 100 || y < 0 || y > 100) return null;
          const labels = priceLabels(building, selectedBedrooms);
          const streetName = publicStreetName(building.address);
          return <a key={building.id} href={`/buildings/${building.slug}`} title={streetName} aria-label={`${streetName}: ${labels.map((label) => label.text).join(', ')}`} className="group absolute -translate-x-1/2 -translate-y-full space-y-0.5" style={{ left: `${x}%`, top: `${y}%` }}>{labels.map((label) => <span key={label.key} className="block whitespace-nowrap rounded-full bg-[var(--map-marker)] px-2.5 py-1 text-sm font-bold leading-none text-white shadow-sm transition-transform group-hover:scale-105">{label.text}</span>)}</a>;
        })}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-white/95 px-3 py-2 text-sm shadow-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><span>Interactive map unavailable. Building locations remain selectable in this fallback view.</span></div>
        </div>
    );
  }

  return <div className={cn('relative min-h-[420px] overflow-hidden bg-muted', className)}>
    <MapResultCount buildingCount={validBuildings.length} locationCount={locationGroups.length} />
    <div className="absolute right-14 top-3 z-20 flex max-w-[calc(100%-5rem)] flex-wrap items-center justify-end gap-2">
      <div className="flex overflow-hidden rounded-lg border border-border bg-white shadow-md" role="group" aria-label="Map display mode">
        <button type="button" onClick={() => setMapTypeId('roadmap')} className={`min-h-11 px-3 text-sm font-semibold transition ${mapTypeId === 'roadmap' ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted'}`} aria-pressed={mapTypeId === 'roadmap'}>Map</button>
        <button type="button" onClick={() => setMapTypeId('satellite')} className={`min-h-11 border-l border-border px-3 text-sm font-semibold transition ${mapTypeId === 'satellite' ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted'}`} aria-pressed={mapTypeId === 'satellite'}>Satellite</button>
        <button type="button" onClick={() => void toggleStreetView()} className={`min-h-11 border-l border-border px-3 text-sm font-semibold transition ${streetViewActive ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted'}`} aria-pressed={streetViewActive}>{streetViewActive ? 'Exit Street View' : 'Street View'}</button>
      </div>
      <button type="button" onClick={() => setDrawingMode((active) => !active)} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-md ${drawingMode ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground'}`} aria-pressed={drawingMode}><Pencil className="h-4 w-4" />{drawingMode ? 'Draw on map' : areaCount == null ? 'Draw area' : 'Add area'}</button>
      {areaCount != null && <><span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-md">{areaTotal} {areaTotal === 1 ? 'area' : 'areas'} · {areaCount} selected</span><button type="button" onClick={clearArea} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold shadow-md"><RotateCcw className="h-4 w-4" />Clear</button></>}
    </div>
    <div ref={mapRef} className="h-full min-h-[420px] w-full" aria-label="Building results map" />
    {drawingMode && <svg className="absolute inset-0 z-10 h-full w-full cursor-crosshair touch-none" onPointerDown={startArea} onPointerMove={continueArea} onPointerUp={finishArea} onPointerCancel={() => { setDrawing(false); setScreenPath([]); }} aria-label="Draw a free-form search area">
      {screenPath.length > 1 && <polyline points={screenPath.map((point) => `${point.x},${point.y}`).join(' ')} fill="rgba(26,107,79,.14)" stroke="#1a6b4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>}
    {streetViewError && <div role="status" className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-xl">{streetViewError}</div>}
  </div>;
}

export type CoordinateBuilding = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

export const MAP_PRICE_LABEL_MIN_ZOOM = 15;

export function hasValidMapCoordinate(building: CoordinateBuilding) {
  return building.latitude != null
    && building.longitude != null
    && Number.isFinite(building.latitude)
    && Number.isFinite(building.longitude)
    && building.latitude >= 39
    && building.latitude <= 43.5
    && building.longitude >= -76
    && building.longitude <= -69
    && !(building.latitude === 0 && building.longitude === 0);
}

export function uniqueMapBuildings<T extends CoordinateBuilding>(buildings: T[]) {
  const unique = new Map<string, T>();
  for (const building of buildings) {
    if (!hasValidMapCoordinate(building) || unique.has(building.id)) continue;
    unique.set(building.id, building);
  }
  return [...unique.values()];
}

export function mapLocationKey(building: CoordinateBuilding) {
  return `${building.latitude!.toFixed(6)},${building.longitude!.toFixed(6)}`;
}

export function uniqueMapLocationCount(buildings: CoordinateBuilding[]) {
  return new Set(uniqueMapBuildings(buildings).map(mapLocationKey)).size;
}

export function formatMarkerPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const thousands = value / 1000;
  const formatted = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1).replace(/\.0$/, '');
  return `$${formatted}K`;
}

export function shouldShowPriceMarker(zoom: number | null | undefined) {
  return typeof zoom === 'number' && zoom >= MAP_PRICE_LABEL_MIN_ZOOM;
}

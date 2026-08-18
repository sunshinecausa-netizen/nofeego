import snapshot from '@/data/preview/production-public-catalog.snapshot.json';
import type { BuildingFilters, BuildingInventorySummary, BuildingsPageResult } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

export const PRODUCTION_PUBLIC_SNAPSHOT_REQUEST = 'production_public_snapshot';
type SnapshotData = { metadata: typeof snapshot.metadata; buildings: Building[]; inventoryByBuilding: Record<string, BuildingInventorySummary> };
const snapshotData = snapshot as unknown as SnapshotData;

export function canUseProductionPublicSnapshot(environment: string | undefined, requested: string | null | undefined) {
  return requested === PRODUCTION_PUBLIC_SNAPSHOT_REQUEST && (environment === 'preview' || environment === 'development');
}

type SnapshotOptions = BuildingFilters & { page?: number; pageSize?: number; north?: number; south?: number; east?: number; west?: number };

function priceBounds(value: string) {
  if (value === '10000-plus') return { min: 10000, max: Number.POSITIVE_INFINITY };
  const match = /^(\d+)-(\d+)$/.exec(value);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}

export function getProductionPublicSnapshotPage({ page = 1, pageSize = 48, search = '', boroughs = [], neighborhoods = [], amenities = [], priceRanges = [], bedrooms = [], north, south, east, west }: SnapshotOptions = {}): BuildingsPageResult {
  const term = search.trim().toLowerCase();
  const selectedBedrooms = bedrooms.filter((value) => ['0', '1', '2', '3'].includes(value)).map(Number);
  const ranges = priceRanges.map(priceBounds).filter((value): value is { min: number; max: number } => value != null);
  const hasBounds = [north, south, east, west].every((value) => typeof value === 'number' && Number.isFinite(value));
  const filtered = snapshotData.buildings.filter((building) => {
    if (term && ![building.name, building.address, building.city, building.borough, building.neighborhood].some((value) => value?.toLowerCase().includes(term))) return false;
    if (boroughs.length && !boroughs.includes(building.borough ?? '')) return false;
    if (neighborhoods.length && !neighborhoods.includes(building.neighborhood ?? '')) return false;
    if (amenities.length && !amenities.every((amenity) => building.amenities?.includes(amenity))) return false;
    const inventory = snapshotData.inventoryByBuilding[building.id];
    const minimums = inventory?.bedroomMinimums ?? {};
    const rents = (selectedBedrooms.length ? selectedBedrooms.map((bedroom) => minimums[bedroom as 0 | 1 | 2 | 3]) : Object.values(minimums)).filter((value): value is number => typeof value === 'number');
    if (selectedBedrooms.length && !rents.length) return false;
    if (ranges.length && !rents.some((rent) => ranges.some((range) => rent >= range.min && rent < range.max))) return false;
    return true;
  });
  const viewportBuildings = hasBounds
    ? filtered.filter((building) => building.latitude != null && building.longitude != null && building.latitude <= north! && building.latitude >= south! && building.longitude <= east! && building.longitude >= west!)
    : filtered;
  const safePageSize = Math.max(1, Math.min(2000, Math.floor(pageSize)));
  const offset = (Math.max(1, Math.floor(page)) - 1) * safePageSize;
  const buildings = viewportBuildings.slice(offset, offset + safePageSize);
  return {
    buildings,
    total: filtered.length,
    inventoryByBuilding: Object.fromEntries(buildings.map((building) => [building.id, snapshotData.inventoryByBuilding[building.id] ?? { availabilityStatus: 'unavailable', bedroomMinimums: {}, bedroomAvailableCounts: {} }])),
  };
}

export const productionPublicSnapshotMetadata = snapshotData.metadata;

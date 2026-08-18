import type { Building } from '@/lib/types';
import type { BuildingsPageResult } from '@/lib/public-buildings';

const FIXTURE_COUNT = 350;

export function canUsePublicHomeVisualFixture(environment: string | undefined, requested: string | null | undefined) {
  return requested === 'reference' && (environment === 'preview' || environment === 'development');
}

function fixtureBuilding(index: number): Building {
  // Deterministic low-discrepancy points follow Manhattan's southwest-to-northeast
  // shape without forming an artificial grid. These are Preview-only fixtures.
  const latitudeSequence = ((index + 1) * 0.61803398875) % 1;
  const lateralSequence = ((index + 1) * 0.41421356237) % 1;
  const latitude = 40.704 + latitudeSequence * 0.168;
  const centerLongitude = -74.015 + latitudeSequence * 0.078;
  const longitude = centerLongitude + (lateralSequence - 0.5) * 0.014;
  const id = `visual-fixture-${String(index + 1).padStart(3, '0')}`;
  return {
    id,
    slug: id,
    name: index === 0 ? 'Reference House' : index === 1 ? 'Midtown Residence' : `Visual Fixture ${String(index + 1).padStart(3, '0')}`,
    address: `${100 + index} Reference Avenue`,
    city: 'New York',
    state: 'NY',
    zip_code: '10019',
    latitude,
    longitude,
    building_type: 'Rental',
    amenities: index % 2 === 0 ? ['Doorman', 'In-Unit W/D Available'] : ['Elevator', 'Gym'],
    year_built: 2010 + (index % 15),
    floors: 12 + (index % 28),
    stories: 12 + (index % 28),
    total_units: 120 + (index % 180),
    hero_image: null,
    hero_image_url: null,
    gallery: null,
    nearby_subway: ['W 42 St–Bryant Park'],
    borough: 'Manhattan',
    neighborhood: index % 2 === 0 ? 'Midtown' : 'Chelsea',
    is_active: true,
    updated_at: '2026-08-18T12:00:00.000Z',
  } as Building;
}

const FIXTURE_BUILDINGS = Array.from({ length: FIXTURE_COUNT }, (_, index) => fixtureBuilding(index));

export function getPublicHomeVisualFixture({ pageSize = 48, north, south, east, west }: { pageSize?: number; north?: number; south?: number; east?: number; west?: number } = {}): BuildingsPageResult {
  const bounded = north != null && south != null && east != null && west != null
    ? FIXTURE_BUILDINGS.filter((building) => building.latitude! <= north && building.latitude! >= south && building.longitude! <= east && building.longitude! >= west)
    : FIXTURE_BUILDINGS;
  const buildings = bounded.slice(0, Math.max(1, Math.min(pageSize, FIXTURE_COUNT)));
  return {
    buildings,
    total: FIXTURE_COUNT,
    inventoryByBuilding: Object.fromEntries(buildings.map((building, index) => [building.id, {
      availabilityStatus: 'available' as const,
      bedroomMinimums: { 0: 3000 + (index % 8) * 250, 1: 4000 + (index % 8) * 250, 2: 5000 + (index % 8) * 250 },
      bedroomAvailableCounts: {},
    }])),
  };
}

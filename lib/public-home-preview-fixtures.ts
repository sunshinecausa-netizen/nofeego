import type { Building } from '@/lib/types';
import type { BuildingsPageResult } from '@/lib/public-buildings';

const FIXTURE_SEEDS = [
  { id: 'midtown-coordinate-test', name: 'Midtown Coordinate Test', address: '350 West 42nd Street', zip: '10036', neighborhood: 'Midtown', latitude: 40.7576856, longitude: -73.9922385 },
  { id: 'chelsea-coordinate-test', name: 'Chelsea Coordinate Test', address: '505 West 23rd Street', zip: '10011', neighborhood: 'Chelsea', latitude: 40.7480225, longitude: -74.0044401 },
  { id: 'upper-east-side-coordinate-test', name: 'Upper East Side Coordinate Test', address: '200 East 82nd Street', zip: '10028', neighborhood: 'Upper East Side', latitude: 40.7759208, longitude: -73.9556599 },
  { id: 'downtown-coordinate-test', name: 'Downtown Coordinate Test', address: '20 Broad Street', zip: '10005', neighborhood: 'Financial District', latitude: 40.7066335, longitude: -74.0113798 },
] as const;

export function canUsePublicHomeVisualFixture(environment: string | undefined, requested: string | null | undefined) {
  return requested === 'reference' && (environment === 'preview' || environment === 'development');
}

function fixtureBuilding(seed: typeof FIXTURE_SEEDS[number], index: number): Building {
  return {
    id: seed.id,
    slug: seed.id,
    name: seed.name,
    address: seed.address,
    city: 'New York',
    state: 'NY',
    zip_code: seed.zip,
    latitude: seed.latitude,
    longitude: seed.longitude,
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
    neighborhood: seed.neighborhood,
    is_active: true,
    updated_at: '2026-08-18T12:00:00.000Z',
  } as Building;
}

const FIXTURE_BUILDINGS = FIXTURE_SEEDS.map(fixtureBuilding);

export function getPublicHomeVisualFixture({ pageSize = 48, north, south, east, west }: { pageSize?: number; north?: number; south?: number; east?: number; west?: number } = {}): BuildingsPageResult {
  const bounded = north != null && south != null && east != null && west != null
    ? FIXTURE_BUILDINGS.filter((building) => building.latitude! <= north && building.latitude! >= south && building.longitude! <= east && building.longitude! >= west)
    : FIXTURE_BUILDINGS;
  const buildings = bounded.slice(0, Math.max(1, Math.min(pageSize, FIXTURE_BUILDINGS.length)));
  return {
    buildings,
    total: FIXTURE_BUILDINGS.length,
    inventoryByBuilding: Object.fromEntries(buildings.map((building, index) => [building.id, {
      availabilityStatus: 'available' as const,
      bedroomMinimums: { 0: 3000 + (index % 8) * 250, 1: 4000 + (index % 8) * 250, 2: 5000 + (index % 8) * 250 },
      bedroomAvailableCounts: {},
    }])),
  };
}

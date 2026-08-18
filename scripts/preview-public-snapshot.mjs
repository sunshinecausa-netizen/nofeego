#!/usr/bin/env node
/**
 * PREVIEW ONLY / DO NOT RUN AGAINST PRODUCTION AS A WRITE TARGET.
 *
 * Reads the existing anonymous Production public API with GET requests only,
 * applies an explicit display-field whitelist, and writes one local fixture.
 * It never connects to Postgres, Supabase admin APIs, RPCs, or write endpoints.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_ORIGIN = 'https://nofeego.vercel.app';
const SOURCE_PATH = '/api/v1/buildings';
const OUTPUT = resolve('data/preview/production-public-catalog.snapshot.json');
const SOURCE_TAG = 'production_public_snapshot';
const PAGE_SIZE = 200;
const BOUNDS = { north: 41.5, south: 39, east: -71, west: -76 };
const FORBIDDEN_OUTPUT_KEYS = new Set(['unit_number', 'units', 'inventory_snapshots', 'building_sources', 'contact_email', 'leasing_phone', 'agent_notes', 'tenant_id', 'rental_case_id', 'application_id', 'email', 'phone']);

if (process.env.VERCEL_ENV === 'production') throw new Error('Snapshot refresh and cleanup are disabled in Production.');

if (process.argv.includes('--clean')) {
  await rm(OUTPUT, { force: true });
  console.log(`Removed ${OUTPUT}`);
  process.exit(0);
}

const finiteOrNull = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const stringOrNull = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const stringArray = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [];
const positiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
const nonnegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
const bedroomMap = (value) => Object.fromEntries([0, 1, 2, 3].flatMap((bedroom) => {
  const number = positiveNumber(value?.[bedroom] ?? value?.[String(bedroom)]);
  return number == null ? [] : [[bedroom, number]];
}));
const bedroomCountMap = (value) => Object.fromEntries([0, 1, 2, 3].flatMap((bedroom) => {
  const number = nonnegativeNumber(value?.[bedroom] ?? value?.[String(bedroom)]);
  return number == null ? [] : [[bedroom, number]];
}));

function projectBuilding(row) {
  const latitude = finiteOrNull(row.latitude);
  const longitude = finiteOrNull(row.longitude);
  return {
    id: String(row.id),
    slug: String(row.slug ?? row.id),
    name: String(row.name ?? ''),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    state: String(row.state ?? ''),
    zip_code: stringOrNull(row.zip_code),
    borough: stringOrNull(row.borough),
    neighborhood: stringOrNull(row.neighborhood),
    latitude,
    longitude,
    description: stringOrNull(row.description),
    amenities: stringArray(row.amenities),
    hero_image_url: stringOrNull(row.hero_image_url),
    hero_image: stringOrNull(row.hero_image),
    building_type: stringOrNull(row.building_type),
    year_built: nonnegativeNumber(row.year_built) ?? null,
    floors: nonnegativeNumber(row.floors ?? row.stories) ?? null,
    stories: nonnegativeNumber(row.stories ?? row.floors) ?? null,
    total_units: nonnegativeNumber(row.total_units) ?? null,
    nearby_subway: stringArray(row.nearby_subway),
    website: stringOrNull(row.website),
    updated_at: stringOrNull(row.updated_at),
  };
}

function projectInventory(value) {
  const bedroomMinimums = bedroomMap(value?.bedroomMinimums);
  const bedroomAvailableCounts = bedroomCountMap(value?.bedroomAvailableCounts);
  const availableCount = nonnegativeNumber(value?.availableCount);
  const status = ['available', 'limited', 'unavailable'].includes(value?.availabilityStatus)
    ? value.availabilityStatus
    : Object.keys(bedroomMinimums).length ? 'available' : 'unavailable';
  return { availabilityStatus: status, bedroomMinimums, bedroomAvailableCounts, ...(availableCount == null ? {} : { availableCount }) };
}

const byId = new Map();
const inventoryByBuilding = {};
let reportedTotal = null;
for (let page = 1; ; page += 1) {
  const endpoint = new URL(SOURCE_PATH, SOURCE_ORIGIN);
  Object.entries({ ...BOUNDS, page, pageSize: PAGE_SIZE }).forEach(([key, value]) => endpoint.searchParams.set(key, String(value)));
  const response = await fetch(endpoint, { method: 'GET', headers: { accept: 'application/json' }, redirect: 'error' });
  if (!response.ok) throw new Error(`Public snapshot page ${page} failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.buildings)) throw new Error(`Public snapshot page ${page} has an invalid shape.`);
  reportedTotal ??= Number.isFinite(payload.total) ? payload.total : null;
  for (const raw of payload.buildings) {
    const building = projectBuilding(raw);
    if (!building.id || byId.has(building.id)) continue;
    byId.set(building.id, building);
    inventoryByBuilding[building.id] = projectInventory(payload.inventoryByBuilding?.[building.id]);
  }
  console.log(`Read page ${page}: ${payload.buildings.length} rows; ${byId.size}/${reportedTotal ?? '?'} unique Buildings.`);
  if (payload.buildings.length === 0 || (reportedTotal != null && byId.size >= reportedTotal)) break;
  if (page > 1000) throw new Error('Pagination safety limit exceeded.');
}

const buildings = [...byId.values()].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
const validCoordinates = buildings.filter((building) => building.latitude != null && building.longitude != null && building.latitude >= 39 && building.latitude <= 43.5 && building.longitude >= -76 && building.longitude <= -69 && !(building.latitude === 0 && building.longitude === 0));
const partialCoordinates = buildings.filter((building) => (building.latitude == null) !== (building.longitude == null));
if (partialCoordinates.length) throw new Error(`Atomic coordinate validation failed for ${partialCoordinates.length} Buildings.`);
const snapshot = {
  metadata: {
    source: SOURCE_TAG,
    source_url: `${SOURCE_ORIGIN}${SOURCE_PATH}`,
    snapshot_generated_at: new Date().toISOString(),
    parser_version: 'production-public-snapshot-v1',
    reported_total: reportedTotal,
    building_count: buildings.length,
    valid_coordinate_count: validCoordinates.length,
    missing_coordinate_count: buildings.length - validCoordinates.length,
    unique_coordinate_count: new Set(validCoordinates.map((building) => `${building.latitude.toFixed(6)},${building.longitude.toFixed(6)}`)).size,
    missing_address_count: buildings.filter((building) => !building.address.trim()).length,
  },
  buildings,
  inventoryByBuilding,
};
const serialized = JSON.stringify(snapshot);
for (const key of FORBIDDEN_OUTPUT_KEYS) if (serialized.includes(`"${key}"`)) throw new Error(`Forbidden output key detected: ${key}`);
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(snapshot.metadata, null, 2));

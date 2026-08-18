import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import snapshot from '@/data/preview/production-public-catalog.snapshot.json';
import { canUseProductionPublicSnapshot, getProductionPublicSnapshotPage, productionPublicSnapshotMetadata, PRODUCTION_PUBLIC_SNAPSHOT_REQUEST } from './production-public-snapshot';
import { uniqueMapBuildings, uniqueMapLocationCount } from './map-marker-contract';

const forbiddenKeys = ['unit_number', 'units', 'inventory_snapshots', 'building_sources', 'contact_email', 'leasing_phone', 'agent_notes', 'tenant_id', 'rental_case_id', 'application_id', 'email', 'phone'];

test('snapshot source, totals, and ID sets exactly match the paginated Production public export', () => {
  assert.equal(productionPublicSnapshotMetadata.source, 'production_public_snapshot');
  assert.equal(productionPublicSnapshotMetadata.reported_total, 1598);
  assert.equal(snapshot.buildings.length, 1598);
  assert.equal(new Set(snapshot.buildings.map((building) => building.id)).size, 1598);
  assert.deepEqual(new Set(Object.keys(snapshot.inventoryByBuilding)), new Set(snapshot.buildings.map((building) => building.id)));
});

test('snapshot contains only whitelisted public display data', () => {
  const serialized = JSON.stringify(snapshot);
  for (const key of forbiddenKeys) assert.equal(serialized.includes(`"${key}"`), false, key);
});

test('snapshot coordinates remain atomic and inside the Northeast service area', () => {
  assert.equal(snapshot.metadata.missing_coordinate_count, 0);
  assert.equal(snapshot.metadata.valid_coordinate_count, 1598);
  assert.ok(snapshot.buildings.every((building) => building.latitude != null && building.longitude != null));
  assert.ok(snapshot.buildings.every((building) => building.latitude >= 39 && building.latitude <= 43.5 && building.longitude >= -76 && building.longitude <= -69));
  assert.ok(snapshot.buildings.every((building) => building.latitude !== 0 && building.longitude !== 0));
});

test('one public Building creates one marker while shared coordinates remain distinct locations', () => {
  assert.equal(uniqueMapBuildings(snapshot.buildings).length, 1598);
  assert.equal(uniqueMapLocationCount(snapshot.buildings), 1591);
});

test('snapshot mode is explicit and impossible in Production', () => {
  assert.equal(canUseProductionPublicSnapshot('preview', PRODUCTION_PUBLIC_SNAPSHOT_REQUEST), true);
  assert.equal(canUseProductionPublicSnapshot('development', PRODUCTION_PUBLIC_SNAPSHOT_REQUEST), true);
  assert.equal(canUseProductionPublicSnapshot('production', PRODUCTION_PUBLIC_SNAPSHOT_REQUEST), false);
  assert.equal(canUseProductionPublicSnapshot('preview', undefined), false);
});

test('refresh script is GET-only, Preview-only, and contains no privileged database path', () => {
  const source = readFileSync(join(process.cwd(), 'scripts/preview-public-snapshot.mjs'), 'utf8');
  assert.match(source, /PREVIEW ONLY \/ DO NOT RUN AGAINST PRODUCTION AS A WRITE TARGET/);
  assert.match(source, /process\.env\.VERCEL_ENV === 'production'/);
  assert.match(source, /method: 'GET'/);
  assert.doesNotMatch(source, /service_role|process\.env\.SUPABASE|\/rest\/v1|rpc\(/i);
});

test('snapshot search, filters, pagination, and viewport query real public facts', () => {
  const search = getProductionPublicSnapshotPage({ search: '1 QPS', pageSize: 48 });
  assert.ok(search.total >= 1);
  assert.ok(search.buildings.every((building) => [building.name, building.address].some((value) => value.toLowerCase().includes('1 qps'))));
  const manhattan = getProductionPublicSnapshotPage({ boroughs: ['Manhattan'], pageSize: 2000 });
  assert.ok(manhattan.total > 0);
  assert.ok(manhattan.buildings.every((building) => building.borough === 'Manhattan'));
  const viewport = getProductionPublicSnapshotPage({ north: 40.78, south: 40.7, east: -73.93, west: -74.02, pageSize: 2000 });
  assert.equal(viewport.total, snapshot.buildings.length);
  assert.ok(viewport.buildings.length > 0 && viewport.buildings.length < snapshot.buildings.length);
  assert.ok(viewport.buildings.every((building) => building.latitude! <= 40.78 && building.latitude! >= 40.7 && building.longitude! <= -73.93 && building.longitude! >= -74.02));
});

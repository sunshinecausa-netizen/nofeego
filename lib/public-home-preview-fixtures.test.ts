import test from 'node:test';
import assert from 'node:assert/strict';
import { canUsePublicHomeVisualFixture, getPublicHomeVisualFixture } from './public-home-preview-fixtures';

test('visual fixtures require an explicit reference request', () => {
  assert.equal(canUsePublicHomeVisualFixture('preview', undefined), false);
  assert.equal(canUsePublicHomeVisualFixture('preview', 'reference'), true);
});

test('visual fixtures cannot run in production', () => {
  assert.equal(canUsePublicHomeVisualFixture('production', 'reference'), false);
});

test('visual fixture coordinates stay inside the Northeast service bounds', () => {
  const result = getPublicHomeVisualFixture({ pageSize: 350 });
  assert.equal(result.total, 4);
  assert.ok(result.buildings.every((building) => building.latitude != null && building.latitude >= 39 && building.latitude <= 43.5));
  assert.ok(result.buildings.every((building) => building.longitude != null && building.longitude >= -76 && building.longitude <= -69));
  assert.ok(result.buildings.every((building) => building.latitude !== 0 && building.longitude !== 0));
  const coordinateKeys = result.buildings.map((building) => `${building.latitude!.toFixed(6)},${building.longitude!.toFixed(6)}`);
  assert.equal(new Set(coordinateKeys).size, result.buildings.length);
});

test('fixture latitude and longitude are not swapped and match their stated Manhattan neighborhoods', () => {
  const result = getPublicHomeVisualFixture({ pageSize: 10 });
  const byNeighborhood = Object.fromEntries(result.buildings.map((building) => [building.neighborhood, building]));
  for (const building of result.buildings) {
    assert.ok(building.latitude! >= 40.7 && building.latitude! <= 40.8);
    assert.ok(building.longitude! >= -74.02 && building.longitude! <= -73.93);
  }
  assert.ok(byNeighborhood.Midtown.latitude! >= 40.75 && byNeighborhood.Midtown.latitude! <= 40.77);
  assert.ok(byNeighborhood.Chelsea.longitude! <= -73.98);
  assert.ok(byNeighborhood['Upper East Side'].longitude! >= -73.98);
  assert.ok(byNeighborhood['Financial District'].latitude! <= 40.72);
});

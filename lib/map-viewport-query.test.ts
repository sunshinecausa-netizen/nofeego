import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_VIEWPORT_BUILDINGS, viewportBuildingLimit } from './map-viewport-query';

test('increases the viewport result limit as the map zooms out', () => {
  assert.equal(viewportBuildingLimit(16), 120);
  assert.equal(viewportBuildingLimit(14), 300);
  assert.equal(viewportBuildingLimit(13), 600);
  assert.equal(viewportBuildingLimit(12), 1200);
  assert.equal(viewportBuildingLimit(11), MAX_VIEWPORT_BUILDINGS);
  assert.equal(MAX_VIEWPORT_BUILDINGS, 2000);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMarkerPrice, hasValidMapCoordinate, mapLocationKey, shouldShowPriceMarker, uniqueMapBuildings, uniqueMapLocationCount } from './map-marker-contract';

test('multiple unit rows for one Building produce one map Building', () => {
  const rows = [{ id: 'building-1', latitude: 40.75, longitude: -73.98 }, { id: 'building-1', latitude: 40.75, longitude: -73.98 }];
  assert.equal(uniqueMapBuildings(rows).length, 1);
});

test('duplicate coordinates remain clusterable and count as one location', () => {
  const rows = [{ id: 'building-1', latitude: 40.75, longitude: -73.98 }, { id: 'building-2', latitude: 40.75, longitude: -73.98 }];
  assert.equal(uniqueMapBuildings(rows).length, 2);
  assert.equal(uniqueMapLocationCount(rows), 1);
  assert.equal(mapLocationKey(rows[0]), mapLocationKey(rows[1]));
});

test('Marker labels use one compact, well-formed starting price', () => {
  assert.equal(formatMarkerPrice(4200), '$4.2K');
  assert.equal(formatMarkerPrice(4000), '$4K');
  assert.match(formatMarkerPrice(4250)!, /^\$\d+(?:\.\d)?K$/);
  assert.equal(formatMarkerPrice(undefined), null);
});

test('low zoom never requests individual price labels', () => {
  assert.equal(shouldShowPriceMarker(12), false);
  assert.equal(shouldShowPriceMarker(14), false);
  assert.equal(shouldShowPriceMarker(15), true);
});

test('results, Buildings, and locations retain separate definitions', () => {
  const rows = [{ id: 'building-1', latitude: 40.75, longitude: -73.98 }, { id: 'building-2', latitude: 40.75, longitude: -73.98 }, { id: 'building-3', latitude: null, longitude: null }];
  const results = rows.length;
  assert.equal(results, 3);
  assert.equal(uniqueMapBuildings(rows).length, 2);
  assert.equal(uniqueMapLocationCount(rows), 1);
});

test('missing, partial, zero, and out-of-service coordinates never enter the map', () => {
  for (const row of [
    { id: 'missing', latitude: null, longitude: null },
    { id: 'partial', latitude: 40.75, longitude: null },
    { id: 'zero', latitude: 0, longitude: 0 },
    { id: 'outside', latitude: 35, longitude: -73.98 },
  ]) assert.equal(hasValidMapCoordinate(row), false);
});

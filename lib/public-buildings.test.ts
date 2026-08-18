import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicCatalogRow } from './public-buildings';

test('public catalog excludes explicit Preview and test fixtures', () => {
  assert.equal(isPublicCatalogRow({ slug: 'preview-e2e-building', name: 'Preview E2E Building', address: '1 Preview Test Way' }), false);
  assert.equal(isPublicCatalogRow({ slug: 'preview-inventory-river-test', name: 'Preview Inventory River Test', address: '200 Preview River Avenue' }), false);
  assert.equal(isPublicCatalogRow({ slug: 'test-building', name: 'Test Building', address: '1 Test Way' }), false);
});

test('public catalog keeps ordinary production-style buildings', () => {
  assert.equal(isPublicCatalogRow({ slug: 'one-blue-slip', name: 'One Blue Slip', address: '1 Blue Slip' }), true);
  assert.equal(isPublicCatalogRow({ slug: 'the-ashland', name: 'The Ashland', address: '250 Ashland Place' }), true);
});

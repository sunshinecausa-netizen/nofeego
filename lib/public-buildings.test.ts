import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicCatalogRow, projectPublicBuilding } from './public-buildings';

test('public catalog excludes explicit Preview and test fixtures', () => {
  assert.equal(isPublicCatalogRow({ slug: 'preview-e2e-building', name: 'Preview E2E Building', address: '1 Preview Test Way' }), false);
  assert.equal(isPublicCatalogRow({ slug: 'preview-inventory-river-test', name: 'Preview Inventory River Test', address: '200 Preview River Avenue' }), false);
  assert.equal(isPublicCatalogRow({ slug: 'test-building', name: 'Test Building', address: '1 Test Way' }), false);
});

test('public catalog keeps ordinary production-style buildings', () => {
  assert.equal(isPublicCatalogRow({ slug: 'one-blue-slip', name: 'One Blue Slip', address: '1 Blue Slip' }), true);
  assert.equal(isPublicCatalogRow({ slug: 'the-ashland', name: 'The Ashland', address: '250 Ashland Place' }), true);
});

test('public projection omits internal inventory, source, contact, and workflow fields', () => {
  const building = projectPublicBuilding({
    id: 'building-1', slug: 'one-blue-slip', name: 'One Blue Slip', address: '1 Blue Slip', city: 'Brooklyn', state: 'NY',
    zip_code: '11222', latitude: 40.73, longitude: -73.95, building_type: 'Rental building', amenities: ['Doorman'],
    year_built: 2018, stories: 30, total_units: 359, updated_at: '2026-08-18T00:00:00Z',
    source_url: 'https://internal.example/source', contact_email: 'leasing@example.com', leasing_phone: '555-0100',
    partnership_status: 'Active', inventory_snapshots: [{ unit_number: '12A' }],
  }) as unknown as Record<string, unknown>;

  for (const field of ['source_url', 'contact_email', 'leasing_phone', 'partnership_status', 'inventory_snapshots', 'unit_number']) {
    assert.equal(Object.hasOwn(building, field), false, `${field} must not enter the public projection`);
  }
});

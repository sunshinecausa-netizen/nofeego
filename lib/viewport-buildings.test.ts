import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchBuildingsPageUncached } from './viewport-buildings';

test('applies bounds and stable ordering before pagination', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-anon-key';
  const requested: URL[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requested.push(url);
    if (url.pathname.endsWith('/catalog_inventory_summary')) return Response.json([]);
    return Response.json([{ id: 'lic-1', slug: 'lic-1', name: 'LIC One', address: '1 Center Blvd', city: 'Long Island City', state: 'NY', zip_code: '11101', latitude: 40.744, longitude: -73.957, neighborhood: 'Long Island City', borough: 'Queens', amenities: [], hero_image_url: null, hero_image: null, nearby_subway: [], updated_at: '2026-08-16T00:00:00Z', building_type: null, stories: null, total_units: null }], { headers: { 'content-range': '0-0/1' } });
  };
  try {
    const result = await fetchBuildingsPageUncached({ page: 1, pageSize: 48, north: 40.76, south: 40.73, east: -73.93, west: -73.98 });
    assert.equal(result.total, 1);
    const catalog = requested.find((url) => url.pathname.endsWith('/catalog_buildings'));
    assert.ok(catalog);
    assert.deepEqual(catalog.searchParams.getAll('latitude'), ['gte.40.73', 'lte.40.76']);
    assert.deepEqual(catalog.searchParams.getAll('longitude'), ['gte.-73.98', 'lte.-73.93']);
    assert.equal(catalog.searchParams.get('order'), 'updated_at.desc,name.asc,id.asc');
    assert.equal(catalog.searchParams.get('limit'), '48');
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

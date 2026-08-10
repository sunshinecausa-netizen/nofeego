import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { parseStreetEasyPage } from './parse-streeteasy.js';
import { normalizeBuilding } from './normalize-building.js';
import { validateStreetEasyUrl } from './fetch-page.js';

const fixture = (name: string) => readFile(join(process.cwd(), 'scripts/street-easy-import/fixtures', name), 'utf8');
const now = new Date('2026-08-10T12:00:00.000Z');

test('parses Atelier public facts and current inventory without descriptions or media', async () => {
  const parsed = parseStreetEasyPage(await fixture('atelier.html'), 'https://streeteasy.com/building/atelier-condominium', now);
  assert.deepEqual({ name: parsed.buildingName, address: parsed.streetAddress, borough: parsed.borough, neighborhood: parsed.neighborhood, year: parsed.yearBuilt, floors: parsed.floors, units: parsed.units, developer: parsed.developer, architect: parsed.architect }, { name: 'Atelier', address: '635 West 42nd Street', borough: 'Manhattan', neighborhood: "Hell's Kitchen", year: 2007, floors: 46, units: 478, developer: 'The Moinian Group', architect: 'Costas Kondylis' });
  assert.deepEqual(parsed.amenities, ['Elevator','Gym','Doorman','Swimming Pool']);
  assert.deepEqual(parsed.inventory[0], { sourceRecordId: 'streeteasy:18J', unitReference: '18J', rent: 6500, bedrooms: 2, bathrooms: 2, squareFeet: 1050, availableDate: 'Sep 1', inventoryStatus: 'available', raw: { rent: '$6,500', bedrooms: '2 beds', bathrooms: '2 baths', squareFeet: '1,050 ft²', availableDate: 'Sep 1' } });
  assert.equal(JSON.stringify(parsed).includes('description'), false);
  assert.equal(JSON.stringify(parsed).includes('image'), false);
});

test('normalizes studio and available date', async () => {
  const normalized = normalizeBuilding(parseStreetEasyPage(await fixture('rental-with-inventory.html'), 'https://streeteasy.com/building/126-east-7-street-new_york', now));
  assert.equal(normalized.inventory[0]?.bedrooms, 0);
  assert.equal(normalized.inventory[0]?.availableDate, '2026-09-01');
  assert.equal(normalized.inventory[0]?.rent, 3099);
  assert.equal(normalized.requiresReview, true);
});

test('treats no available units as a valid reviewable empty state', async () => {
  const normalized = normalizeBuilding(parseStreetEasyPage(await fixture('empty-inventory.html'), 'https://streeteasy.com/building/165-orchard-street-new_york', now));
  assert.equal(normalized.inventory.length, 0);
  assert.ok(normalized.issues.some((issue) => issue.code === 'no_current_inventory'));
});

test('rejects unsupported hosts and non-building paths', () => {
  assert.throws(() => validateStreetEasyUrl('https://example.com/building/foo'));
  assert.throws(() => validateStreetEasyUrl('https://streeteasy.com/for-rent/nyc'));
});

test('stops on access restriction pages', () => {
  assert.throws(() => parseStreetEasyPage('<html><body>Verify you are human</body></html>', 'https://streeteasy.com/building/test', now), /restriction/i);
});

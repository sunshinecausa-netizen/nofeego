import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { parseStreetEasyPage } from './parse-streeteasy.js';
import { normalizeBuilding } from './normalize-building.js';
import { exportReviewWorkbook } from './export-review-workbook.js';

test('exports the canonical review workbook without writing Supabase', async () => {
  const html = await readFile(join(process.cwd(), 'scripts/street-easy-import/fixtures/atelier.html'), 'utf8');
  const record = normalizeBuilding(parseStreetEasyPage(html, 'https://streeteasy.com/building/atelier-condominium', new Date('2026-08-10T12:00:00Z')));
  const directory = await mkdtemp(join(tmpdir(), 'nofeego-se-'));
  const path = join(directory, 'review.xlsx');
  await exportReviewWorkbook(record, path);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Building_Master','Unit_Master','Amenity_Master','building_sources','import_batches','Inventory_Snapshots','Raw_Facts','Field_Mapping','Review_Report']);
  assert.equal(workbook.getWorksheet('Building_Master')?.getCell('B2').value, 'Atelier');
  assert.equal(workbook.getWorksheet('Inventory_Snapshots')?.getCell('F2').value, 6500);
  assert.equal(workbook.getWorksheet('building_sources')?.getCell('E2').value, 'StreetEasy');
});

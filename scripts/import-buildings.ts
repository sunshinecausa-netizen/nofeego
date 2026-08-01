import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

type RawRow = Record<string, unknown>;
type BuildingImport = {
  building_id: string;
  building_name: string;
  name: string;
  slug: string;
  street_address: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  borough: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  year_built: number | null;
  building_type: string | null;
  building_class: string | null;
  stories: number | null;
  floors: number | null;
  total_units: number | null;
  luxury: boolean | null;
  pet_friendly: boolean | null;
  official_building_website: string | null;
  apply_online_url: string | null;
  virtual_tour_url: string | null;
  building_phone: string | null;
  leasing_phone: string | null;
  building_leasing_email: string | null;
  management_company: string | null;
  developer: string | null;
  current_owner: string | null;
  source_url: string;
  last_verified_date: string;
  search_keywords: string[];
  data_confidence: 'High' | 'Medium' | 'Low';
  is_active: boolean;
};

type ImportError = { row: number; buildingId?: string; message: string };
type Summary = { source: string; dryRun: boolean; read: number; valid: number; inserted: number; updated: number; skipped: number; errors: ImportError[] };

const HEADER_MAP: Record<string, keyof BuildingImport | 'ignore'> = {
  'Building ID': 'building_id', 'Building Name': 'building_name', 'Street Address': 'street_address', City: 'city', State: 'state',
  'ZIP Code': 'zip_code', Borough: 'borough', Neighborhood: 'neighborhood', Latitude: 'latitude', Longitude: 'longitude',
  'Year Built': 'year_built', 'Building Type': 'building_type', 'Building Class': 'building_class', Stories: 'stories',
  'Total Units': 'total_units', 'Luxury (Yes/No)': 'luxury', 'Pet Friendly': 'pet_friendly',
  'Official Building Website': 'official_building_website', 'Apply Online URL': 'apply_online_url', 'Virtual Tour URL': 'virtual_tour_url',
  'Building Phone': 'building_phone', 'Building Leasing Email': 'building_leasing_email', 'Management Company': 'management_company',
  Developer: 'developer', 'Current Owner (if different)': 'current_owner', 'Source URL': 'source_url', 'Last Verified Date': 'last_verified_date',
};
const REQUIRED = ['Building ID', 'Building Name', 'Street Address', 'City', 'State', 'ZIP Code', 'Source URL', 'Last Verified Date'];

function text(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text).trim() || null;
  const result = String(value).trim();
  return result || null;
}
function numberValue(value: unknown): number | null { const valueText = text(value); if (!valueText) return null; const parsed = Number(valueText); return Number.isFinite(parsed) ? parsed : null; }
function booleanValue(value: unknown): boolean | null { const valueText = text(value)?.toLowerCase(); if (!valueText) return null; if (['yes','true','1','y'].includes(valueText)) return true; if (['no','false','0','n'].includes(valueText)) return false; return null; }
function slugify(value: string): string { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100); }

async function readRows(path: string): Promise<RawRow[]> {
  const extension = extname(path).toLowerCase();
  if (!['.xlsx', '.xlsm', '.csv'].includes(extension)) throw new Error('Only .xlsx, .xlsm, and .csv files are supported.');
  const workbook = new ExcelJS.Workbook();
  const csvSheet = extension === '.csv' ? await workbook.csv.readFile(path) : null;
  if (!csvSheet) await workbook.xlsx.readFile(path);
  const sheet = csvSheet ?? workbook.getWorksheet('Building_Master') ?? workbook.worksheets[0]; if (!sheet) throw new Error('Workbook has no worksheets.');
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => text(value) ?? '');
  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => { if (rowNumber === 1) return; const values = (row.values as unknown[]).slice(1); if (values.every((value) => !text(value))) return; rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index]]))); });
  return rows;
}

function normalize(row: RawRow, rowNumber: number): { value?: BuildingImport; error?: ImportError } {
  const missing = REQUIRED.filter((header) => !text(row[header]));
  if (missing.length) return { error: { row: rowNumber, buildingId: text(row['Building ID']) ?? undefined, message: `Missing required fields: ${missing.join(', ')}` } };
  const mapped = Object.fromEntries(Object.entries(HEADER_MAP).map(([header, field]) => [field, row[header]])) as Record<string, unknown>;
  const buildingId = text(mapped.building_id)!; const buildingName = text(mapped.building_name)!; const streetAddress = text(mapped.street_address)!;
  const latitude = numberValue(mapped.latitude); const longitude = numberValue(mapped.longitude);
  if ((latitude != null && (latitude < -90 || latitude > 90)) || (longitude != null && (longitude < -180 || longitude > 180))) return { error: { row: rowNumber, buildingId, message: 'Latitude or longitude is outside valid range.' } };
  const slug = slugify(buildingName); if (!slug) return { error: { row: rowNumber, buildingId, message: 'Building Name cannot generate a valid slug.' } };
  const value: BuildingImport = {
    building_id: buildingId, building_name: buildingName, name: buildingName, slug, street_address: streetAddress, address: streetAddress,
    city: text(mapped.city)!, state: text(mapped.state)!, zip_code: text(mapped.zip_code)!, borough: text(mapped.borough), neighborhood: text(mapped.neighborhood),
    latitude, longitude, year_built: numberValue(mapped.year_built), building_type: text(mapped.building_type), building_class: text(mapped.building_class),
    stories: numberValue(mapped.stories), floors: numberValue(mapped.stories), total_units: numberValue(mapped.total_units), luxury: booleanValue(mapped.luxury), pet_friendly: booleanValue(mapped.pet_friendly),
    official_building_website: text(mapped.official_building_website), apply_online_url: text(mapped.apply_online_url), virtual_tour_url: text(mapped.virtual_tour_url),
    building_phone: text(mapped.building_phone), leasing_phone: text(mapped.building_phone), building_leasing_email: text(mapped.building_leasing_email),
    management_company: text(mapped.management_company), developer: text(mapped.developer), current_owner: text(mapped.current_owner), source_url: text(mapped.source_url)!,
    last_verified_date: text(mapped.last_verified_date)!, search_keywords: [...new Set([buildingName, text(mapped.neighborhood), text(mapped.borough), text(mapped.city), text(mapped.developer)].filter((item): item is string => Boolean(item)))],
    data_confidence: latitude != null && longitude != null && numberValue(mapped.total_units) != null ? 'High' : text(mapped.source_url) ? 'Medium' : 'Low', is_active: true,
  };
  return { value };
}

async function writeChunk(client: SupabaseClient, rows: BuildingImport[], existing: Map<string, { id: string; building_id: string | null; slug: string }>) {
  const match = (row: BuildingImport) => existing.get(`id:${row.building_id}`) ?? existing.get(`slug:${row.slug}`);
  const updates = rows.filter((row) => match(row)).map((row) => ({ ...row, id: match(row)!.id }));
  const inserts = rows.filter((row) => !match(row));
  if (updates.length) { const { error } = await client.from('buildings').upsert(updates, { onConflict: 'id' }); if (error) throw error; }
  if (inserts.length) { const { error } = await client.from('buildings').upsert(inserts, { onConflict: 'building_id' }); if (error) throw error; }
  return { updated: updates.length, inserted: inserts.length };
}

async function main() {
  const args = process.argv.slice(2); const sourceArg = args.find((arg) => !arg.startsWith('--'));
  if (!sourceArg) throw new Error('Usage: pnpm import:buildings <file.xlsx|file.csv> [--commit] [--report=path.json]');
  const source = resolve(sourceArg); const dryRun = !args.includes('--commit'); const reportArg = args.find((arg) => arg.startsWith('--report='));
  const rawRows = await readRows(source); const summary: Summary = { source, dryRun, read: rawRows.length, valid: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
  const unique = new Map<string, BuildingImport>(); const slugs = new Set<string>();
  rawRows.forEach((row, index) => { const result = normalize(row, index + 2); if (result.error) summary.errors.push(result.error); else if (result.value) { if (unique.has(result.value.building_id)) summary.errors.push({ row: index + 2, buildingId: result.value.building_id, message: 'Duplicate Building ID in source; row skipped.' }); else if (slugs.has(result.value.slug)) summary.errors.push({ row: index + 2, buildingId: result.value.building_id, message: 'Duplicate generated slug in source; row skipped.' }); else { unique.set(result.value.building_id, result.value); slugs.add(result.value.slug); } } });
  summary.valid = unique.size; summary.skipped = summary.errors.length;
  if (!dryRun) {
    const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --commit.');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from('buildings').select('id,building_id,slug'); if (error) throw error;
    const existing = new Map<string, { id: string; building_id: string | null; slug: string }>();
    for (const item of data ?? []) { const record = item as { id: string; building_id: string | null; slug: string }; if (record.building_id) existing.set(`id:${record.building_id}`, record); existing.set(`slug:${record.slug}`, record); }
    const rows = [...unique.values()]; for (let offset = 0; offset < rows.length; offset += 250) { const counts = await writeChunk(client, rows.slice(offset, offset + 250), existing); summary.inserted += counts.inserted; summary.updated += counts.updated; }
  }
  const reportPath = resolve(reportArg?.slice('--report='.length) || `${source}.import-summary.json`); await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length) process.exitCode = 2;
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

import { readFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';
import type { NormalizedImport } from './types.js';

const canonical = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const columnIndex = (reference: string) => reference.match(/[A-Z]+/)?.[0].split('').reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) ?? 0;

async function readBuildingRows(workbookPath: string): Promise<string[][]> {
  const zip = await JSZip.loadAsync(await readFile(workbookPath));
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relationshipsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relationshipsXml) throw new Error('Workbook structure is incomplete.');
  const workbook = cheerio.load(workbookXml, { xmlMode: true });
  const buildingSheet = workbook('*').filter((_, element) => element.type === 'tag' && element.name.toLowerCase().endsWith('sheet') && workbook(element).attr('name') === 'Building_Master').first();
  const relationId = buildingSheet.attr('r:id') ?? buildingSheet.attr('id');
  if (!relationId) throw new Error('Template has no Building_Master sheet.');
  const relationships = cheerio.load(relationshipsXml, { xmlMode: true });
  const relationship = relationships('*').filter((_, element) => element.type === 'tag' && element.name.toLowerCase().endsWith('relationship') && relationships(element).attr('Id') === relationId).first();
  const target = relationship.attr('Target');
  if (!target) throw new Error('Building_Master worksheet relationship is missing.');
  const normalizedTarget = target.replace(/^\//, '').replace(/^xl\//, '');
  const worksheetXml = await zip.file(`xl/${normalizedTarget}`)?.async('string');
  if (!worksheetXml) throw new Error('Building_Master worksheet XML is missing.');
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const shared: string[] = [];
  if (sharedXml) {
    const strings = cheerio.load(sharedXml, { xmlMode: true });
    strings('si').each((_, item) => { shared.push(strings(item).find('t').map((__, node) => strings(node).text()).get().join('')); });
  }
  const sheet = cheerio.load(worksheetXml, { xmlMode: true });
  const rows: string[][] = [];
  sheet('sheetData row').each((_, rowNode) => {
    const row: string[] = [];
    sheet(rowNode).find('c').each((__, cellNode) => {
      const cell = sheet(cellNode);
      const index = columnIndex(cell.attr('r') ?? '') - 1;
      const type = cell.attr('t');
      const raw = type === 'inlineStr' ? cell.find('is t').text() : cell.find('v').text();
      row[index] = type === 's' ? shared[Number(raw)] ?? '' : raw;
    });
    rows.push(row);
  });
  return rows;
}

export async function detectWorkbookDuplicates(record: NormalizedImport, workbookPath?: string): Promise<string[]> {
  if (!workbookPath) return [];
  try {
    const rows = await readBuildingRows(workbookPath);
    const headers = new Map(rows[0]?.map((header, index) => [header, index]) ?? []);
    const candidates: string[] = [];
    for (let rowNumber = 1; rowNumber < rows.length; rowNumber += 1) {
      const row = rows[rowNumber];
      const id = row[headers.get('Building ID') ?? 0] || `row ${rowNumber + 1}`;
      const name = row[headers.get('Building Name') ?? 1];
      const address = row[headers.get('Street Address') ?? 2];
      const zip = row[headers.get('ZIP Code') ?? 5];
      const nameMatch = Boolean(canonical(name)) && canonical(name) === canonical(record.buildingName);
      const addressMatch = Boolean(canonical(address)) && canonical(address) === canonical(record.streetAddress) && canonical(zip) === canonical(record.zipCode);
      if (nameMatch || addressMatch) candidates.push(`${id}: ${name ?? ''} — ${address ?? ''} ${zip ?? ''} (${addressMatch ? 'address' : 'name'} match)`);
    }
    return candidates;
  } catch (error) {
    return [`Duplicate comparison could not read the template: ${error instanceof Error ? error.message : String(error)}`];
  }
}

import { createHash } from 'node:crypto';
import type { NormalizedImport, ParsedBuilding, ReviewIssue } from './types.js';

export function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

function stableId(prefix: string, value: string) {
  return `${prefix}-${createHash('sha256').update(value).digest('hex').slice(0, 10).toUpperCase()}`;
}

function isoDate(value: string | null, scrapedAt: string): string | null {
  if (!value) return null;
  if (/^now$/i.test(value)) return scrapedAt.slice(0, 10);
  const match = value.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
  if (!match) return null;
  const current = new Date(scrapedAt);
  let year = match[3] ? Number(match[3]) : current.getUTCFullYear();
  const candidate = new Date(`${match[1]} ${match[2]}, ${year} 00:00:00 UTC`);
  if (!match[3] && candidate.getTime() < current.getTime() - 31 * 86_400_000) year += 1;
  return new Date(`${match[1]} ${match[2]}, ${year} 00:00:00 UTC`).toISOString().slice(0, 10);
}

export function normalizeBuilding(parsed: ParsedBuilding): NormalizedImport {
  const identity = parsed.streetAddress && parsed.zipCode ? `${parsed.streetAddress}|${parsed.zipCode}`.toLowerCase() : parsed.sourceUrl;
  const buildingId = stableId('BLD-SE', identity);
  const sourceEntryId = stableId('SRC-SE', parsed.sourceUrl);
  const importBatchId = `BATCH-SE-${parsed.scrapedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  parsed.inventory = parsed.inventory.map((item) => ({ ...item, availableDate: isoDate(item.availableDate, parsed.scrapedAt) }));
  const issues: ReviewIssue[] = [];
  const required: Array<[keyof ParsedBuilding, string]> = [['buildingName','Building name'],['streetAddress','Street address'],['city','City'],['state','State'],['zipCode','ZIP code']];
  for (const [field, label] of required) if (!parsed[field]) issues.push({ severity: 'error', code: 'missing_required', field, message: `${label} could not be reliably extracted.` });
  for (const field of ['borough','neighborhood','propertyType','yearBuilt','floors','units','developer','architect'] as const) {
    if (!parsed[field]) issues.push({ severity: 'warning', code: 'missing_optional', field, message: `${field} was not present in a reliable public field.` });
  }
  parsed.inventory.forEach((unit) => {
    if (unit.rent == null) issues.push({ severity: 'warning', code: 'inventory_missing_rent', field: `unit:${unit.unitReference}`, message: 'Available unit has no reliable rent.' });
    if (unit.bedrooms == null || unit.bathrooms == null) issues.push({ severity: 'warning', code: 'inventory_missing_layout', field: `unit:${unit.unitReference}`, message: 'Available unit is missing beds or baths.' });
  });
  if (!parsed.inventory.length) issues.push({ severity: 'info', code: 'no_current_inventory', field: 'inventory', message: 'No current rental inventory was found; this may be a valid empty state.' });
  const populated = parsed.rawFacts.filter((fact) => fact.normalizedValue != null).length;
  const high = parsed.rawFacts.filter((fact) => fact.normalizedValue != null && fact.confidence === 'High').length;
  const dataConfidence = issues.some((issue) => issue.severity === 'error') ? 'Low' : high >= 4 ? 'High' : populated >= 7 ? 'Medium' : 'Low';
  return { ...parsed, buildingId, sourceEntryId, importBatchId, slug: slugify(parsed.buildingName ?? identity), dataConfidence, requiresReview: true, issues, duplicateCandidates: [] };
}

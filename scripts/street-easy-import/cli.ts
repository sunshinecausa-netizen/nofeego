import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchPublicBuildingPage } from './fetch-page.js';
import { parseStreetEasyPage } from './parse-streeteasy.js';
import { normalizeBuilding } from './normalize-building.js';
import { detectWorkbookDuplicates } from './detect-duplicates.js';
import { exportReviewWorkbook } from './export-review-workbook.js';

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const url = argument('url');
  if (!url) throw new Error('Usage: pnpm extract:building --url=https://streeteasy.com/building/... [--output=dir] [--template=file.xlsx] [--html-file=authorized-snapshot.html]');
  const htmlFile = argument('html-file');
  const page = htmlFile ? { url, html: await readFile(resolve(htmlFile), 'utf8') } : await fetchPublicBuildingPage(url);
  const { url: finalUrl, html } = page;
  const normalized = normalizeBuilding(parseStreetEasyPage(html, finalUrl));
  const template = argument('template');
  normalized.duplicateCandidates = await detectWorkbookDuplicates(normalized, template ? resolve(template) : undefined);
  if (normalized.duplicateCandidates.length) normalized.requiresReview = true;
  const outputDir = resolve(argument('output') ?? `outputs/street-easy-import/${normalized.importBatchId.toLowerCase()}-${normalized.slug}`);
  await mkdir(outputDir, { recursive: true });
  await rm(resolve(outputDir, 'extraction-error.json'), { force: true });
  const workbookPath = resolve(outputDir, `NoFeeGo_StreetEasy_${normalized.slug}_Review.xlsx`);
  await exportReviewWorkbook(normalized, workbookPath);
  const rawSnapshot = { source_name: normalized.sourceName, source_url: normalized.sourceUrl, scraped_at: normalized.scrapedAt, last_verified_at: normalized.lastVerifiedAt, data_confidence: normalized.dataConfidence, requires_review: normalized.requiresReview, facts: normalized.rawFacts, inventory: normalized.inventory };
  const report = { building_id: normalized.buildingId, workbook: workbookPath, missing_or_anomalous_fields: normalized.issues, duplicate_candidates: normalized.duplicateCandidates, supabase_write_performed: false };
  await writeFile(resolve(outputDir, 'raw-facts.json'), `${JSON.stringify(rawSnapshot, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outputDir, 'extraction-metadata.json'), `${JSON.stringify({ source_name: 'StreetEasy', source_url: normalized.sourceUrl, scraped_at: normalized.scrapedAt, extractor_version: '0.1.0', request_count: 1, html_stored: false }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (normalized.issues.some((issue) => issue.severity === 'error')) process.exitCode = 2;
}

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  const url = argument('url');
  const fallbackSlug = url ? new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'unknown' : 'unknown';
  const outputDir = resolve(argument('output') ?? `outputs/street-easy-import/blocked-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${fallbackSlug}`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'extraction-error.json'), `${JSON.stringify({ source_name: 'StreetEasy', source_url: url ?? null, attempted_at: new Date().toISOString(), error: message, stopped_without_bypass: true, supabase_write_performed: false }, null, 2)}\n`, 'utf8');
  process.exitCode = 1;
});

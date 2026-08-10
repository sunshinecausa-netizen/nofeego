import ExcelJS from 'exceljs';
import type { NormalizedImport } from './types.js';
import { FIELD_MAPPING } from './field-mapping.js';

const BUILDING_HEADERS = ['Building ID','Building Name','Street Address','City','State','ZIP Code','Borough','Neighborhood','Latitude','Longitude','Year Built','Building Type','Building Class','Stories','Total Units','Luxury (Yes/No)','Pet Friendly','Official Building Website','Apply Online URL','Virtual Tour URL','Building Phone','Building Leasing Email','Management Company','Developer','Current Owner (if different)','Source URL','Last Verified Date','Address Line 2','Country Code','Slug','Description','Market Segment','Publication Status','Data Quality Status','Created At','Updated At'];
const UNIT_HEADERS = ['Unit ID','Building ID','Source Entry ID','Unit Reference','Unit Type','Floorplan Name','Bedrooms','Bathrooms','Square Feet Min','Square Feet Max','Floor','Has In-Unit W/D','Is Furnished','Accessible Unit','Floorplan URL','Is Active','Created At','Updated At'];
const AMENITY_HEADERS = ['Amenity Record ID','Building ID','Pets Allowed','Dogs Allowed','Cats Allowed','Pet Policy Text','Elevator','Gym','Doorman','Concierge','Laundry in Building','In-Unit W/D Available','Roof Deck','Outdoor Space','Pool','Parking','Bike Storage','Package Room','Storage Available','Coworking Space','Lounge','Playroom','Wheelchair Accessible','Smoke Free','Amenities Text','Last Verified At','Created At','Updated At'];
const SOURCE_HEADERS = ['Source Entry ID','Building ID','Import Batch ID','Source Type','Source Name','Source Record ID','Source URL','Source Updated At','Retrieved At','Last Verified At','Verification Status','Usage Rights','Display Permission','Source Priority','Raw Payload JSON','Is Active','Created At','Updated At'];
const BATCH_HEADERS = ['Import Batch ID','Source Type','File Name','File Checksum','Import Mode','Status','Started At','Completed At','Total Rows','Valid Rows','Inserted Rows','Updated Rows','Skipped Rows','Error Rows','Duplicate Candidates','Error Summary JSON','Report Path','Initiated By','Created At'];
const INVENTORY_HEADERS = ['Inventory Snapshot ID','Building ID','Unit ID','Source Entry ID','Source Record ID','Rent','Concession Text','Concession Amount','Net Effective Rent','Available Date','Is No Fee','Inventory Status','Captured At','Valid From','Valid Until'];

const hasAmenity = (record: NormalizedImport, name: string) => record.amenities.some((item) => item.toLowerCase() === name.toLowerCase());
const unitId = (record: NormalizedImport, unit: string) => `${record.buildingId}-UNIT-${unit.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: readonly string[], rows: unknown[][]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.addRow([...headers]);
  rows.forEach((row) => sheet.addRow(row));
  const header = sheet.getRow(1);
  header.height = 32;
  header.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153B5B' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  for (let index = 2; index <= sheet.rowCount; index += 1) {
    const row = sheet.getRow(index);
    row.height = 42;
    row.font = { name: 'Aptos', size: 10, color: { argb: 'FF203040' } };
    row.alignment = { vertical: 'top', wrapText: true };
    if (index % 2 === 0) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD7EFF8' } }; });
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: headers.length } };
  sheet.columns.forEach((column, index) => {
    const headerText = headers[index] ?? '';
    column.width = /URL|JSON|Message|Description|Mapping|Raw|Normalized/.test(headerText) ? 38 : Math.min(24, Math.max(12, headerText.length + 2));
  });
  return sheet;
}

export async function exportReviewWorkbook(record: NormalizedImport, outputPath: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NoFeeGo';
  workbook.subject = 'StreetEasy public facts review preview; no Supabase writes';
  const created = new Date(record.scrapedAt);
  const buildingRow = [record.buildingId,record.buildingName,record.streetAddress,record.city,record.state,record.zipCode,record.borough,record.neighborhood,null,null,record.yearBuilt,record.propertyType,record.buildingClass,record.floors,record.units,null,null,null,null,null,null,null,null,record.developer,null,record.sourceUrl,record.lastVerifiedAt.slice(0,10),null,'US',record.slug,null,'unknown','draft',record.requiresReview ? 'review_required' : 'complete',created,null];
  addSheet(workbook, 'Building_Master', BUILDING_HEADERS, [buildingRow]);
  addSheet(workbook, 'Unit_Master', UNIT_HEADERS, record.inventory.map((item) => [unitId(record,item.unitReference),record.buildingId,record.sourceEntryId,item.unitReference,null,null,item.bedrooms,item.bathrooms,item.squareFeet,item.squareFeet,null,null,null,null,null,true,created,null]));
  const amenityValues = ['Pets Allowed','Dogs Allowed','Cats Allowed'].map((name) => hasAmenity(record,name) || null);
  const remainingAmenities = ['Elevator','Gym','Doorman','Concierge','Laundry in Building','In-Unit Washer/Dryer','Roof Deck','Outdoor Space','Swimming Pool','Parking','Bike Storage','Package Room','Storage Available','Coworking Space','Lounge','Playroom','Wheelchair Access','Smoke-Free'].map((name) => hasAmenity(record,name) || null);
  addSheet(workbook, 'Amenity_Master', AMENITY_HEADERS, [[`${record.buildingId}-AMN`,record.buildingId,...amenityValues,null,...remainingAmenities,record.amenities.join('; ') || null,new Date(record.lastVerifiedAt),created,null]]);
  addSheet(workbook, 'building_sources', SOURCE_HEADERS, [[record.sourceEntryId,record.buildingId,record.importBatchId,'third_party_public_facts','StreetEasy',new URL(record.sourceUrl).pathname,record.sourceUrl,null,new Date(record.scrapedAt),new Date(record.lastVerifiedAt),record.requiresReview ? 'needs_review' : 'verified','public_facts_review','facts_only',50,JSON.stringify({ facts: record.rawFacts, requires_review: record.requiresReview, data_confidence: record.dataConfidence }),true,created,null]]);
  addSheet(workbook, 'import_batches', BATCH_HEADERS, [[record.importBatchId,'third_party_public_facts',outputPath.split(/[\\/]/).pop(),null,'preview_only',record.issues.some((issue) => issue.severity === 'error') ? 'blocked' : 'review_ready',created,created,1,record.issues.some((issue) => issue.severity === 'error') ? 0 : 1,0,0,0,record.issues.filter((issue) => issue.severity === 'error').length,record.duplicateCandidates.length,JSON.stringify(record.issues),outputPath,'cli',created]]);
  addSheet(workbook, 'Inventory_Snapshots', INVENTORY_HEADERS, record.inventory.map((item) => [`${unitId(record,item.unitReference)}-${record.scrapedAt.replace(/\D/g,'').slice(0,14)}`,record.buildingId,unitId(record,item.unitReference),record.sourceEntryId,item.sourceRecordId,item.rent,null,null,null,item.availableDate ? new Date(`${item.availableDate}T00:00:00Z`) : null,null,item.inventoryStatus,new Date(record.scrapedAt),new Date(record.scrapedAt),null]));
  addSheet(workbook, 'Raw_Facts', ['Field','Raw Value','Normalized Value','Extraction Method','Confidence','Note','Source URL','Scraped At'], record.rawFacts.map((fact) => [fact.field,fact.rawValue,fact.normalizedValue,fact.extractionMethod,fact.confidence,fact.note ?? null,record.sourceUrl,new Date(record.scrapedAt)]));
  addSheet(workbook, 'Field_Mapping', FIELD_MAPPING[0], FIELD_MAPPING.slice(1).map((row) => [...row]));
  const reviewRows = record.issues.map((issue) => [issue.severity,issue.code,issue.field ?? null,issue.message,true]);
  record.duplicateCandidates.forEach((candidate) => reviewRows.push(['warning','duplicate_candidate','building',candidate,true]));
  if (!reviewRows.length) reviewRows.push(['info','human_approval_required',null,'No validation issues detected. Human approval is still required before any future import.',true]);
  addSheet(workbook, 'Review_Report', ['Severity','Code','Field','Message','Requires Review'], reviewRows);
  for (const sheet of workbook.worksheets) {
    const dateHeaders = ['Last Verified Date','Retrieved At','Last Verified At','Created At','Updated At','Captured At','Valid From','Valid Until','Available Date','Scraped At'];
    sheet.getRow(1).eachCell((cell, column) => { if (dateHeaders.includes(String(cell.value))) sheet.getColumn(column).numFmt = 'yyyy-mm-dd hh:mm'; });
  }
  await workbook.xlsx.writeFile(outputPath);
}

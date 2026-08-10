import * as cheerio from 'cheerio';
import type { Confidence, ParsedBuilding, RawFact, RentalInventory } from './types.js';

const clean = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() || null;
const integer = (value: string | null) => value ? Number(value.replace(/,/g, '')) : null;
const numberValue = (value: string | null) => value ? Number(value.replace(/,/g, '')) : null;

function visibleText($: cheerio.CheerioAPI) {
  return clean($('body').find('*').addBack().contents().filter((_, node) => node.type === 'text').map((_, node) => $(node).text()).get().join(' ')) ?? '';
}

function jsonLdObjects($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;
      const visit = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') {
          result.push(value as Record<string, unknown>);
          const graph = (value as Record<string, unknown>)['@graph'];
          if (graph) visit(graph);
        }
      };
      visit(parsed);
    } catch { /* Invalid third-party JSON-LD is ignored and reported through missing fields. */ }
  });
  return result;
}

function labeledValue($: cheerio.CheerioAPI, label: string): string | null {
  let value: string | null = null;
  $('dt,th,strong,b,div,span').each((_, element) => {
    if (value || clean($(element).text())?.toLowerCase() !== label.toLowerCase()) return;
    const node = $(element);
    const candidate = clean(node.next('dd,td,div,span,p').first().text())
      ?? clean(node.parent().children().not(element).first().text())
      ?? clean(node.parent().next().first().text());
    if (candidate && candidate.toLowerCase() !== label.toLowerCase() && candidate.length < 250) value = candidate;
  });
  return value;
}

function sectionText($: cheerio.CheerioAPI, heading: RegExp): string {
  let startElement: Parameters<typeof $>[0] | undefined;
  $('h2,h3').each((_, element) => { if (!startElement && heading.test(clean($(element).text()) ?? '')) startElement = element; });
  if (!startElement) return '';
  const chunks: string[] = [];
  let cursor = $(startElement).next();
  while (cursor.length && !/^h[123]$/i.test(cursor.get(0)?.tagName ?? '')) {
    const text = clean(cursor.text());
    if (text) chunks.push(text);
    cursor = cursor.next();
  }
  return chunks.join(' ');
}

function parseAddress(value: string | null) {
  const match = value?.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/);
  return match ? { street: clean(match[1]), city: clean(match[2]), state: match[3], zip: match[4] } : { street: null, city: null, state: null, zip: null };
}

function parseInventory($: cheerio.CheerioAPI): RentalInventory[] {
  const availableHeading = $('h2,h3').filter((_, el) => /available units/i.test($(el).text())).first();
  if (!availableHeading.length) return [];
  const endHeading = $('h2,h3').filter((_, el) => /unavailable|all units/i.test($(el).text())).first();
  const startIndex = $('*').index(availableHeading);
  const endIndex = endHeading.length ? $('*').index(endHeading) : Number.MAX_SAFE_INTEGER;
  const rows: RentalInventory[] = [];
  $('h3,h4,h5,h6,a').each((_, element) => {
    const index = $('*').index($(element));
    const unit = clean($(element).text())?.match(/^#([A-Za-z0-9-]+)$/)?.[1];
    if (!unit || index <= startIndex || index >= endIndex) return;
    let container = $(element).closest('article,li');
    if (!container.length) container = $(element).parent();
    const containerText = () => clean(container.find('*').addBack().contents().filter((__, node) => node.type === 'text').map((__, node) => $(node).text()).get().join(' ')) ?? '';
    let text = containerText();
    for (let depth = 0; depth < 3 && text.length < 35; depth += 1) {
      container = container.parent();
      text = containerText() || text;
    }
    if (text.length > 1500) text = text.slice(0, 1500);
    const rentRaw = text.match(/\$[\d,]+/)?.[0] ?? null;
    const bedroomsRaw = text.match(/\bStudio\b|[\d.]+\s*(?:beds?|bedrooms?)/i)?.[0] ?? null;
    const bathroomsRaw = text.match(/[\d.]+\s*baths?/i)?.[0] ?? null;
    const squareFeetRaw = text.match(/[\d,]+\s*(?:ft²|sq\.?\s*ft)/i)?.[0] ?? null;
    const rent = integer(rentRaw?.replace('$', '') ?? null);
    const bedsText = bedroomsRaw?.toLowerCase() === 'studio' ? 'Studio' : bedroomsRaw?.match(/[\d.]+/)?.[0] ?? null;
    const baths = numberValue(bathroomsRaw?.match(/[\d.]+/)?.[0] ?? null);
    const sqft = integer(squareFeetRaw?.match(/[\d,]+/)?.[0] ?? null);
    const availableRaw = clean(text.match(/Available:\s*([^$|]+?)(?=Studio|\d+(?:\.\d+)?\s*beds?|\d+(?:\.\d+)?\s*baths?|$)/i)?.[1]);
    const status = /in contract|pending/i.test(text) ? 'pending' : rent != null ? 'available' : 'unknown';
    rows.push({
      sourceRecordId: `streeteasy:${unit}`,
      unitReference: unit,
      rent,
      bedrooms: bedsText?.toLowerCase() === 'studio' ? 0 : numberValue(bedsText),
      bathrooms: baths,
      squareFeet: sqft,
      availableDate: availableRaw,
      inventoryStatus: status,
      raw: { rent: rentRaw, bedrooms: bedroomsRaw, bathrooms: bathroomsRaw, squareFeet: squareFeetRaw, availableDate: availableRaw },
    });
  });
  return [...new Map(rows.map((row) => [row.unitReference, row])).values()];
}

export function parseStreetEasyPage(html: string, sourceUrl: string, now = new Date()): ParsedBuilding {
  const $ = cheerio.load(html);
  $('script:not([type="application/ld+json"]),style,noscript,svg,img,picture').remove();
  const bodyText = visibleText($);
  if (/captcha|verify you are human|access denied|unusual traffic/i.test(bodyText)) throw new Error('Access restriction detected; extraction stopped.');
  const ld = jsonLdObjects($);
  const residence = ld.find((item) => ['ApartmentComplex', 'Residence', 'Place'].includes(String(item['@type'])));
  const ldAddress = residence?.address && typeof residence.address === 'object' ? residence.address as Record<string, unknown> : null;
  const headingName = clean($('h1').first().text());
  const addressHeading = $('h2').map((_, el) => clean($(el).text())).get().find((value) => /,\s*[A-Z]{2}\s+\d{5}/.test(value ?? '')) ?? null;
  const address = parseAddress(addressHeading ?? (ldAddress ? [ldAddress.streetAddress, ldAddress.addressLocality, ldAddress.addressRegion, ldAddress.postalCode].filter(Boolean).join(', ').replace(/, ([A-Z]{2}), /, '$1 ') : null));
  const metaLine = $('div,p,li').map((_, el) => clean($(el).text())).get().find((value) => /^(?:Condo|Co-op building|Rental building|Other type)\s+in\s+.+$/i.test(value ?? '')) ?? null;
  const metaMatch = metaLine?.match(/(?:Condo|Co-op building|Rental building|Other type)\s+in\s+(.+)$/i);
  const propertyType = clean(bodyText.match(/\b(Condo|Co-op building|Rental building|Other type)\b/i)?.[1]);
  const neighborhood = clean(metaMatch?.[1]) ?? clean(labeledValue($, 'Neighborhood'));
  const facts = {
    buildingClass: labeledValue($, 'Building class'),
    developer: labeledValue($, 'Developer'),
    architect: labeledValue($, 'Architect'),
  };
  const city = address.city;
  const borough = city === 'New York' ? 'Manhattan' : ['Brooklyn', 'Bronx', 'Queens', 'Staten Island'].includes(city ?? '') ? city : null;
  const amenitiesText = sectionText($, /^amenities$/i);
  const amenityTerms = ['Pets Allowed','Elevator','Gym','Doorman','Concierge','Laundry in Building','In-Unit Washer/Dryer','Roof Deck','Outdoor Space','Swimming Pool','Parking','Bike Storage','Package Room','Storage Available','Coworking Space','Lounge','Playroom','Wheelchair Access','Smoke-Free'];
  const amenities = amenityTerms.filter((term) => new RegExp(term.replace(/[/-]/g, '.?'), 'i').test(amenitiesText));
  const yearMatch = bodyText.match(/\b(18\d{2}|19\d{2}|20\d{2})\s+built\b/i);
  const floorsMatch = bodyText.match(/([\d,]+)\s+stor(?:y|ies)\b/i);
  const unitsMatch = bodyText.match(/([\d,]+)\s+units\b/i);
  const values = {
    buildingName: clean(String(residence?.name ?? '')) ?? headingName,
    streetAddress: clean(String(ldAddress?.streetAddress ?? '')) ?? address.street,
    city: clean(String(ldAddress?.addressLocality ?? '')) ?? address.city,
    state: clean(String(ldAddress?.addressRegion ?? '')) ?? address.state,
    zipCode: clean(String(ldAddress?.postalCode ?? '')) ?? address.zip,
    borough,
    neighborhood,
    propertyType,
    buildingClass: facts.buildingClass,
    yearBuilt: integer(yearMatch?.[1] ?? null),
    floors: integer(floorsMatch?.[1] ?? null),
    units: integer(unitsMatch?.[1] ?? null),
    developer: facts.developer,
    architect: facts.architect,
  };
  const rawValues: Record<string, string | number | null> = { buildingName: residence?.name ? String(residence.name) : headingName, streetAddress: ldAddress?.streetAddress ? String(ldAddress.streetAddress) : addressHeading, city: addressHeading, state: addressHeading, zipCode: addressHeading, borough: values.city, neighborhood: metaLine, propertyType: metaLine, buildingClass: facts.buildingClass, yearBuilt: yearMatch?.[0] ?? null, floors: floorsMatch?.[0] ?? null, units: unitsMatch?.[0] ?? null, developer: facts.developer, architect: facts.architect };
  const rawFacts: RawFact[] = Object.entries(values).map(([field, value]) => ({ field, rawValue: rawValues[field] ?? null, normalizedValue: value, extractionMethod: residence && ['buildingName','streetAddress','city','state','zipCode'].includes(field) ? 'json_ld' : field === 'borough' ? 'derived' : 'semantic_heading', confidence: (value == null ? 'Low' : residence && ['buildingName','streetAddress','city','state','zipCode'].includes(field) ? 'High' : 'Medium') as Confidence }));
  amenities.forEach((value) => rawFacts.push({ field: 'amenity', rawValue: value, normalizedValue: value, extractionMethod: 'semantic_heading', confidence: 'Medium' }));
  const scrapedAt = now.toISOString();
  return { sourceName: 'StreetEasy', sourceUrl, scrapedAt, lastVerifiedAt: scrapedAt, ...values, amenities, inventory: parseInventory($), rawFacts };
}

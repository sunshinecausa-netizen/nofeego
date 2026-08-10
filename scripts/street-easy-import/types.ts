export type Confidence = 'High' | 'Medium' | 'Low';

export type RawFact = {
  field: string;
  rawValue: string | number | boolean | null;
  normalizedValue: string | number | boolean | null;
  extractionMethod: 'json_ld' | 'semantic_label' | 'semantic_heading' | 'derived';
  confidence: Confidence;
  note?: string;
};

export type RentalInventory = {
  sourceRecordId: string;
  unitReference: string;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  availableDate: string | null;
  inventoryStatus: 'available' | 'pending' | 'unknown';
  raw: { rent: string | null; bedrooms: string | null; bathrooms: string | null; squareFeet: string | null; availableDate: string | null };
};

export type ParsedBuilding = {
  sourceName: 'StreetEasy';
  sourceUrl: string;
  scrapedAt: string;
  lastVerifiedAt: string;
  buildingName: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  borough: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  buildingClass: string | null;
  yearBuilt: number | null;
  floors: number | null;
  units: number | null;
  developer: string | null;
  architect: string | null;
  amenities: string[];
  inventory: RentalInventory[];
  rawFacts: RawFact[];
};

export type ReviewIssue = {
  severity: 'error' | 'warning' | 'info';
  code: string;
  field?: string;
  message: string;
};

export type NormalizedImport = ParsedBuilding & {
  buildingId: string;
  sourceEntryId: string;
  importBatchId: string;
  slug: string;
  dataConfidence: Confidence;
  requiresReview: boolean;
  issues: ReviewIssue[];
  duplicateCandidates: string[];
};

import type { Building, BuildingPhoto, DataConfidence, PartnershipStatus, Transit, Unit } from './types';

export type BuildingSummaryModel = Pick<Building,
  'id' | 'building_id' | 'slug' | 'name' | 'building_name' | 'street_address' | 'city' | 'state' |
  'zip_code' | 'borough' | 'neighborhood' | 'latitude' | 'longitude' | 'hero_image_url' | 'is_active'
>;

export type BuildingDetailModel = Building & { units?: Unit[]; photos?: BuildingPhoto[]; transit?: Transit[] };

export type BuildingUpsertModel = {
  building_id: string; building_name: string; slug: string; street_address: string; city: string; state: string;
  zip_code: string; partnership_status?: PartnershipStatus; data_confidence?: DataConfidence; is_active?: boolean;
} & Partial<Omit<Building, 'id' | 'created_at' | 'updated_at' | 'neighborhoods'>>;

export type UnitUpsertModel = Omit<Unit, 'id' | 'created_at' | 'updated_at' | 'buildings'> & { id?: string };
export type PaginatedResponse<T> = { data: T[]; page: number; pageSize: number; total: number };

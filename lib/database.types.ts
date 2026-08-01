export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type PartnershipStatus = 'Not Contacted' | 'Contacted' | 'Negotiating' | 'Partner' | 'Inactive';
export type DataConfidence = 'High' | 'Medium' | 'Low';

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      buildings: Table<{
        id: string; building_id: string | null; slug: string; name: string; building_name: string | null;
        neighborhood_id: string | null; neighborhood: string | null; borough: string | null;
        address: string; street_address: string | null; city: string; state: string; zip_code: string | null;
        latitude: number | null; longitude: number | null; description: string | null; building_type: string | null;
        building_class: string | null; amenities: string[] | null; year_built: number | null; floors: number | null;
        stories: number | null; total_units: number | null; luxury: boolean | null; pet_friendly: boolean | null;
        hero_image: string | null; hero_image_url: string | null; logo_url: string | null; gallery: string[] | null;
        gallery_folder: string | null; official_building_website: string | null; apply_online_url: string | null;
        virtual_tour_url: string | null; building_phone: string | null; building_leasing_email: string | null;
        management_company: string | null; developer: string | null; current_owner: string | null;
        source_url: string | null; last_verified_date: string | null; search_keywords: string[];
        google_place_id: string | null; partnership_status: PartnershipStatus; leasing_contact_name: string | null;
        leasing_phone: string | null; data_confidence: DataConfidence; ai_summary: string | null; is_active: boolean;
        updated_by: string | null; created_at: string; updated_at: string;
        seo_title: string | null; seo_description: string | null; faqs: Json | null; nearby_subway: string[] | null;
        nearby_grocery: string[] | null; nearby_restaurants: string[] | null; transportation: string[] | null;
        neighborhood_summary: string | null; contact_email: string | null; contact_phone: string | null;
      }>;
      units: Table<{
        id: string; building_id: string; legacy_listing_id: string | null; unit_number: string | null; rent: number;
        bedrooms: number; bathrooms: number; square_feet: number | null; available_date: string | null;
        lease_term: number | null; floor: number | null; broker_fee: number | null; is_no_fee: boolean | null;
        status: string; created_at: string; updated_at: string;
      }>;
      amenities: Table<{ id: string; name: string; icon: string | null; category: string; created_at: string }>;
      building_amenities: Table<{ building_id: string; amenity_id: string; created_at: string }>;
      photos: Table<{ id: string; building_id: string; photo_url: string; caption: string | null; display_order: number; is_hero: boolean; created_at: string }>;
      neighborhoods: Table<{ id: string; name: string; borough: string; slug: string; description: string | null; is_active: boolean; created_at: string; updated_at: string }>;
      transit: Table<{ id: string; building_id: string; station_name: string; subway_lines: string[]; walking_minutes: number | null; created_at: string; updated_at: string }>;
      [key: string]: Table<Record<string, unknown>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { partnership_status: PartnershipStatus; data_confidence: DataConfidence };
    CompositeTypes: Record<string, never>;
  };
}

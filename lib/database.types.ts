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
      profiles: Table<{
        id: string; display_name: string | null; email: string | null; is_admin: boolean;
        account_role: 'tenant' | 'admin'; created_at: string; updated_at: string;
      }>;
      listings: Table<{
        id: string; slug: string; title: string; building_id: string | null; neighborhood_id: string | null;
        unit_number: string | null; price: number; bedrooms: number; bathrooms: number; sqft: number | null;
        furnished: boolean; pet_policy: string; move_in_date: string | null; lease_term_months: number | null;
        listing_type: string; status: string; description: string | null; images: string[] | null;
        amenities: string[] | null; latitude: number | null; longitude: number | null;
        seo_title: string | null; seo_description: string | null; created_at: string; updated_at: string;
      }>;
      favorites: Table<{
        id: string; user_id: string; listing_id: string | null; building_id: string | null; unit_id: string | null;
        created_at: string;
      }>;
      building_comparisons: Table<{
        id: string; user_id: string; building_id: string; created_at: string;
      }>;
      inquiries: Table<{
        id: string; user_id: string | null; building_id: string | null; unit_id: string | null;
        request_type: 'entire_place' | 'roommate' | null; message: string | null; move_in_date: string | null;
        monthly_budget: number | null; contact_name: string | null; contact_email: string | null;
        contact_phone: string | null; bedrooms: string | null; roommate_preferences: string | null;
        status: 'new' | 'Submitted' | 'In Review' | 'Responded' | 'Closed'; created_at: string; updated_at: string;
      }>;
      property_submissions: Table<{
        id: string; user_id: string | null; submission_data: Json; status: string; listing_id: string | null;
        created_at: string; updated_at: string;
      }>;
      units: Table<{
        id: string; unit_id: string | null; building_id: string; source_id: string | null; legacy_listing_id: string | null;
        unit_number: string | null; unit_reference: string | null; unit_type: string | null; floorplan_name: string | null;
        bedrooms: number | null; bathrooms: number | null; square_feet: number | null; square_feet_min: number | null; square_feet_max: number | null;
        floor: number | null; has_in_unit_wd: boolean | null; is_furnished: boolean | null; accessible_unit: boolean | null;
        floorplan_url: string | null; is_active: boolean; created_at: string; updated_at: string;
      }>;
      inventory_snapshots: Table<{
        id: string; building_id: string; unit_id: string; source_id: string | null; source_record_id: string;
        rent: number | null; concession_text: string | null; concession_amount: number | null; net_effective_rent: number | null;
        available_date: string | null; is_no_fee: boolean | null; inventory_status: string; captured_at: string;
        valid_from: string | null; valid_until: string | null; created_at: string;
      }>;
      amenities: Table<{ id: string; name: string; icon: string | null; category: string; created_at: string }>;
      building_amenities: Table<{
        id: string; amenity_record_id: string; building_id: string; source_id: string | null;
        pets_allowed: boolean | null; elevator: boolean | null; gym: boolean | null; doorman: boolean | null;
        laundry_in_building: boolean | null; parking: boolean | null; is_active: boolean; created_at: string; updated_at: string;
      }>;
      building_amenity_links: Table<{ building_id: string; amenity_id: string; created_at: string }>;
      photos: Table<{ id: string; building_id: string; photo_url: string; caption: string | null; display_order: number; is_hero: boolean; created_at: string }>;
      neighborhoods: Table<{
        id: string; name: string; borough: string; slug: string; description: string | null;
        avg_rent: number | null; latitude: number | null; longitude: number | null; hero_image: string | null;
        highlights: string[] | null; seo_title: string | null; seo_description: string | null; faqs: Json | null;
        restaurants: string[] | null; coffee_shops: string[] | null; parks: string[] | null;
        schools: string[] | null; lifestyle: string[] | null; transportation: string[] | null;
        is_active: boolean; created_at: string; updated_at: string;
      }>;
      transit: Table<{ id: string; building_id: string; station_name: string; subway_lines: string[]; walking_minutes: number | null; created_at: string; updated_at: string }>;
      [key: string]: Table<Record<string, unknown>>;
    };
    Views: {
      public_buildings: { Row: Partial<Database['public']['Tables']['buildings']['Row']> & { id: string; slug: string; name: string; address: string; city: string; state: string; is_active: boolean; updated_at: string }; Insert: never; Update: never; Relationships: [] };
      public_building_availability: { Row: { building_slug: string; availability_status: 'unavailable' | 'limited' | 'available' }; Insert: never; Update: never; Relationships: [] };
      public_building_rent_summary: { Row: { building_slug: string; studio_min_rent: number | null; one_bed_min_rent: number | null; two_bed_min_rent: number | null; three_bed_min_rent: number | null }; Insert: never; Update: never; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: { partnership_status: PartnershipStatus; data_confidence: DataConfidence };
    CompositeTypes: Record<string, never>;
  };
}

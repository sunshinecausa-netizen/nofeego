export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type PartnershipStatus = 'Not Contacted' | 'Contacted' | 'Negotiating' | 'Partner' | 'Inactive';
export type DataConfidence = 'High' | 'Medium' | 'Low';

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>, Relationships extends readonly unknown[] = []> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: Relationships;
};
type RelatedTable<Row, Relationships extends readonly unknown[]> = Table<Row, Partial<Row>, Partial<Row>, Relationships>;

export interface Database {
  public: {
    Tables: {
      buildings: RelatedTable<{
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
      }, [{ foreignKeyName:'buildings_neighborhood_id_fkey'; columns:['neighborhood_id']; isOneToOne:false; referencedRelation:'neighborhoods'; referencedColumns:['id'] }]>;
      profiles: Table<{
        id: string; display_name: string | null; email: string | null; is_admin: boolean;
        account_role: 'tenant' | 'agent' | 'property' | 'admin'; authorization_status: 'active' | 'pending' | 'suspended'; created_at: string; updated_at: string;
      }>;
      listings: RelatedTable<{
        id: string; slug: string; title: string; building_id: string | null; neighborhood_id: string | null;
        unit_number: string | null; price: number; bedrooms: number; bathrooms: number; sqft: number | null;
        furnished: boolean; pet_policy: string; move_in_date: string | null; lease_term_months: number | null;
        listing_type: string; status: string; description: string | null; images: string[] | null;
        amenities: string[] | null; latitude: number | null; longitude: number | null;
        seo_title: string | null; seo_description: string | null; created_at: string; updated_at: string;
      }, [{ foreignKeyName:'listings_building_id_fkey'; columns:['building_id']; isOneToOne:false; referencedRelation:'buildings'; referencedColumns:['id'] }, { foreignKeyName:'listings_neighborhood_id_fkey'; columns:['neighborhood_id']; isOneToOne:false; referencedRelation:'neighborhoods'; referencedColumns:['id'] }]>;
      favorites: Table<{
        id: string; user_id: string; listing_id: string | null; building_id: string | null; unit_id: string | null;
        created_at: string;
      }>;
      building_comparisons: Table<{
        id: string; user_id: string; building_id: string; created_at: string;
      }>;
      inquiries: Table<{
        id: string; user_id: string | null; idempotency_key: string | null; building_id: string | null; unit_id: string | null;
        request_type: 'entire_place' | 'roommate' | null; message: string | null; move_in_date: string | null;
        monthly_budget: number | null; contact_name: string | null; contact_email: string | null;
        contact_phone: string | null; bedrooms: string | null; roommate_preferences: string | null;
        status: 'new' | 'Submitted' | 'In Review' | 'Responded' | 'Closed'; created_at: string; updated_at: string;
      }>;
      rental_cases: Table<{
        id: string; inquiry_id: string; user_id: string; building_id: string | null; selected_floor_plan: string | null;
        displayed_starting_rent: number | null; preferred_unit_type: string | null;
        status: 'submitted' | 'reviewed' | 'agent_assigned' | 'options_sent' | 'interested' | 'registered_with_property' | 'property_acknowledged' | 'tour_scheduled' | 'application_started' | 'application_submitted' | 'lease_signed' | 'closed_lost' | 'cancelled';
        assigned_agent_id: string | null; property_organization_id: string | null; selected_recommendation_id: string | null; contact_share_consent: boolean;
        closed_reason: string | null; lease_signed_at: string | null; closed_at: string | null; created_at: string; updated_at: string;
      }>;
      rental_case_options: Table<{
        id: string; rental_case_id: string; unit_number: string | null; current_rent: number | null; concession: string | null;
        available_date: string | null; floor_plan_url: string | null; authorized_photo_urls: string[]; tour_method: string | null;
        information_valid_until: string | null; notes: string | null; created_at: string; updated_at: string;
      }>;
      rental_case_recommendation_snapshots: Table<{
        id: string; rental_case_id: string; agent_id: string; building_id: string; unit_id: string | null; unit_label: string | null;
        gross_rent: number | null; net_effective_rent: number | null; available_date: string | null; lease_term_months: number | null;
        concession: string | null; source_freshness: string | null; sent_at: string;
      }>;
      rental_case_status_history: Table<{
        id: string; rental_case_id: string; from_status: string | null; to_status: string; actor_id: string | null;
        actor_role: string; reason: string | null; created_at: string;
      }>;
      rental_case_tours: Table<{
        id:string;rental_case_id:string;building_id:string;unit_id:string|null;starts_at:string;time_zone:string;
        meeting_location:string|null;contact_name:string|null;contact_phone:string|null;
        property_status:'proposed'|'confirmed'|'declined'|'reschedule_requested';tenant_status:'proposed'|'confirmed'|'declined'|'reschedule_requested';
        status:'proposed'|'confirmed'|'completed'|'cancelled'|'reschedule_requested';meeting_instructions:string|null;
        tenant_feedback:string|null;internal_note:string|null;created_by:string;created_at:string;updated_at:string;
      }>;
      applications: Table<{
        id:string;user_id:string|null;unit_id:string|null;status:'draft'|'started'|'submitted'|'additional_information_requested'|'under_review'|'approved'|'declined'|'withdrawn';
        rental_case_id:string|null;building_id:string|null;application_url:string|null;started_at:string|null;submitted_at:string|null;
        property_status:string|null;missing_document_categories:string[];follow_up_at:string|null;internal_note:string|null;created_by:string|null;created_at:string;updated_at:string;
      }>;
      rental_case_recommendation_feedback: Table<{
        id: string; rental_case_id: string; recommendation_id: string; tenant_id: string;
        decision: 'interested' | 'not_interested'; created_at: string; updated_at: string;
      }>;
      rental_case_notifications: Table<{
        id: string; rental_case_id: string; recipient_id: string | null; recipient_role: 'tenant'|'agent'|'property'|'admin';
        event_type: string; channel: 'email'|'manual'; status: 'pending'|'delivered'|'manual_required'|'failed';
        dedupe_key: string; deep_link: string; last_error: string | null; created_at: string; delivered_at: string | null;
      }>;
      property_organizations: Table<{ id: string; name: string; created_at: string }>;
      property_organization_members: Table<{ organization_id: string; profile_id: string; created_at: string }>;
      property_building_access: Table<{ organization_id: string; building_id: string; granted_by: string; created_at: string }>;
      agent_building_inventory_access: Table<{ agent_id: string; building_id: string; granted_by: string; status: 'active'|'revoked'; expires_at: string|null; created_at: string; updated_at: string }>;
      property_contacts: Table<{
        id: string; building_id: string; organization_id: string | null; name: string | null; role_title: string | null;
        purpose: 'availability'|'leasing'|'registration'|'tour'|'application'|'general'|null;
        phone: string | null; email: string | null; website: string | null;
        preferred_method: 'phone'|'email'|'sms'|'portal'|null; preferred_hours: string | null;
        visibility: 'public'|'registered'|'agent_only'|'admin_only'; source_id: string | null; source_note: string | null;
        last_verified_at: string | null; verification_expires_at: string | null; is_active: boolean; needs_review: boolean;
        last_contacted_at: string | null; last_successful_contact_at: string | null; created_by: string | null;
        created_at: string; updated_at: string;
      }>;
      rental_case_property_registrations: Table<{
        id: string; rental_case_id: string; organization_id: string; building_id: string; recommendation_id: string | null;
        status: 'pending' | 'acknowledged' | 'unavailable' | 'revoked'; inventory_available: boolean | null;
        confirmed_gross_rent: number | null; confirmed_net_effective_rent: number | null; confirmed_available_date: string | null;
        confirmed_concession: string | null; tour_instructions: string | null; application_url: string | null;
        acknowledged_at: string | null; created_at: string; updated_at: string;
      }>;
      rental_case_property_invitations: Table<{
        id: string; registration_id: string; email: string; token_hash: string; expires_at: string; revoked_at: string | null;
        used_at: string | null; created_at: string;
      }>;
      rental_case_audit_logs: Table<{
        id: string; rental_case_id: string | null; actor_id: string | null; actor_role: string; event_type: string;
        metadata: Json; created_at: string;
      }>;
      acquisition_attributions: Table<{
        id: string; rental_case_id: string; tenant_id: string; session_id: string; landing_path: string;
        referrer_host: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
        utm_content: string | null; utm_term: string | null; captured_at: string;
      }>;
      property_contact_outbox: Table<{
        id: string; rental_case_id: string; registration_id: string | null; building_id: string | null;
        organization_id: string | null; property_contact_id: string | null; unit_id: string | null; recommendation_id: string | null;
        purpose: 'availability'|'leasing'|'registration'|'tour'|'application'|'general'; created_by: string; approved_by: string | null;
        recipient_email: string; subject: string; body_text: string;
        status: 'draft'|'approved'|'queued'|'sent'|'failed'|'acknowledged'|'cancelled'|'simulated_sent'|'manual_required'; idempotency_key: string;
        attempt_count: number; last_error: string | null; approved_at: string | null; simulated_sent_at: string | null;
        reply_received_at: string | null; acknowledged_at: string | null; cancelled_at: string | null; created_at: string; updated_at: string;
      }>;
      roommate_profiles: Table<{
        user_id: string; bio: string | null; notification_method: 'email' | 'sms'; contact_email: string | null;
        contact_phone: string | null; contact_sharing_enabled: boolean; is_paused: boolean; created_at: string; updated_at: string;
        display_name: string | null; smoking_status: string | null; pet_status: string | null; pet_allergies: string | null;
        work_pattern: string | null; sleep_schedule: string | null; noise_preference: string | null; cleaning_habits: string | null;
        guest_frequency: string | null; temperature_preference: string | null; identity_verification_willingness: string | null; profile_status: string;
      }>;
      roommate_preferences: Table<{
        user_id: string; max_monthly_budget: number; move_in_date: string; move_in_flexibility: string; lease_term: string;
        roommates_wanted: number; eligibility_status: string; credit_range: string; utilities_budget: string; qualification_status: string;
        guarantor_status: string; room_arrangement: string; smoking: string; pets: string; pet_allergies: string;
        noise_preference: string; guest_frequency: string; overnight_guests: string; temperature_preference: string;
        schedule: string; work_from_home: string; cleanliness: string; language: string | null; created_at: string; updated_at: string;
      }>;
      roommate_interests: Table<{
        id: string; user_id: string; building_id: string; unit_id: string | null; floor_plan: string;
        status: 'active' | 'paused' | 'withdrawn' | 'home_unavailable'; created_at: string; updated_at: string;
        roommate_profile_id: string | null; move_in_date: string | null; flexibility_days_before: number; flexibility_days_after: number;
        lease_term: string | null; personal_monthly_budget: number | null; roommates_needed: number | null; qualification_status: string | null;
        credit_category: string | null; guarantor_status: string | null; submitted_at: string | null; paused_at: string | null;
        withdrawn_at: string | null; contacted_at: string | null; closed_at: string | null; linked_inquiry_id: string | null;
      }>;
      roommate_matches: Table<{
        id: string; first_interest_id: string; second_interest_id: string; score: number;
        status: 'potential' | 'notified' | 'connected' | 'declined' | 'closed'; created_at: string; updated_at: string;
      }>;
      roommate_consents: Table<{
        id: string; user_id: string; interest_id: string | null; terms_version: string; privacy_accepted: boolean;
        safety_accepted: boolean; disclaimer_accepted: boolean; age_confirmed: boolean; community_guidelines_accepted: boolean;
        optional_matching_consent: boolean; accepted_at: string;
      }>;
      roommate_events: Table<{
        id: string; user_id: string; interest_id: string | null; event_type: string; metadata: Json; created_at: string;
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
      building_sources: Table<{
        id: string; source_entry_id: string; building_id: string; import_batch_id: string | null;
        source_type: string; source_name: string | null; source_record_id: string | null; source_url: string;
        source_updated_at: string | null; retrieved_at: string | null; last_verified_at: string | null;
        verification_status: string | null; usage_rights: string | null; display_permission: string | null;
        source_priority: number | null; raw_payload: Json | null; is_active: boolean; created_at: string; updated_at: string;
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
    };
    Views: {
      public_buildings: { Row: Partial<Database['public']['Tables']['buildings']['Row']> & { id: string; slug: string; name: string; address: string; city: string; state: string; is_active: boolean; updated_at: string }; Insert: never; Update: never; Relationships: [] };
      public_building_availability: { Row: { building_slug: string; availability_status: 'unavailable' | 'limited' | 'available' }; Insert: never; Update: never; Relationships: [] };
      public_building_unit_counts: { Row: { building_slug: string; available_unit_count: number; studio_available_count: number; one_bed_available_count: number; two_bed_available_count: number; three_bed_available_count: number }; Insert: never; Update: never; Relationships: [] };
      public_building_rent_summary: { Row: { building_slug: string; studio_min_rent: number | null; one_bed_min_rent: number | null; two_bed_min_rent: number | null; three_bed_min_rent: number | null }; Insert: never; Update: never; Relationships: [] };
      public_roommate_interest_counts: { Row: { building_id: string; interested_count: number }; Insert: never; Update: never; Relationships: [] };
    };
    Functions: {
      submit_roommate_interest_mvp: { Args: { payload: Json }; Returns: Json };
      create_roommate_rental_lead: { Args: { target_interest_id: string }; Returns: string };
      current_account_role: { Args: Record<string, never>; Returns: string };
      upsert_own_profile: { Args: { p_display_name?: string | null }; Returns: Database['public']['Tables']['profiles']['Row'] };
      admin_set_profile_authorization: { Args: { p_profile_id: string; p_role: string; p_status?: string }; Returns: Database['public']['Tables']['profiles']['Row'] };
      admin_assign_rental_case: { Args: { p_case_id: string; p_agent_id: string }; Returns: Database['public']['Tables']['rental_cases']['Row'] };
      transition_rental_case: { Args: { p_case_id: string; p_to_status: string; p_reason?: string | null }; Returns: Database['public']['Tables']['rental_cases']['Row'] };
      agent_send_recommendation: { Args: { p_case_id: string; p_building_id: string; p_unit_id: string | null; p_unit_label: string | null; p_gross_rent: number | null; p_net_effective_rent: number | null; p_available_date: string | null; p_lease_term_months: number | null; p_concession: string | null; p_source_freshness: string | null }; Returns: Database['public']['Tables']['rental_case_recommendation_snapshots']['Row'] };
      agent_register_with_property: { Args: { p_case_id: string; p_organization_id: string; p_building_id: string; p_recommendation_id: string | null }; Returns: Database['public']['Tables']['rental_case_property_registrations']['Row'] };
      admin_grant_property_building_access: { Args: { p_organization_id: string; p_building_id: string }; Returns: Database['public']['Tables']['property_building_access']['Row'] };
      agent_create_property_invitation: { Args: { p_registration_id: string; p_email: string; p_token_hash: string; p_expires_at: string }; Returns: Database['public']['Tables']['rental_case_property_invitations']['Row'] };
      property_acknowledge_registration: { Args: { p_registration_id: string; p_available: boolean; p_gross_rent: number | null; p_net_effective_rent: number | null; p_available_date: string | null; p_concession: string | null; p_tour_instructions: string | null; p_application_url: string | null }; Returns: Database['public']['Tables']['rental_case_property_registrations']['Row'] };
      consume_property_invitation: { Args: { p_token: string }; Returns: string };
      tenant_record_recommendation_feedback: { Args: { p_case_id: string; p_recommendation_id: string; p_decision: string }; Returns: Database['public']['Tables']['rental_case_recommendation_feedback']['Row'] };
      create_rental_case_from_inquiry: { Args: { p_inquiry_id: string; p_building_id: string | null; p_selected_floor_plan: string; p_displayed_starting_rent: number | null; p_preferred_unit_type: string }; Returns: Database['public']['Tables']['rental_cases']['Row'] };
      create_property_contact_draft: { Args: { p_registration_id: string; p_recipient_email: string; p_subject: string; p_body_text: string; p_idempotency_key: string }; Returns: Database['public']['Tables']['property_contact_outbox']['Row'] };
      create_property_outreach_draft: { Args: { p_case_id:string;p_building_id:string;p_organization_id:string;p_property_contact_id:string;p_unit_id:string|null;p_recommendation_id:string|null;p_subject:string;p_body_text:string;p_idempotency_key:string }; Returns: Database['public']['Tables']['property_contact_outbox']['Row'] };
      approve_property_contact: { Args: { p_outbox_id: string }; Returns: Database['public']['Tables']['property_contact_outbox']['Row'] };
      simulate_property_contact_send: { Args: { p_outbox_id: string; p_fail?: boolean }; Returns: Database['public']['Tables']['property_contact_outbox']['Row'] };
      agent_record_case_tour: { Args: { p_case_id:string;p_building_id:string;p_unit_id:string|null;p_starts_at:string;p_time_zone:string;p_meeting_location:string|null;p_contact_name:string|null;p_contact_phone:string|null;p_property_status:string;p_tenant_status:string;p_status:string;p_meeting_instructions:string|null;p_tenant_feedback:string|null;p_internal_note:string|null }; Returns: Database['public']['Tables']['rental_case_tours']['Row'] };
      agent_upsert_case_application: { Args: { p_case_id:string;p_unit_id:string|null;p_status:string;p_application_url:string|null;p_property_status:string|null;p_missing_document_categories:string[];p_follow_up_at:string|null;p_internal_note:string|null }; Returns: Database['public']['Tables']['applications']['Row'] };
    };
    Enums: { partnership_status: PartnershipStatus; data_confidence: DataConfidence };
    CompositeTypes: Record<string, never>;
  };
}

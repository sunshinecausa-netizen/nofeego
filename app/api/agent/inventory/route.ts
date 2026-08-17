import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

const BUILDING_FIELDS = 'id,slug,name,address,street_address,address_line_2,city,state,zip_code,neighborhood,borough,latitude,longitude,building_type,amenities,pet_friendly,year_built,floors,stories,total_units,hero_image,hero_image_url,gallery,nearby_subway,official_building_website,management_company,description,last_verified_date,updated_at';
const UNIT_FIELDS = 'id,building_id,unit_number,floorplan_name,unit_type,bedrooms,bathrooms,square_feet,floor,lease_term,status,is_active';
const SNAPSHOT_FIELDS = 'id,building_id,unit_id,source_id,rent,net_effective_rent,concession_text,available_date,inventory_status,captured_at,valid_until';
const SOURCE_FIELDS = 'id,building_id,source_type,source_name,source_url,last_verified_at,verification_status';
const CONTACT_FIELDS = 'id,building_id,organization_id,name,role_title,purpose,email,phone,website,preferred_method,source_note,last_verified_at,is_active,needs_review,last_contacted_at,last_successful_contact_at';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { data: role, error: roleError } = await auth.supabase.rpc('current_account_role');
  if (roleError) return accountError('ROLE_READ_FAILED', 'Inventory could not be loaded. Please try again.', 500);
  if (role !== 'agent') return accountError('AGENT_REQUIRED', 'You do not have permission to view this inventory.', 403);

  const { data: cases, error: casesError } = await auth.supabase
    .from('rental_cases')
    .select('id,building_id,status,selected_recommendation_id,updated_at')
    .not('status', 'in', '(lease_signed,closed_lost,cancelled)')
    .order('updated_at', { ascending: false });
  if (casesError) return accountError('INVENTORY_CASE_SCOPE_FAILED', 'Inventory could not be loaded. Please try again.', 500);

  const authorizedBuildingIds = [...new Set((cases ?? []).map((item) => item.building_id).filter((value): value is string => Boolean(value)))];
  const requestedBuildingId = new URL(request.url).searchParams.get('building');
  if (requestedBuildingId && !authorizedBuildingIds.includes(requestedBuildingId)) {
    return accountError('INVENTORY_BUILDING_FORBIDDEN', 'You do not have permission to view this inventory.', 403);
  }
  if (authorizedBuildingIds.length === 0) {
    return NextResponse.json({ state: 'no_access', buildings: [], cases: cases ?? [] });
  }

  const buildingIds = requestedBuildingId ? [requestedBuildingId] : authorizedBuildingIds;
  const caseIds = (cases ?? []).map((item) => item.id);
  const [buildingsResult, unitsResult, snapshotsResult, sourcesResult, accessResult, organizationsResult, contactsResult, outboxResult, feedbackResult, registrationsResult] = await Promise.all([
    auth.supabase.from('buildings').select(BUILDING_FIELDS).in('id', buildingIds),
    auth.supabase.from('units').select(UNIT_FIELDS).in('building_id', buildingIds),
    auth.supabase.from('inventory_snapshots').select(SNAPSHOT_FIELDS).in('building_id', buildingIds).order('captured_at', { ascending: false }),
    auth.supabase.from('building_sources').select(SOURCE_FIELDS).in('building_id', buildingIds).order('last_verified_at', { ascending: false }),
    auth.supabase.from('property_building_access').select('organization_id,building_id').in('building_id', buildingIds),
    auth.supabase.from('property_organizations').select('id,name'),
    auth.supabase.from('property_contacts').select(CONTACT_FIELDS).in('building_id', buildingIds),
    auth.supabase.from('property_contact_outbox').select('id,rental_case_id,building_id,status,created_at,updated_at,reply_received_at,acknowledged_at').in('building_id', buildingIds).order('updated_at', { ascending: false }),
    caseIds.length ? auth.supabase.from('rental_case_recommendation_feedback').select('rental_case_id,decision').in('rental_case_id', caseIds) : Promise.resolve({ data: [], error: null }),
    auth.supabase.from('rental_case_property_registrations').select('id,rental_case_id,building_id,status,updated_at').in('building_id', buildingIds).order('updated_at', { ascending: false }),
  ]);

  const failed = [buildingsResult, unitsResult, snapshotsResult, sourcesResult, accessResult, organizationsResult, contactsResult, outboxResult, feedbackResult, registrationsResult].find((result) => result.error);
  if (failed?.error) {
    console.error('Agent inventory query failed', { code: failed.error.code, message: failed.error.message });
    return accountError('INVENTORY_READ_FAILED', 'Inventory could not be loaded. Please try again.', 500);
  }

  return NextResponse.json({
    state: buildingsResult.data?.length ? 'ready' : 'no_inventory',
    buildings: buildingsResult.data ?? [],
    units: unitsResult.data ?? [],
    snapshots: snapshotsResult.data ?? [],
    sources: sourcesResult.data ?? [],
    propertyAccess: accessResult.data ?? [],
    organizations: organizationsResult.data ?? [],
    contacts: contactsResult.data ?? [],
    outbox: outboxResult.data ?? [],
    feedback: feedbackResult.data ?? [],
    registrations: registrationsResult.data ?? [],
    cases: cases ?? [],
  });
}

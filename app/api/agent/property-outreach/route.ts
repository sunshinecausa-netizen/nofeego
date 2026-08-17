import { NextResponse } from 'next/server';
import { authenticateAccountRequest, accountError } from '@/lib/account/server';
import type { Database } from '@/lib/database.types';

type Contact = Database['public']['Tables']['property_contacts']['Row'];

function contactPriority(contact: Contact) {
  const purpose = contact.purpose === 'availability' ? 0 : contact.purpose === 'leasing' ? 1 : 2;
  return [contact.needs_review ? 1 : 0, contact.is_active ? 0 : 1, purpose, contact.last_successful_contact_at ? -Date.parse(contact.last_successful_contact_at) : 0];
}

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { data: cases, error: caseError } = await auth.supabase.from('rental_cases').select('*').order('updated_at', { ascending: false });
  if (caseError) return accountError('OUTREACH_CASES_READ_FAILED', 'Unable to load assigned Rental Cases.', 500);
  const assigned = cases ?? [];
  const caseIds = assigned.map((item) => item.id);
  const buildingIds = [...new Set(assigned.map((item) => item.building_id).filter((id): id is string => Boolean(id)))];
  if (!caseIds.length) return NextResponse.json({ items: [] });

  const inquiryIds = assigned.map((item) => item.inquiry_id);
  const [{ data: buildings }, { data: inquiries }, { data: feedback }, { data: recommendations }, { data: access }, { data: organizations }, { data: contacts, error: contactError }, { data: inventory }, { data: outbox }] = await Promise.all([
    auth.supabase.from('buildings').select('id,name,address').in('id', buildingIds),
    auth.supabase.from('inquiries').select('id,move_in_date,monthly_budget,bedrooms').in('id', inquiryIds),
    auth.supabase.from('rental_case_recommendation_feedback').select('*').in('rental_case_id', caseIds).eq('decision', 'interested'),
    auth.supabase.from('rental_case_recommendation_snapshots').select('*').in('rental_case_id', caseIds),
    auth.supabase.from('property_building_access').select('*').in('building_id', buildingIds),
    auth.supabase.from('property_organizations').select('*'),
    auth.supabase.from('property_contacts').select('*').in('building_id', buildingIds),
    auth.supabase.from('inventory_snapshots').select('building_id,unit_id,captured_at,valid_until').in('building_id', buildingIds).order('captured_at', { ascending: false }),
    auth.supabase.from('property_contact_outbox').select('*').in('rental_case_id', caseIds).order('created_at', { ascending: false }),
  ]);
  if (contactError) return accountError('PROPERTY_CONTACT_CONTRACT_UNAVAILABLE', 'Property contacts are not available in this environment.', 503);

  const buildingMap = new Map((buildings ?? []).map((item) => [item.id, item]));
  const inquiryMap = new Map((inquiries ?? []).map((item) => [item.id, item]));
  const organizationMap = new Map((organizations ?? []).map((item) => [item.id, item]));
  const recommendationMap = new Map((recommendations ?? []).map((item) => [item.id, item]));
  const now = Date.now();

  const items = assigned.map((rentalCase) => {
    const buildingId = rentalCase.building_id;
    const inquiry = inquiryMap.get(rentalCase.inquiry_id) ?? null;
    if (!buildingId) {
      return {
        rentalCaseId: rentalCase.id,
        tenantReference: `Tenant ${rentalCase.user_id.slice(0, 8)}`,
        building: { id: '', name: 'Needs building review', address: '' },
        unitId: null,
        recommendationId: null,
        floorPlan: rentalCase.selected_floor_plan ?? rentalCase.preferred_unit_type,
        moveInDate: inquiry?.move_in_date ?? null,
        budget: inquiry?.monthly_budget ?? null,
        interestSource: 'rental_request',
        interestStatus: 'submitted',
        organization: null,
        organizationReason: 'The Rental Case does not resolve to a canonical Building ID.',
        preferredContact: null,
        contactReason: null,
        contactOptions: [],
        inventoryLastUpdated: null,
        inventoryStale: true,
        outbox: null,
        status: 'needs_building_review',
        nextAction: 'Review Building relationship',
        priority: 0,
      };
    }
    const selected = rentalCase.selected_recommendation_id ? recommendationMap.get(rentalCase.selected_recommendation_id) : null;
    const interestedFeedback = (feedback ?? []).find((item) => item.rental_case_id === rentalCase.id && item.recommendation_id === rentalCase.selected_recommendation_id);
    const organizationLinks = (access ?? []).filter((item) => item.building_id === buildingId);
    const organizationId = rentalCase.property_organization_id ?? (organizationLinks.length === 1 ? organizationLinks[0].organization_id : null);
    const availableContacts = (contacts ?? []).filter((item) => item.building_id === buildingId && item.is_active && (!organizationId || !item.organization_id || item.organization_id === organizationId));
    availableContacts.sort((a, b) => {
      const left = contactPriority(a), right = contactPriority(b);
      for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
      return 0;
    });
    const preferredContact = availableContacts[0] ?? null;
    const latestInventory = (inventory ?? []).find((item) => item.building_id === buildingId) ?? null;
    const currentOutbox = (outbox ?? []).find((item) => item.rental_case_id === rentalCase.id && item.building_id === buildingId) ?? null;
    const inventoryStale = !latestInventory || (latestInventory.valid_until ? Date.parse(latestInventory.valid_until) < now : now - Date.parse(latestInventory.captured_at) > 24 * 60 * 60 * 1000);
    const needsPropertyReview = !organizationId || organizationLinks.length > 1 && !rentalCase.property_organization_id;
    const status = needsPropertyReview ? 'needs_property_review' : !preferredContact ? 'missing_contact' : preferredContact.needs_review ? 'needs_contact_review' : currentOutbox?.status ?? (inventoryStale ? 'needs_inventory_update' : 'interested');
    const nextAction = needsPropertyReview ? 'Review Property organization' : !preferredContact ? 'Resolve missing contact' : preferredContact.needs_review ? 'Review contact source' : currentOutbox?.status === 'draft' ? 'Review draft' : currentOutbox?.status === 'approved' ? 'Simulate approved send' : currentOutbox?.status === 'failed' ? 'Retry' : currentOutbox ? 'Follow up' : 'Request latest availability';
    return {
      rentalCaseId: rentalCase.id,
      tenantReference: `Tenant ${rentalCase.user_id.slice(0, 8)}`,
      building: buildingMap.get(buildingId) ?? { id: buildingId, name: 'Needs building review', address: '' },
      unitId: selected?.unit_id ?? null,
      recommendationId: selected?.id ?? null,
      floorPlan: selected?.unit_label ?? rentalCase.selected_floor_plan ?? rentalCase.preferred_unit_type,
      moveInDate: inquiry?.move_in_date ?? null,
      budget: inquiry?.monthly_budget ?? null,
      interestSource: interestedFeedback ? 'tenant_recommendation_selection' : 'rental_request',
      interestStatus: interestedFeedback ? 'confirmed' : 'submitted',
      organization: organizationId ? organizationMap.get(organizationId) ?? { id: organizationId, name: 'Authorized organization' } : null,
      organizationReason: rentalCase.property_organization_id ? 'Organization already recorded on the Rental Case' : organizationLinks.length === 1 ? 'Only active organization authorized for this Building' : 'Multiple or missing Building authorization relationships',
      preferredContact,
      contactReason: preferredContact ? preferredContact.purpose === 'availability' ? 'Active availability contact for this Building' : preferredContact.purpose === 'leasing' ? 'Active leasing contact for this Building' : 'Best available reviewed Building contact' : null,
      contactOptions: availableContacts,
      inventoryLastUpdated: latestInventory?.captured_at ?? null,
      inventoryStale,
      outbox: currentOutbox,
      status,
      nextAction,
      priority: (interestedFeedback ? 0 : 10)
        + (inquiry?.move_in_date ? Math.max(0, Math.floor((Date.parse(inquiry.move_in_date) - now) / 86400000)) : 365)
        + (inventoryStale ? 0 : 30)
        + (!currentOutbox ? 0 : currentOutbox.status === 'failed' ? 1 : 20),
    };
  });
  items.sort((left, right) => left.priority - right.priority);
  return NextResponse.json({ items });
}

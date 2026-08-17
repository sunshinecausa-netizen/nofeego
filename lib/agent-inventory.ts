export const INVENTORY_RECENT_HOURS = 24;
export const INVENTORY_OUTDATED_DAYS = 7;

export type InventoryBuilding = {
  id:string; name:string; address:string; street_address:string; address_line_2:string|null; city:string; state:string; zip_code:string|null;
  neighborhood:string|null; borough:string|null; building_type:string|null; amenities:string[]|null; pet_friendly:boolean|null;
  official_building_website:string|null; management_company:string|null; description:string|null; last_verified_date:string|null;
};
export type InventoryUnit = { id:string; building_id:string; unit_number:string|null; floorplan_name:string|null; unit_type:string|null; bedrooms:number|null; bathrooms:number|null; square_feet:number|null; floor:number|null; lease_term:number|null; status:string; is_active:boolean };
export type InventorySnapshot = { id:string; building_id:string; unit_id:string; source_id:string|null; rent:number|null; net_effective_rent:number|null; concession_text:string|null; available_date:string|null; inventory_status:string; captured_at:string; valid_until:string|null };
export type InventorySource = { id:string; building_id:string; source_type:string; source_name:string|null; source_url:string; last_verified_at:string|null; verification_status:string|null };
export type InventoryContact = { id:string; building_id:string; organization_id:string|null; name:string|null; role_title:string|null; purpose:string|null; email:string|null; phone:string|null; website:string|null; preferred_method:string|null; source_note:string|null; last_verified_at:string|null; is_active:boolean; needs_review:boolean; last_contacted_at:string|null; last_successful_contact_at:string|null };
export type InventoryCase = { id:string; building_id:string|null; status:string; selected_recommendation_id:string|null; updated_at:string };
export type InventoryOutbox = { id:string; rental_case_id:string; building_id:string|null; status:string; created_at:string; updated_at:string; reply_received_at:string|null; acknowledged_at:string|null };
export type InventoryRegistration = { id:string; rental_case_id:string; building_id:string; status:string; updated_at:string };
export type AgentInventoryPayload = {
  state:'ready'|'no_access'|'no_inventory'; buildings:InventoryBuilding[]; units:InventoryUnit[]; snapshots:InventorySnapshot[]; sources:InventorySource[];
  propertyAccess:{organization_id:string;building_id:string}[]; organizations:{id:string;name:string}[]; contacts:InventoryContact[];
  outbox:InventoryOutbox[]; feedback:{rental_case_id:string;decision:string}[]; registrations:InventoryRegistration[]; cases:InventoryCase[];
};

export type Freshness = 'Recently verified'|'Needs confirmation'|'Outdated'|'Property reply pending';

export function latestSnapshots(snapshots:InventorySnapshot[]) {
  const byUnit = new Map<string,InventorySnapshot>();
  for (const snapshot of snapshots) if (!byUnit.has(snapshot.unit_id)) byUnit.set(snapshot.unit_id,snapshot);
  return [...byUnit.values()];
}

export function inventoryFreshness(snapshot:InventorySnapshot|undefined, replyPending=false, now=Date.now()):Freshness {
  if(replyPending) return 'Property reply pending';
  if(!snapshot) return 'Needs confirmation';
  const captured=Date.parse(snapshot.captured_at);
  const validUntil=snapshot.valid_until?Date.parse(snapshot.valid_until):null;
  if((validUntil!==null&&validUntil<now)||now-captured>INVENTORY_OUTDATED_DAYS*86_400_000)return 'Outdated';
  if(now-captured>INVENTORY_RECENT_HOURS*3_600_000)return 'Needs confirmation';
  return 'Recently verified';
}

export function money(value:number|null|undefined){return value==null?'Not provided':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value)}
export function dateTime(value:string|null|undefined){return value?new Date(value).toLocaleString():'Not provided'}

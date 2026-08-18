export const INVENTORY_RECENT_HOURS = 24;
export const INVENTORY_OUTDATED_DAYS = 7;

export type InventoryBuilding = {
  id:string; slug:string; name:string; address:string; street_address:string; address_line_2:string|null; city:string; state:string; zip_code:string|null;
  neighborhood:string|null; borough:string|null; building_type:string|null; amenities:string[]|null; pet_friendly:boolean|null;
  latitude:number|null; longitude:number|null; year_built:number|null; floors:number|null; stories:number|null; total_units:number|null;
  hero_image:string|null; hero_image_url:string|null; gallery:string[]|null; nearby_subway:string[]|null;
  official_building_website:string|null; management_company:string|null; description:string|null; last_verified_date:string|null; updated_at:string;
};
export type InventoryUnit = { id:string; building_id:string; unit_number:string|null; floorplan_name:string|null; unit_type:string|null; bedrooms:number|null; bathrooms:number|null; square_feet:number|null; floor:number|null; lease_term:number|null; broker_fee:number|null; is_no_fee:boolean|null; status:string; is_active:boolean };
export type InventorySnapshot = { id:string; building_id:string; unit_id:string; source_id:string|null; rent:number|null; net_effective_rent:number|null; concession_text:string|null; concession_amount:number|null; available_date:string|null; is_no_fee:boolean|null; inventory_status:string; captured_at:string; valid_until:string|null };
export type InventorySource = { id:string; building_id:string; source_type:string; source_name:string|null; source_url:string; last_verified_at:string|null; verification_status:string|null };
export type InventoryContact = { id:string; building_id:string; organization_id:string|null; name:string|null; role_title:string|null; purpose:string|null; email:string|null; phone:string|null; website:string|null; preferred_method:string|null; preferred_hours:string|null; source_note:string|null; last_verified_at:string|null; verification_expires_at:string|null; is_active:boolean; needs_review:boolean; last_contacted_at:string|null; last_successful_contact_at:string|null };
export type InventoryOrganization = {id:string;building_id:string;name:string;website:string|null;leasing_office_website:string|null;office_hours:string|null};
export type InventoryApplication = {building_id:string;application_url:string|null;last_verified_at:string|null;verification_expires_at:string|null};
export type InventoryFee = {id:string;unit_id:string;building_id:string;fee_type:string;amount:number|null;currency:string;description:string|null;is_mandatory:boolean;last_verified_at:string|null;valid_until:string|null};
export type InventoryCase = { id:string; building_id:string|null; status:string; selected_recommendation_id:string|null; updated_at:string };
export type InventoryOutbox = { id:string; rental_case_id:string; building_id:string|null; status:string; created_at:string; updated_at:string; reply_received_at:string|null; acknowledged_at:string|null };
export type InventoryRegistration = { id:string; rental_case_id:string; building_id:string; status:string; updated_at:string };
export type AgentInventoryPayload = {
  state:'ready'|'no_access'|'no_inventory'; buildingIds:string[];buildings:InventoryBuilding[]; units:InventoryUnit[]; snapshots:InventorySnapshot[]; sources:InventorySource[];
  organizations:InventoryOrganization[]; contacts:InventoryContact[];applications:InventoryApplication[];fees:InventoryFee[];
  propertyAccess:{organization_id:string;building_id:string}[];outbox:InventoryOutbox[];feedback:{rental_case_id:string;decision:string}[];registrations:InventoryRegistration[];cases:InventoryCase[];
};

export type Freshness = 'Current'|'Aging'|'Stale';
export type FloorPlanAvailability = { key:string; label:string; availableUnits:number; grossMin:number|null; grossMax:number|null; netMin:number|null; earliestAvailableDate:string|null; concessions:string[]; leaseTerms:number[]; freshness:Freshness; lastVerified:string|null; sourceName:string|null };

export function latestSnapshots(snapshots:InventorySnapshot[]) {
  const byUnit = new Map<string,InventorySnapshot>();
  for (const snapshot of snapshots) if (!byUnit.has(snapshot.unit_id)) byUnit.set(snapshot.unit_id,snapshot);
  return [...byUnit.values()];
}

export function combinePublicCatalogWithInventoryAccess(publicBuildings:Building[],authorizedBuildings:InventoryBuilding[]){
  const authorizedIds=new Set(authorizedBuildings.map(building=>building.id));
  return [...new Map(publicBuildings.map(building=>[building.id,building])).values()].map(building=>({building,hasInventoryAccess:authorizedIds.has(building.id)}));
}

export function currentAvailableSnapshots(snapshots:InventorySnapshot[], now=Date.now()) {
  return latestSnapshots(snapshots).filter(snapshot=>
    snapshot.inventory_status==='available'
    && (!snapshot.valid_until||Date.parse(snapshot.valid_until)>now)
    && inventoryFreshness(snapshot,false,now)!=='Stale'
  );
}

export function floorPlanAvailability(units:InventoryUnit[],snapshots:InventorySnapshot[],sources:InventorySource[],now=Date.now()):FloorPlanAvailability[]{
  const unitById=new Map(units.map(unit=>[unit.id,unit]));
  const sourceById=new Map(sources.map(source=>[source.id,source]));
  const groups=new Map<string,{label:string;snapshots:InventorySnapshot[];units:InventoryUnit[]}>();
  for(const snapshot of currentAvailableSnapshots(snapshots,now)){
    const unit=unitById.get(snapshot.unit_id);if(!unit)continue;
    const bedroomLabel=unit.bedrooms===0?'Studio':unit.bedrooms===1?'1 Bed':unit.bedrooms!=null?`${unit.bedrooms} Beds`:'Floor Plan';
    const label=unit.floorplan_name||bedroomLabel,key=unit.floorplan_name||`bedrooms:${unit.bedrooms??'unknown'}`;
    const group=groups.get(key)??{label,snapshots:[],units:[]};group.snapshots.push(snapshot);group.units.push(unit);groups.set(key,group);
  }
  return [...groups.entries()].map(([key,group])=>{
    const gross=group.snapshots.flatMap(item=>item.rent==null?[]:[item.rent]),net=group.snapshots.flatMap(item=>item.net_effective_rent==null?[]:[item.net_effective_rent]);
    const dates=group.snapshots.flatMap(item=>item.available_date?[item.available_date]:[]).sort();
    const concessions=[...new Set(group.snapshots.flatMap(item=>item.concession_text?[item.concession_text]:[]))];
    const leaseTerms=[...new Set(group.units.flatMap(item=>item.lease_term==null?[]:[item.lease_term]))].sort((a,b)=>a-b);
    const latest=[...group.snapshots].sort((a,b)=>b.captured_at.localeCompare(a.captured_at))[0];const source=latest?.source_id?sourceById.get(latest.source_id):undefined;
    return {key,label:group.label,availableUnits:group.snapshots.length,grossMin:gross.length?Math.min(...gross):null,grossMax:gross.length?Math.max(...gross):null,netMin:net.length?Math.min(...net):null,earliestAvailableDate:dates[0]??null,concessions,leaseTerms,freshness:inventoryFreshness(latest,false,now),lastVerified:source?.last_verified_at??latest?.captured_at??null,sourceName:source?.source_name??source?.source_type??null};
  }).sort((a,b)=>a.label.localeCompare(b.label));
}

export function agentBuildingProjection(building:InventoryBuilding):Building {
  return {
    ...building,building_id:null,building_name:null,neighborhood_id:null,description:building.description,seo_title:null,seo_description:null,
    faqs:null,nearby_grocery:null,nearby_restaurants:null,transportation:null,neighborhood_summary:null,contact_email:null,contact_phone:null,
    building_class:null,luxury:null,apply_online_url:null,virtual_tour_url:null,building_phone:null,building_leasing_email:null,developer:null,
    current_owner:null,source_url:null,search_keywords:[],google_place_id:null,logo_url:null,gallery_folder:null,partnership_status:'Not Contacted',
    leasing_contact_name:null,leasing_phone:null,data_confidence:'Low',ai_summary:null,updated_by:null,created_at:building.updated_at,
    is_active:true,neighborhoods:null,
  };
}

export function agentInventorySummary(buildingId:string,units:InventoryUnit[],snapshots:InventorySnapshot[]):BuildingInventorySummary {
  const unitById=new Map(units.filter(unit=>unit.building_id===buildingId).map(unit=>[unit.id,unit]));
  const current=currentAvailableSnapshots(snapshots.filter(snapshot=>snapshot.building_id===buildingId));
  const minimums:Partial<Record<0|1|2|3,number>>={};
  const counts:Partial<Record<0|1|2|3,number>>={};
  for(const snapshot of current){
    const bedroom=unitById.get(snapshot.unit_id)?.bedrooms;
    if(bedroom==null||bedroom<0||bedroom>3)continue;
    const key=bedroom as 0|1|2|3;
    counts[key]=(counts[key]??0)+1;
    if(snapshot.rent!=null)minimums[key]=minimums[key]==null?snapshot.rent:Math.min(minimums[key]!,snapshot.rent);
  }
  return {availabilityStatus:current.length?'available':'unavailable',bedroomMinimums:minimums,bedroomAvailableCounts:counts,availableCount:current.length||undefined};
}

export function inventoryFreshness(snapshot:InventorySnapshot|undefined, replyPending=false, now=Date.now()):Freshness {
  void replyPending;
  if(!snapshot) return 'Stale';
  const captured=Date.parse(snapshot.captured_at);
  const validUntil=snapshot.valid_until?Date.parse(snapshot.valid_until):null;
  if((validUntil!==null&&validUntil<now)||now-captured>INVENTORY_OUTDATED_DAYS*86_400_000)return 'Stale';
  if(now-captured>INVENTORY_RECENT_HOURS*3_600_000)return 'Aging';
  return 'Current';
}

export function money(value:number|null|undefined){return value==null?'Not provided':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value)}
export function dateTime(value:string|null|undefined){return value?new Date(value).toLocaleString():'Not provided'}
import type { BuildingInventorySummary } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

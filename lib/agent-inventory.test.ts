import assert from 'node:assert/strict';
import test from 'node:test';
import { agentBuildingProjection, agentInventorySummary, combinePublicCatalogWithInventoryAccess, currentAvailableSnapshots, floorPlanAvailability, type InventoryBuilding, type InventorySnapshot, type InventoryUnit } from './agent-inventory';

const building:InventoryBuilding={id:'building-1',slug:'building-1',name:'Building One',address:'1 Main Street',street_address:'1 Main Street',address_line_2:null,city:'New York',state:'NY',zip_code:'10001',neighborhood:'Chelsea',borough:'Manhattan',latitude:null,longitude:null,building_type:'Rental',amenities:['Gym'],pet_friendly:true,year_built:2020,floors:20,stories:20,total_units:200,hero_image:null,hero_image_url:null,gallery:null,nearby_subway:null,official_building_website:null,management_company:'Test Property',description:null,last_verified_date:null,updated_at:'2026-08-17T12:00:00Z'};
const units:InventoryUnit[]=[
  {id:'unit-studio',building_id:'building-1',unit_number:'2A',floorplan_name:'S1',unit_type:'Studio',bedrooms:0,bathrooms:1,square_feet:500,floor:2,lease_term:12,status:'active',is_active:true},
  {id:'unit-one',building_id:'building-1',unit_number:'3B',floorplan_name:'A1',unit_type:'1 Bed',bedrooms:1,bathrooms:1,square_feet:700,floor:3,lease_term:12,status:'active',is_active:true},
];
const snapshot=(value:Partial<InventorySnapshot>&Pick<InventorySnapshot,'id'|'unit_id'>):InventorySnapshot=>({id:value.id,building_id:'building-1',unit_id:value.unit_id,source_id:null,rent:value.rent??null,net_effective_rent:value.net_effective_rent??null,concession_text:null,available_date:null,inventory_status:value.inventory_status??'available',captured_at:value.captured_at??'2026-08-17T12:00:00Z',valid_until:null});

test('agent inventory summary uses the latest available unit facts',()=>{
  const result=agentInventorySummary('building-1',units,[
    snapshot({id:'latest-studio',unit_id:'unit-studio',rent:4100}),
    snapshot({id:'old-studio',unit_id:'unit-studio',rent:3900,captured_at:'2026-08-16T12:00:00Z'}),
    snapshot({id:'one-bed',unit_id:'unit-one',rent:5200}),
  ]);
  assert.equal(result.availableCount,2);
  assert.equal(result.bedroomMinimums[0],4100);
  assert.equal(result.bedroomMinimums[1],5200);
  assert.equal(result.bedroomAvailableCounts[0],1);
});

test('agent building projection preserves absent coordinates as null',()=>{
  const projected=agentBuildingProjection(building);
  assert.equal(projected.latitude,null);
  assert.equal(projected.longitude,null);
  assert.notEqual(projected.latitude,0);
  assert.notEqual(projected.longitude,0);
});

test('public catalog is never filtered or duplicated by Agent Inventory access',()=>{
  const second={...agentBuildingProjection(building),id:'building-2',slug:'building-2',name:'Building Two'};
  const result=combinePublicCatalogWithInventoryAccess([agentBuildingProjection(building),second,second],[building]);
  assert.deepEqual(result.map(item=>[item.building.id,item.hasInventoryAccess]),[['building-1',true],['building-2',false]]);
});

test('expired snapshots are excluded and floor plan ranges use canonical facts',()=>{
  const current={...snapshot({id:'current',unit_id:'unit-one',rent:4250}),source_id:'source-1',net_effective_rent:4050,concession_text:'1 month free',available_date:'2026-09-01',valid_until:'2026-09-01T00:00:00Z'};
  const expired={...snapshot({id:'expired',unit_id:'unit-one',rent:1,captured_at:'2026-08-01T12:00:00Z'}),source_id:'source-1',net_effective_rent:1,valid_until:'2026-08-10T00:00:00Z'};
  const outdatedWithoutExpiry={...snapshot({id:'outdated',unit_id:'unit-two',rent:2,captured_at:'2026-08-01T12:00:00Z'}),source_id:'source-1',net_effective_rent:2,valid_until:null};
  const sources=[{id:'source-1',building_id:'building-1',source_type:'property_portal',source_name:'Property portal',source_url:'https://example.invalid',last_verified_at:'2026-08-17T12:00:00Z',verification_status:'verified'}];
  const now=Date.parse('2026-08-18T00:00:00Z');
  assert.equal(currentAvailableSnapshots([current,expired,outdatedWithoutExpiry],now).length,1);
  const plans=floorPlanAvailability(units,[current,expired,outdatedWithoutExpiry],sources,now);
  assert.equal(plans[0].availableUnits,1);assert.equal(plans[0].grossMin,4250);assert.equal(plans[0].netMin,4050);assert.equal(plans[0].earliestAvailableDate,'2026-09-01');assert.equal(plans[0].sourceName,'Property portal');
});

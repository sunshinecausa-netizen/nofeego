'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CalendarDays, ChevronDown, CircleAlert, ExternalLink, Mail, Map, RefreshCw, Rows3, Send } from 'lucide-react';
import { AISearchInput } from '@/components/ai-search-input';
import { BuildingCard } from '@/components/building-result-card';
import { Button } from '@/components/ui/button';
import { accountFetch } from '@/lib/account/client';
import {
  type AgentInventoryPayload,
  type InventoryBuilding,
  type InventorySnapshot,
  type InventoryUnit,
  agentBuildingProjection,
  agentInventorySummary,
  inventoryFreshness,
  latestSnapshots,
  money,
} from '@/lib/agent-inventory';

const AgentMap = dynamic(() => import('@/components/building-map').then((module) => module.BuildingMap), { ssr: false });

type AttentionItem={caseId:string;status:string;building:{name:string;address:string}|null;title:string;action:string;href:string;updatedAt:string};
type HomePayload={needsAttention:AttentionItem[];activeCases:unknown[]};
type ViewMode='list'|'map';

const BEDROOMS=[['all','All floor plans'],['0','Studio'],['1','1 bedroom'],['2','2 bedrooms'],['3','3+ bedrooms']] as const;
const FRESHNESS=['All freshness','Recently verified','Needs confirmation','Outdated','Property reply pending'] as const;

function searchableBuilding(building:InventoryBuilding){return [building.name,building.address,building.neighborhood,building.borough,building.management_company,...(building.amenities??[])].filter(Boolean).join(' ').toLowerCase()}

export function AgentHomeBrowser(){
  const [home,setHome]=useState<HomePayload|null>(null);
  const [inventory,setInventory]=useState<AgentInventoryPayload|null>(null);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [bedroom,setBedroom]=useState('all');
  const [freshness,setFreshness]=useState<(typeof FRESHNESS)[number]>('All freshness');
  const [amenity,setAmenity]=useState('All amenities');
  const [view,setView]=useState<ViewMode>('list');
  const [selectedBuilding,setSelectedBuilding]=useState<string|null>(null);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{let active=true;Promise.all([accountFetch<HomePayload>('/api/agent/home'),accountFetch<AgentInventoryPayload>('/api/agent/inventory')]).then(([nextHome,nextInventory])=>{if(active){setHome(nextHome);setInventory(nextInventory)}}).catch(()=>{if(active)setError('Agent Home could not be loaded. Please try again.')});return()=>{active=false}},[]);

  const amenities=useMemo(()=>['All amenities',...new Set((inventory?.buildings??[]).flatMap(item=>item.amenities??[]))].sort((a,b)=>a==='All amenities'?-1:b==='All amenities'?1:a.localeCompare(b)),[inventory]);
  const cards=useMemo(()=>{
    if(!inventory)return[];
    const term=query.trim().toLowerCase();
    return inventory.buildings.map(building=>{
      const snapshots=latestSnapshots(inventory.snapshots.filter(item=>item.building_id===building.id));
      const units=inventory.units.filter(item=>item.building_id===building.id);
      const cases=inventory.cases.filter(item=>item.building_id===building.id);
      const outbox=inventory.outbox.find(item=>item.building_id===building.id);
      const currentFreshness=inventoryFreshness(snapshots[0],Boolean(outbox&&!outbox.reply_received_at&&['draft','approved','queued','sent','manual_required'].includes(outbox.status)));
      return {building,projection:agentBuildingProjection(building),summary:agentInventorySummary(building.id,units,snapshots),snapshots,units,cases,currentFreshness,
        organization:inventory.organizations.find(org=>inventory.propertyAccess.some(access=>access.building_id===building.id&&access.organization_id===org.id)),
        contacts:inventory.contacts.filter(contact=>contact.building_id===building.id&&contact.is_active&&!contact.needs_review)};
    }).filter(item=>{
      if(term&&!searchableBuilding(item.building).includes(term))return false;
      if(amenity!=='All amenities'&&!item.building.amenities?.includes(amenity))return false;
      if(freshness!=='All freshness'&&item.currentFreshness!==freshness)return false;
      if(bedroom!=='all'&&!item.snapshots.some(snapshot=>{const unit=item.units.find(value=>value.id===snapshot.unit_id);return bedroom==='3'?(unit?.bedrooms??-1)>=3:String(unit?.bedrooms)===bedroom}))return false;
      return true;
    });
  },[amenity,bedroom,freshness,inventory,query]);

  async function recommend(snapshot:InventorySnapshot,unit:InventoryUnit|undefined,caseId:string){setBusy(snapshot.id);setNotice('');try{await accountFetch(`/api/agent/cases/${caseId}/recommendations`,{method:'POST',body:JSON.stringify({buildingId:snapshot.building_id,unitId:snapshot.unit_id,unitLabel:unit?.unit_number??unit?.floorplan_name,grossRent:snapshot.rent,netEffectiveRent:snapshot.net_effective_rent,availableDate:snapshot.available_date,leaseTermMonths:unit?.lease_term,concession:snapshot.concession_text,sourceFreshness:snapshot.captured_at})});setNotice(`${unit?.unit_number||unit?.floorplan_name||'Floor plan'} was added to the Rental Case.`)}catch{setNotice('Recommendation was rejected. Confirm the Case and inventory relationship.')}finally{setBusy('')}}

  if(!home||!inventory)return <div className="flex min-h-[60vh] items-center justify-center">{error?<div role="alert" className="max-w-md text-center"><AlertCircle className="mx-auto h-9 w-9 text-destructive"/><p className="mt-3">{error}</p></div>:<div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary"/><p className="mt-3 text-sm text-muted-foreground">Loading authorized Agent inventory…</p></div>}</div>;

  const mapItems=cards.map(item=>({id:item.projection.id,slug:item.projection.slug,name:item.projection.name,address:item.projection.address,neighborhood:item.projection.neighborhood??item.projection.borough,imageUrl:item.projection.hero_image_url??item.projection.hero_image,amenities:item.projection.amenities,availableCount:item.summary.availableCount,bedroomMinimums:item.summary.bedroomMinimums,building:item.projection,inventory:item.summary,latitude:item.projection.latitude,longitude:item.projection.longitude}));

  return <main className="min-h-[calc(100dvh-4rem)] bg-muted/20">
    <section className="border-b bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">NYC Homes Agent Portal</p><h1 className="font-serif text-3xl font-bold">Find the right home for every client</h1></div><Button asChild variant="outline"><Link href="/agent/cases">All Rental Cases</Link></Button></div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label="Needs attention">
          <div className="flex min-w-44 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"><CircleAlert className="h-4 w-4"/>Needs attention <span className="rounded-full bg-white px-2 py-0.5">{home.needsAttention.length}</span></div>
          {home.needsAttention.slice(0,4).map(item=><Link key={item.caseId} href={item.href} className="min-w-[260px] rounded-xl border bg-card px-3 py-2 transition hover:border-primary/40 hover:shadow-sm"><p className="truncate text-sm font-semibold">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.building?.name??'Building review needed'} · {item.action}</p></Link>)}
          {home.needsAttention.length===0&&<p className="rounded-xl border bg-card px-4 py-2 text-sm text-muted-foreground">No assigned Cases need action right now.</p>}
        </div>
      </div>
    </section>

    <section className="border-b bg-white px-4 py-3 shadow-sm sm:px-6" aria-label="Agent building search">
      <div className="mx-auto grid max-w-[1600px] gap-2 lg:grid-cols-[minmax(320px,1fr)_180px_190px_220px_auto]">
        <AISearchInput id="agent-building-search" value={query} onChange={event=>setQuery(event.target.value)} label="Search authorized inventory" placeholder="Building, address, neighborhood, property, or amenity"/>
        <Select label="Floor plan" value={bedroom} onChange={setBedroom} options={BEDROOMS.map(([value,label])=>[value,label])}/>
        <Select label="Freshness" value={freshness} onChange={value=>setFreshness(value as (typeof FRESHNESS)[number])} options={FRESHNESS.map(value=>[value,value])}/>
        <Select label="Amenity" value={amenity} onChange={setAmenity} options={amenities.map(value=>[value,value])}/>
        <div className="flex h-14 rounded-xl border bg-background p-1" role="group" aria-label="Choose list or map view"><Button type="button" size="sm" variant={view==='list'?'default':'ghost'} className="h-full" onClick={()=>setView('list')}><Rows3 className="mr-2 h-4 w-4"/>Browse</Button><Button type="button" size="sm" variant={view==='map'?'default':'ghost'} className="h-full" onClick={()=>setView('map')}><Map className="mr-2 h-4 w-4"/>Map</Button></div>
      </div>
    </section>

    {notice&&<p role="status" className="mx-auto mt-3 max-w-[1600px] rounded-lg border bg-white px-4 py-2 text-sm">{notice}</p>}
    {inventory.state==='no_access'?<State title="You do not currently have access to any buildings." detail="Agent inventory follows assigned Rental Cases and authorized Property relationships."/>:cards.length===0?<State title="No authorized buildings match these filters." detail="Clear a filter or request inventory access through an assigned Rental Case."/>:
    <div className="mx-auto max-w-[1600px] p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{cards.length} authorized buildings</p><p className="text-xs text-muted-foreground">Internal fields remain visible only to assigned Agents.</p></div>
      {view==='map'?<div className="h-[calc(100dvh-15rem)] min-h-[560px] overflow-hidden rounded-2xl border bg-white"><AgentMap buildings={mapItems} selectedBuildingId={selectedBuilding} onBuildingSelect={setSelectedBuilding} onBuildingClose={()=>setSelectedBuilding(null)} className="h-full"/></div>:
      <div className="grid gap-5 xl:grid-cols-2">{cards.map(item=><div key={item.building.id} className="min-w-0">
        <BuildingCard building={item.projection} inventory={item.summary} showSaveAndCompare={false} autoLoadStreetView actions={<div className="mt-auto grid grid-cols-2 gap-2 border-t pt-2.5"><Button asChild variant="outline" className="h-10"><Link href={`/agent/inventory/${item.building.id}`}><Building2 className="mr-2 h-4 w-4"/>View details</Link></Button><Button asChild className="h-10"><Link href={`/agent/property-outreach?case=${item.cases[0]?.id??''}`}><Mail className="mr-2 h-4 w-4"/>Contact leasing</Link></Button></div>}/>
        <details className="group -mt-4 rounded-b-2xl border border-t-0 bg-white px-4 pb-4 pt-6 shadow-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy"><span>Floor plans &amp; units · {item.snapshots.filter(snapshot=>snapshot.inventory_status==='available').length} current</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180"/></summary>
          <div className="grid gap-3 border-t pt-3">
            <div className="grid gap-2 text-xs sm:grid-cols-3"><Metric label="Property" value={item.organization?.name||item.building.management_company||'Not provided'}/><Metric label="Inventory freshness" value={item.currentFreshness}/><Metric label="Property contact" value={item.contacts[0]?.name||item.contacts[0]?.email||'Not provided'}/></div>
            {item.snapshots.filter(snapshot=>snapshot.inventory_status==='available').map(snapshot=>{const unit=item.units.find(value=>value.id===snapshot.unit_id);return <article key={snapshot.id} className="rounded-xl border bg-muted/20 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{unit?.unit_number?`Unit ${unit.unit_number}`:unit?.floorplan_name||'Floor plan'}</p><p className="text-xs text-muted-foreground">{unit?.floorplan_name||unit?.unit_type||'Floor plan not provided'} · {unit?.bedrooms??'—'} bed / {unit?.bathrooms??'—'} bath · {unit?.square_feet?`${unit.square_feet.toLocaleString()} sq ft`:'Size not provided'}</p></div><span className="text-xs font-semibold">{inventoryFreshness(snapshot)}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Metric label="Gross rent" value={money(snapshot.rent)}/><Metric label="Net effective" value={money(snapshot.net_effective_rent)}/><Metric label="Available" value={snapshot.available_date||'Not provided'}/><Metric label="Lease" value={unit?.lease_term?`${unit.lease_term} months`:'Not provided'}/></div>{snapshot.concession_text&&<p className="mt-2 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary">{snapshot.concession_text}</p>}<select aria-label={`Recommend ${unit?.unit_number||unit?.floorplan_name||'unit'}`} className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="" disabled={busy===snapshot.id} onChange={event=>{if(event.target.value)void recommend(snapshot,unit,event.target.value)}}><option value="">Add to Rental Case / Recommend to Tenant…</option>{item.cases.map(caseItem=><option key={caseItem.id} value={caseItem.id}>Case {caseItem.id.slice(0,8)} · {caseItem.status.replaceAll('_',' ')}</option>)}</select></article>})}
            {item.snapshots.filter(snapshot=>snapshot.inventory_status==='available').length===0&&<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No current unit is confirmed. Request the latest availability before recommending.</div>}
            <div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href={`/agent/inventory/${item.building.id}`}><ExternalLink className="mr-2 h-4 w-4"/>Full property detail</Link></Button><Button asChild size="sm" variant="outline"><Link href={`/agent/property-outreach?case=${item.cases[0]?.id??''}`}><Send className="mr-2 h-4 w-4"/>Request latest availability</Link></Button></div>
          </div>
        </details>
      </div>)}</div>}
    </div>}
  </main>
}

function Select({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:(readonly [string,string])[]}){return <label className="relative grid h-14 content-center rounded-xl border bg-background px-3 pt-3 text-xs text-muted-foreground"><span className="absolute left-3 top-1.5">{label}</span><select value={value} onChange={event=>onChange(event.target.value)} className="h-8 appearance-none bg-transparent pt-1 text-sm font-medium text-foreground outline-none"><>{options.map(([option,labelText])=><option key={option} value={option}>{labelText}</option>)}</></select><ChevronDown className="pointer-events-none absolute right-3 top-5 h-4 w-4 text-foreground"/></label>}
function Metric({label,value}:{label:string;value:string}){return <div className="min-w-0 rounded-lg bg-muted/50 px-2.5 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 truncate font-medium" title={value}>{value}</p></div>}
function State({title,detail}:{title:string;detail:string}){return <div className="mx-auto flex min-h-[45vh] max-w-lg flex-col items-center justify-center px-6 text-center"><CalendarDays className="h-9 w-9 text-primary"/><h2 className="mt-3 font-serif text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>}

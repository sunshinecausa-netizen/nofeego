'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CalendarDays, ChevronDown, CircleAlert, ExternalLink, Mail, RefreshCw, Search, Send, SlidersHorizontal } from 'lucide-react';
import { AISearchInput } from '@/components/ai-search-input';
import { BATHROOM_OPTIONS, BEDROOM_OPTIONS, BOROUGHS, MOVE_IN_OPTIONS, MultiSelectMenu, PRICE_RANGES } from '@/components/building-browser';
import { BuildingBrowseFrame } from '@/components/building-browse-frame';
import { BuildingCard } from '@/components/building-result-card';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
const FRESHNESS=['All freshness','Recently verified','Needs confirmation','Outdated','Property reply pending'] as const;

function searchableBuilding(building:InventoryBuilding){return [building.name,building.address,building.neighborhood,building.borough,building.management_company,...(building.amenities??[])].filter(Boolean).join(' ').toLowerCase()}

export function AgentHomeBrowser(){
  const [home,setHome]=useState<HomePayload|null>(null);
  const [inventory,setInventory]=useState<AgentInventoryPayload|null>(null);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [priceRanges,setPriceRanges]=useState<string[]>([]);
  const [bedrooms,setBedrooms]=useState<string[]>([]);
  const [bathrooms,setBathrooms]=useState<string[]>([]);
  const [moveInFlex,setMoveInFlex]=useState<string[]>([]);
  const [boroughs,setBoroughs]=useState<string[]>([]);
  const [selectedAmenities,setSelectedAmenities]=useState<string[]>([]);
  const [freshness,setFreshness]=useState<string[]>([]);
  const [view,setView]=useState<'list'|'map'>('list');
  const [selectedBuilding,setSelectedBuilding]=useState<string|null>(null);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{let active=true;Promise.all([accountFetch<HomePayload>('/api/agent/home'),accountFetch<AgentInventoryPayload>('/api/agent/inventory')]).then(([nextHome,nextInventory])=>{if(active){setHome(nextHome);setInventory(nextInventory)}}).catch((reason:unknown)=>{if(!active)return;const code=reason instanceof Error?reason.message:'ACCOUNT_REQUEST_FAILED';if(code==='AUTH_REQUIRED'){window.location.replace('/agent/sign-in?next=%2Fagent');return}setError(code==='AGENT_REQUIRED'?'Your account does not have active Agent access.':'Agent Home could not be loaded. Please try again.')});return()=>{active=false}},[]);

  const amenities=useMemo(()=>[...new Set((inventory?.buildings??[]).flatMap(item=>item.amenities??[]))].sort((a,b)=>a.localeCompare(b)),[inventory]);
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
      if(boroughs.length&&!boroughs.includes(item.building.borough??''))return false;
      if(selectedAmenities.length&&!selectedAmenities.every(value=>item.building.amenities?.includes(value)))return false;
      if(freshness.length&&!freshness.includes(item.currentFreshness))return false;
      if(bedrooms.length&&!item.snapshots.some(snapshot=>{const unit=item.units.find(value=>value.id===snapshot.unit_id);return bedrooms.some(value=>value==='4'?(unit?.bedrooms??-1)>=3:String(unit?.bedrooms)===value)}))return false;
      if(bathrooms.length&&!item.snapshots.some(snapshot=>{const unit=item.units.find(value=>value.id===snapshot.unit_id);return bathrooms.some(value=>value==='4'?(unit?.bathrooms??-1)>=3:String(Math.floor(unit?.bathrooms??-1))===value)}))return false;
      if(priceRanges.length&&!item.snapshots.some(snapshot=>snapshot.rent!=null&&priceRanges.some(range=>{if(range==='10000-plus')return snapshot.rent!>=10000;const [min,max]=range.split('-').map(Number);return snapshot.rent!>=min&&snapshot.rent!<max})))return false;
      if(moveInFlex.length&&!item.snapshots.some(snapshot=>Boolean(snapshot.available_date)))return false;
      return true;
    });
  },[bathrooms,bedrooms,boroughs,freshness,inventory,moveInFlex,priceRanges,query,selectedAmenities]);

  async function recommend(snapshot:InventorySnapshot,unit:InventoryUnit|undefined,caseId:string){setBusy(snapshot.id);setNotice('');try{await accountFetch(`/api/agent/cases/${caseId}/recommendations`,{method:'POST',body:JSON.stringify({buildingId:snapshot.building_id,unitId:snapshot.unit_id,unitLabel:unit?.unit_number??unit?.floorplan_name,grossRent:snapshot.rent,netEffectiveRent:snapshot.net_effective_rent,availableDate:snapshot.available_date,leaseTermMonths:unit?.lease_term,concession:snapshot.concession_text,sourceFreshness:snapshot.captured_at})});setNotice(`${unit?.unit_number||unit?.floorplan_name||'Floor plan'} was added to the Rental Case.`)}catch{setNotice('Recommendation was rejected. Confirm the Case and inventory relationship.')}finally{setBusy('')}}

  if(!home||!inventory)return <div className="flex min-h-[60vh] items-center justify-center">{error?<div role="alert" className="max-w-md text-center"><AlertCircle className="mx-auto h-9 w-9 text-destructive"/><p className="mt-3">{error}</p></div>:<div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary"/><p className="mt-3 text-sm text-muted-foreground">Loading authorized Agent inventory…</p></div>}</div>;

  const mapItems=cards.map(item=>({id:item.projection.id,slug:item.projection.slug,name:item.projection.name,address:item.projection.address,neighborhood:item.projection.neighborhood??item.projection.borough,imageUrl:item.projection.hero_image_url??item.projection.hero_image,amenities:item.projection.amenities,availableCount:item.summary.availableCount,bedroomMinimums:item.summary.bedroomMinimums,building:item.projection,inventory:item.summary,latitude:item.projection.latitude,longitude:item.projection.longitude}));

  const toggle=(setter:React.Dispatch<React.SetStateAction<string[]>>,value:string,checked:boolean)=>setter(current=>checked?[...current,value]:current.filter(item=>item!==value));
  const filterPanel=<form role="search" className="border-y border-border bg-white px-3 py-3 shadow-sm sm:px-5" onSubmit={event=>event.preventDefault()}>
    <div className="grid gap-2">
      <AISearchInput id="agent-building-search" value={query} onChange={event=>setQuery(event.target.value)} label="AI Search" placeholder="Enter a building, address, neighborhood, or what you are looking for"/>
      <div className="flex min-w-0 flex-wrap items-end gap-2 xl:flex-nowrap">
        <MultiSelectMenu label="Price" options={PRICE_RANGES} selected={priceRanges} onToggle={(value,checked)=>toggle(setPriceRanges,value,checked)}/>
        <MultiSelectMenu label="Beds" options={BEDROOM_OPTIONS} selected={bedrooms} onToggle={(value,checked)=>toggle(setBedrooms,value,checked)}/>
        <MultiSelectMenu label="Bath" options={BATHROOM_OPTIONS} selected={bathrooms} onToggle={(value,checked)=>toggle(setBathrooms,value,checked)}/>
        <MultiSelectMenu label="Move-in Date" options={MOVE_IN_OPTIONS} selected={moveInFlex} onToggle={(value,checked)=>toggle(setMoveInFlex,value,checked)} truncateLabel/>
        <MultiSelectMenu label="Borough & Neighborhood" options={BOROUGHS.map(value=>[value,value] as const)} selected={boroughs} onToggle={(value,checked)=>toggle(setBoroughs,value,checked)} truncateLabel/>
        <details className="group relative min-w-[112px] flex-1">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm"><SlidersHorizontal className="h-4 w-4 text-primary"/>Filters{selectedAmenities.length+freshness.length>0?` (${selectedAmenities.length+freshness.length})`:''}<ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180"/></summary>
          <div className="absolute right-0 z-50 mt-2 max-h-[60vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-white p-4 shadow-xl">
            <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Inventory freshness</legend><div className="grid sm:grid-cols-2">{FRESHNESS.slice(1).map(value=><label key={value} className="flex min-h-10 items-center gap-2 px-2 text-sm"><Checkbox checked={freshness.includes(value)} onCheckedChange={checked=>toggle(setFreshness,value,checked===true)}/>{value}</label>)}</div></fieldset>
            <fieldset className="mt-3 border-t pt-3"><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Amenities</legend><div className="grid sm:grid-cols-2">{amenities.map(value=><label key={value} className="flex min-h-10 items-center gap-2 px-2 text-sm"><Checkbox checked={selectedAmenities.includes(value)} onCheckedChange={checked=>toggle(setSelectedAmenities,value,checked===true)}/>{value}</label>)}</div></fieldset>
          </div>
        </details>
        <Button type="submit" className="h-10 min-w-[132px]"><Search className="mr-2 h-5 w-5"/>Search</Button>
      </div>
    </div>
  </form>;
  const attention=<section className="shrink-0 border-b bg-white px-3 py-2 sm:px-5" aria-label="Needs attention"><div className="flex items-center gap-2 overflow-x-auto">
    <Link href="/agent/cases" className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-950"><CircleAlert className="h-4 w-4"/>Needs attention <span className="rounded-full bg-white px-2 py-0.5">{home.needsAttention.length}</span></Link>
    {home.needsAttention.slice(0,3).map(item=><Link key={item.caseId} href={item.href} className="min-w-[240px] rounded-lg border bg-card px-3 py-1.5 hover:border-primary/40"><p className="truncate text-sm font-semibold">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.building?.name??'Building review needed'} · {item.action}</p></Link>)}
    {home.needsAttention.length===0&&<p className="text-sm text-muted-foreground">No assigned Cases need action right now.</p>}
  </div></section>;
  const listContent=inventory.state==='no_access'?<State title="You do not currently have access to any buildings." detail="Agent inventory follows assigned Rental Cases and authorized Property relationships."/>:cards.length===0?<State title="No authorized buildings match these filters." detail="Clear a filter or request inventory access through an assigned Rental Case."/>:<><div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2">{cards.map(item=><div key={item.building.id} className="min-w-0">
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
      </div>)}</div><Footer embedded/></>;
  return <BuildingBrowseFrame mobileView={view} onMobileViewChange={setView} notice={<>{attention}{notice&&<p role="status" className="border-b bg-white px-4 py-2 text-sm">{notice}</p>}</>} filters={filterPanel} resultCount={<div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{cards.length} results</p><p className="hidden text-xs text-muted-foreground sm:block">Authorized Agent inventory</p></div>} list={listContent} map={<AgentMap buildings={mapItems} selectedBuildingId={selectedBuilding} onBuildingSelect={setSelectedBuilding} onBuildingClose={()=>setSelectedBuilding(null)} className="h-full min-h-0 rounded-none border-0"/>}/>;
}

function Metric({label,value}:{label:string;value:string}){return <div className="min-w-0 rounded-lg bg-muted/50 px-2.5 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 truncate font-medium" title={value}>{value}</p></div>}
function State({title,detail}:{title:string;detail:string}){return <div className="mx-auto flex min-h-[45vh] max-w-lg flex-col items-center justify-center px-6 text-center"><CalendarDays className="h-9 w-9 text-primary"/><h2 className="mt-3 font-serif text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>}

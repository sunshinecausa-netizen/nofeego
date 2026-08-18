'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CalendarDays, ChevronDown, CircleAlert, RefreshCw, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { AISearchInput } from '@/components/ai-search-input';
import { BATHROOM_OPTIONS, BEDROOM_OPTIONS, BOROUGHS, MOVE_IN_OPTIONS, MultiSelectMenu, PRICE_RANGES } from '@/components/building-browser';
import { AgentBuildingBrowseFrame } from '@/app/agent/_components/agent-building-browse-frame';
import { AgentBuildingCard } from '@/app/agent/_components/agent-building-card';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { accountFetch } from '@/lib/account/client';
import {
  type AgentInventoryPayload,
  agentInventorySummary,
  currentAvailableSnapshots,
  combinePublicCatalogWithInventoryAccess,
  inventoryFreshness,
  latestSnapshots,
  money,
} from '@/lib/agent-inventory';
import type { BuildingsPageResult } from '@/lib/public-buildings';

const AgentMap = dynamic(() => import('@/components/building-map').then((module) => module.BuildingMap), { ssr: false });

type AttentionItem={caseId:string;status:string;building:{name:string;address:string}|null;title:string;action:string;href:string;updatedAt:string};
type HomePayload={needsAttention:AttentionItem[];activeCases:unknown[]};
const FRESHNESS=['All freshness','Current','Aging','Stale'] as const;

export function AgentHomeBrowser(){
  const [home,setHome]=useState<HomePayload|null>(null);
  const [inventory,setInventory]=useState<AgentInventoryPayload|null>(null);
  const [catalog,setCatalog]=useState<BuildingsPageResult|null>(null);
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

  useEffect(()=>{let active=true;Promise.all([accountFetch<HomePayload>('/api/agent/home'),accountFetch<AgentInventoryPayload>('/api/agent/inventory')]).then(([nextHome,nextInventory])=>{if(active){setHome(nextHome);setInventory(nextInventory)}}).catch((reason:unknown)=>{if(!active)return;const code=reason instanceof Error?reason.message:'ACCOUNT_REQUEST_FAILED';if(code==='AUTH_REQUIRED'){window.location.replace('/agent/sign-in?next=%2Fagent');return}setError(code==='AGENT_REQUIRED'?'Your account does not have active Agent access.':'Agent Home could not be loaded. Please try again.')});return()=>{active=false}},[]);

  useEffect(()=>{const controller=new AbortController();const timer=window.setTimeout(async()=>{const params=new URLSearchParams();if(new URLSearchParams(window.location.search).get('publicSnapshot')==='production_public_snapshot')params.set('publicSnapshot','production_public_snapshot');if(query.trim())params.set('q',query.trim());priceRanges.forEach(value=>params.append('price',value));bedrooms.forEach(value=>params.append('bedrooms',value));bathrooms.forEach(value=>params.append('bathrooms',value));moveInFlex.forEach(value=>params.append('moveInFlex',value));boroughs.forEach(value=>params.append('borough',value));selectedAmenities.forEach(value=>params.append('amenity',value));try{setCatalog(await accountFetch<BuildingsPageResult>(`/api/agent/catalog?${params}`,{signal:controller.signal}))}catch(reason){if((reason as Error).name!=='AbortError')setError('The Building Catalog could not be loaded. Please try again.')}},200);return()=>{window.clearTimeout(timer);controller.abort()}},[bathrooms,bedrooms,boroughs,moveInFlex,priceRanges,query,selectedAmenities]);

  const amenities=useMemo(()=>[...new Set((catalog?.buildings??[]).flatMap(item=>item.amenities??[]))].sort((a,b)=>a.localeCompare(b)),[catalog]);
  const cards=useMemo(()=>{
    if(!inventory||!catalog)return[];
    return combinePublicCatalogWithInventoryAccess(catalog.buildings,inventory.buildings).map(({building,hasInventoryAccess})=>{
      const authorizedBuilding=hasInventoryAccess?inventory.buildings.find(item=>item.id===building.id):undefined;
      const snapshots=authorizedBuilding?latestSnapshots(inventory.snapshots.filter(item=>item.building_id===building.id)):[];
      const units=authorizedBuilding?inventory.units.filter(item=>item.building_id===building.id):[];
      const currentFreshness=inventoryFreshness(snapshots[0]);
      return {building,projection:building,summary:authorizedBuilding?agentInventorySummary(building.id,units,snapshots):catalog.inventoryByBuilding[building.id],snapshots,units,currentFreshness,authorized:Boolean(authorizedBuilding),
        organization:inventory.organizations.find(org=>org.building_id===building.id),
        contacts:inventory.contacts.filter(contact=>contact.building_id===building.id&&contact.is_active&&!contact.needs_review)};
    }).filter(item=>{
      if(freshness.length&&(!item.authorized||!freshness.includes(item.currentFreshness)))return false;
      return true;
    });
  },[catalog,freshness,inventory]);

  if(!home||!inventory||!catalog)return <div className="flex min-h-[60vh] items-center justify-center">{error?<div role="alert" className="max-w-md text-center"><AlertCircle className="mx-auto h-9 w-9 text-destructive"/><p className="mt-3">{error}</p></div>:<div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary"/><p className="mt-3 text-sm text-muted-foreground">Loading the Building Catalog…</p></div>}</div>;

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
  const listContent=cards.length===0?<State title="No buildings match these filters." detail="Clear one or more filters to return to the complete public Building Catalog."/>:<><div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2">{cards.map(item=>{const currentSnapshots=currentAvailableSnapshots(item.snapshots);const gross=currentSnapshots.flatMap(snapshot=>snapshot.rent==null?[]:[snapshot.rent]);const dates=currentSnapshots.flatMap(snapshot=>snapshot.available_date?[snapshot.available_date]:[]).sort();const verified=item.snapshots[0]?.captured_at;return <div key={item.building.id} className="min-w-0">
    <AgentBuildingCard building={item.projection} inventory={item.summary} actions={item.authorized?<div className="space-y-2"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800"><ShieldCheck className="h-4 w-4"/>Authorized Agent Inventory</div><div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Metric label="Availability" value={`${currentSnapshots.length} units available`}/><Metric label="Gross rent" value={gross.length?`From ${money(Math.min(...gross))}`:'Not provided'}/><Metric label="Earliest" value={dates[0]||'Not provided'}/><Metric label="Freshness" value={`${item.currentFreshness}${verified?` · ${new Date(verified).toLocaleDateString()}`:''}`}/></div><Button asChild className="h-10 w-full"><Link href={`/agent/inventory/${item.building.id}`}><Building2 className="mr-2 h-4 w-4"/>View authorized availability</Link></Button></div>:<Button asChild variant="outline" className="h-10 w-full"><Link href={`/buildings/${item.building.slug}`}><Building2 className="mr-2 h-4 w-4"/>View public details</Link></Button>}/>
  </div>})}</div><Footer embedded/></>;
  return <AgentBuildingBrowseFrame mobileView={view} onMobileViewChange={setView} notice={attention} filters={filterPanel} resultCount={<div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{cards.length} results</p><p className="hidden text-xs text-muted-foreground sm:block">{inventory.buildings.length} with authorized Inventory · {cards.filter(item=>item.projection.latitude!=null&&item.projection.longitude!=null).length} mapped locations</p></div>} list={listContent} map={<AgentMap buildings={mapItems} selectedBuildingId={selectedBuilding} onBuildingSelect={setSelectedBuilding} onBuildingClose={()=>setSelectedBuilding(null)} className="h-full min-h-0 rounded-none border-0"/>}/>;
}

function Metric({label,value}:{label:string;value:string}){return <div className="min-w-0 rounded-lg bg-muted/50 px-2.5 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 truncate font-medium" title={value}>{value}</p></div>}
function State({title,detail}:{title:string;detail:string}){return <div className="mx-auto flex min-h-[45vh] max-w-lg flex-col items-center justify-center px-6 text-center"><CalendarDays className="h-9 w-9 text-primary"/><h2 className="mt-3 font-serif text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, RefreshCw, SearchX } from 'lucide-react';
import { accountFetch } from '@/lib/account/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentInventoryPayload, dateTime, inventoryFreshness, latestSnapshots, money } from '@/lib/agent-inventory';

function freshnessClass(label:string){if(label==='Recently verified')return 'bg-emerald-100 text-emerald-900';if(label==='Outdated')return 'bg-red-100 text-red-900';return 'bg-amber-100 text-amber-900'}

export default function AgentInventoryPage(){
  const [data,setData]=useState<AgentInventoryPayload|null>(null);
  const [query,setQuery]=useState('');
  const [error,setError]=useState<'permission'|'service'|''>('');
  const [loading,setLoading]=useState(true);
  const load=()=>{setLoading(true);setError('');accountFetch<AgentInventoryPayload>('/api/agent/inventory').then(setData).catch((reason:Error)=>setError(reason.message.includes('FORBIDDEN')||reason.message.includes('AGENT_REQUIRED')?'permission':'service')).finally(()=>setLoading(false))};
  useEffect(()=>{accountFetch<AgentInventoryPayload>('/api/agent/inventory').then(setData).catch((reason:Error)=>setError(reason.message.includes('FORBIDDEN')||reason.message.includes('AGENT_REQUIRED')?'permission':'service')).finally(()=>setLoading(false))},[]);
  const summaries=useMemo(()=>{
    if(!data)return [];
    const latest=latestSnapshots(data.snapshots);
    return data.buildings.map(building=>{
      const units=data.units.filter(unit=>unit.building_id===building.id);
      const snapshots=latest.filter(snapshot=>snapshot.building_id===building.id&&snapshot.inventory_status==='available');
      const searchable=`${building.name} ${building.address} ${units.map(unit=>unit.unit_number).join(' ')}`.toLowerCase();
      const rents=snapshots.map(item=>item.rent).filter((value):value is number=>value!=null);
      const netRents=snapshots.map(item=>item.net_effective_rent).filter((value):value is number=>value!=null);
      const moveIns=snapshots.map(item=>item.available_date).filter((value):value is string=>Boolean(value)).sort();
      const concessions=[...new Set(snapshots.map(item=>item.concession_text).filter((value):value is string=>Boolean(value)))];
      const source=data.sources.find(item=>item.building_id===building.id);
      const organizationId=data.propertyAccess.find(item=>item.building_id===building.id)?.organization_id;
      const organization=data.organizations.find(item=>item.id===organizationId);
      const cases=data.cases.filter(item=>item.building_id===building.id);
      const outbox=data.outbox.find(item=>item.building_id===building.id);
      const replyPending=Boolean(outbox&&['approved','queued','sent','simulated_sent'].includes(outbox.status));
      return {building,units,snapshots,searchable,rents,netRents,moveIns,concessions,source,organization,cases,outbox,freshness:inventoryFreshness(snapshots[0],replyPending)};
    }).filter(item=>!query||item.searchable.includes(query.toLowerCase()));
  },[data,query]);

  return <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">NYC Homes Agent Portal</p><h1 className="mt-1 font-serif text-3xl font-bold">Agent Inventory</h1><p className="mt-2 text-muted-foreground">Canonical availability for Buildings connected to your assigned Rental Cases. Outdated data is never presented as live.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div><Input className="mt-6 max-w-xl" placeholder="Search Building, address, or unit" value={query} onChange={event=>setQuery(event.target.value)}/>
    {loading&&<State icon={<Loader2 className="animate-spin"/>} title="Loading authorized inventory…"/>}
    {!loading&&error==='permission'&&<State title="You do not have permission to view this inventory." action={<Button variant="outline" asChild><Link href="/agent">Return to Agent Portal</Link></Button>}/>}
    {!loading&&error==='service'&&<State title="Inventory could not be loaded. Please try again." action={<Button onClick={load}>Try again</Button>}/>}
    {!loading&&!error&&data?.state==='no_access'&&<State title="You do not currently have access to any buildings." detail="Building visibility follows your assigned Rental Cases." action={<Button variant="outline" asChild><Link href="/agent">Contact administrator</Link></Button>}/>}
    {!loading&&!error&&data?.state==='no_inventory'&&<State title="No inventory is available in this Preview yet." action={<Button onClick={load}>Check preview data</Button>}/>}
    {!loading&&!error&&data?.state==='ready'&&summaries.length===0&&<State icon={<SearchX/>} title="No buildings or units match your search." action={<Button variant="outline" onClick={()=>setQuery('')}>Clear search</Button>}/>}
    {!loading&&!error&&summaries.length>0&&<div className="mt-6 grid gap-4 xl:grid-cols-2">{summaries.map(item=><article key={item.building.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-xl font-bold">{item.building.name}</h2><p className="text-sm text-muted-foreground">{item.building.address}</p><p className="text-sm text-muted-foreground">{item.building.neighborhood||'Neighborhood not provided'} · {item.building.borough||'Borough not provided'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${freshnessClass(item.freshness)}`}>{item.freshness}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><Metric label="Property" value={item.organization?.name||item.building.management_company||'Not provided'}/><Metric label="Available units" value={String(item.snapshots.length)}/><Metric label="Gross rent" value={item.rents.length?`${money(Math.min(...item.rents))}–${money(Math.max(...item.rents))}`:'Not provided'}/><Metric label="Net effective" value={item.netRents.length?`${money(Math.min(...item.netRents))}–${money(Math.max(...item.netRents))}`:'Not provided'}/><Metric label="Earliest move-in" value={item.moveIns[0]||'Not provided'}/><Metric label="Rental Cases" value={String(item.cases.length)}/></div><p className="mt-4 text-sm"><span className="font-semibold">Concessions:</span> {item.concessions.join(' · ')||'No verified concession'}</p><p className="mt-1 text-xs text-muted-foreground">Last verified {dateTime(item.snapshots[0]?.captured_at||item.source?.last_verified_at)} · Source {item.source?.source_name||item.source?.source_type||'Not provided'} · Outreach {item.outbox?.status.replaceAll('_',' ')||'none'}</p>{item.snapshots.length===0&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This building does not have current availability data.</p>}<div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href={`/agent/inventory/${item.building.id}`}>View details</Link></Button><Button asChild variant="outline"><Link href={`/agent/inventory/${item.building.id}#availability`}>Add to rental case</Link></Button><Button asChild variant="outline"><Link href={`/agent/inventory/${item.building.id}#availability`}>Recommend to tenant</Link></Button><Button asChild variant="outline"><Link href={`/agent/property-outreach?case=${item.cases[0]?.id??''}`}>Request latest availability</Link></Button></div></article>)}</div>}
  </main>;
}

function Metric({label,value}:{label:string;value:string}){return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>}
function State({icon,title,detail,action}:{icon?:React.ReactNode;title:string;detail?:string;action?:React.ReactNode}){return <div className="mt-8 rounded-2xl border border-dashed p-10 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center text-primary">{icon??<Building2/>}</div><p className="mt-3 font-semibold">{title}</p>{detail&&<p className="mt-1 text-sm text-muted-foreground">{detail}</p>}{action&&<div className="mt-4">{action}</div>}</div>}

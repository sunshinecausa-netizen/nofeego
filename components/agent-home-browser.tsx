'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, CircleAlert, Clipboard, ExternalLink, Mail, Phone } from 'lucide-react';
import { BuildingBrowser, type BuildingBrowserCardProps } from '@/components/building-browser';
import { BuildingCard } from '@/components/building-result-card';
import { Button } from '@/components/ui/button';
import { accountFetch } from '@/lib/account/client';
import { type AgentInventoryPayload, type InventoryContact, currentAvailableSnapshots, floorPlanAvailability, inventoryFreshness, latestSnapshots, money } from '@/lib/agent-inventory';
import type { BuildingFilters, BuildingsPageResult } from '@/lib/public-buildings';

type AttentionItem = { caseId:string; building:{name:string;address:string}|null; title:string; action:string; href:string };
type HomePayload = { needsAttention:AttentionItem[]; activeCases:unknown[] };
type Props = { initialPage:number; initialFilters:BuildingFilters; initialResult:BuildingsPageResult; initialError?:string|null; publicSnapshot?:string };

export function AgentHomeBrowser({ initialPage, initialFilters, initialResult, initialError = null, publicSnapshot }: Props) {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [inventory, setInventory] = useState<AgentInventoryPayload | null>(null);
  const [privateError, setPrivateError] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([accountFetch<HomePayload>('/api/agent/home'), accountFetch<AgentInventoryPayload>('/api/agent/inventory')]).then(([nextHome, nextInventory]) => {
      if (!active) return;
      setHome(nextHome);
      setInventory(nextInventory);
    }).catch((reason: unknown) => {
      if (!active) return;
      const code = reason instanceof Error ? reason.message : 'ACCOUNT_REQUEST_FAILED';
      if (code === 'AUTH_REQUIRED') {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/agent/sign-in?next=${encodeURIComponent(next)}`);
        return;
      }
      setPrivateError(code === 'AGENT_REQUIRED' ? 'This account does not have active Agent access.' : 'Authorized inventory is temporarily unavailable.');
    });
    return () => { active = false; };
  }, []);

  const inventoryByBuilding = useMemo(() => new Map((inventory?.buildings ?? []).map((building) => [building.id, building])), [inventory]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopyNotice(`${label} copied.`);
  }

  function renderAgentCard(card: BuildingBrowserCardProps) {
    const authorizedBuilding = inventoryByBuilding.get(card.building.id);
    if (!authorizedBuilding || !inventory) return <BuildingCard {...card} autoLoadStreetView />;

    const units = inventory.units.filter((unit) => unit.building_id === card.building.id);
    const snapshots = latestSnapshots(inventory.snapshots.filter((snapshot) => snapshot.building_id === card.building.id));
    const currentSnapshots = currentAvailableSnapshots(snapshots);
    const sources = inventory.sources.filter((source) => source.building_id === card.building.id);
    const plans = floorPlanAvailability(units, snapshots, sources);
    const contacts = inventory.contacts.filter((contact) => contact.building_id === card.building.id && contact.is_active && !contact.needs_review);
    const primaryContact = contacts[0];
    const organization = inventory.organizations.find((item) => item.building_id === card.building.id);
    const application = inventory.applications.find((item) => item.building_id === card.building.id);
    const propertyWebsite = authorizedBuilding.official_building_website ?? organization?.website ?? organization?.leasing_office_website ?? primaryContact?.website;
    const newestSnapshot = [...snapshots].sort((a, b) => b.captured_at.localeCompare(a.captured_at))[0];

    return <div className="space-y-0">
      <BuildingCard {...card} autoLoadStreetView />
      <section className="-mt-4 rounded-b-2xl border border-t-0 bg-white px-4 pb-4 pt-7 shadow-sm" aria-label={`Authorized inventory for ${card.building.name}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"><Building2 className="mr-1.5 h-3.5 w-3.5" />Authorized Agent Inventory</span><span className="text-xs font-semibold text-muted-foreground">{currentSnapshots.length} available · {inventoryFreshness(newestSnapshot)}</span></div>
        <details className="group mt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg border px-3 text-sm font-semibold text-navy">View authorized availability<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="mt-3 grid gap-3 border-t pt-3">
            {plans.map((plan) => <article key={plan.key} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{plan.label}</p><span className="text-xs font-semibold">{plan.availableUnits} available</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Metric label="Gross rent" value={plan.grossMin == null ? 'Not provided' : plan.grossMin === plan.grossMax ? money(plan.grossMin) : `${money(plan.grossMin)}–${money(plan.grossMax)}`} /><Metric label="Net effective" value={plan.netMin == null ? 'Not provided' : `From ${money(plan.netMin)}`} /><Metric label="Available date" value={plan.earliestAvailableDate ?? 'Not provided'} /><Metric label="Lease term" value={plan.leaseTerms.length ? plan.leaseTerms.map((value) => `${value} months`).join(', ') : 'Not provided'} /></div><p className="mt-2 text-xs text-muted-foreground">{plan.concessions.join(' · ') || 'No verified concession'} · {plan.freshness} · Last verified {formatDate(plan.lastVerified)}</p></article>)}
            {snapshots.filter((snapshot) => snapshot.inventory_status === 'available').map((snapshot) => { const unit = units.find((item) => item.id === snapshot.unit_id); return <article key={snapshot.id} className="rounded-xl border bg-muted/20 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{unit?.unit_number ? `Unit ${unit.unit_number}` : unit?.floorplan_name ?? 'Floor plan'}</p><p className="text-xs text-muted-foreground">{unit?.floorplan_name ?? unit?.unit_type ?? 'Floor plan not provided'} · {unit?.bedrooms ?? '—'} bed / {unit?.bathrooms ?? '—'} bath</p></div><span className="text-xs font-semibold">{inventoryFreshness(snapshot)}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Metric label="Gross rent" value={money(snapshot.rent)} /><Metric label="Net effective" value={money(snapshot.net_effective_rent)} /><Metric label="Available date" value={snapshot.available_date ?? 'Not provided'} /><Metric label="Lease term" value={unit?.lease_term ? `${unit.lease_term} months` : 'Not provided'} /></div>{snapshot.concession_text && <p className="mt-2 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary">{snapshot.concession_text}</p>}<p className="mt-2 text-xs text-muted-foreground">Last verified {formatDate(snapshot.captured_at)}</p></article>; })}
            {snapshots.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No authorized availability is currently recorded for this Building.</p>}
            <PropertyContactPanel buildingName={card.building.name} managementCompany={authorizedBuilding.management_company} organizationName={organization?.name} propertyWebsite={propertyWebsite} applicationWebsite={application?.application_url} contact={primaryContact} onCopy={copy} />
            <Button asChild variant="outline"><Link href={`/agent/inventory/${card.building.id}`}>Open full authorized inventory</Link></Button>
          </div>
        </details>
      </section>
    </div>;
  }

  const attention = <section className="shrink-0 border-b bg-white px-3 py-2 sm:px-5" aria-label="Rental Cases needing attention"><div className="flex min-h-10 items-center gap-2 overflow-x-auto"><Link href="/agent/cases" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"><CircleAlert className="h-4 w-4" />Rental Cases needing attention <span className="rounded-full bg-white px-2 py-0.5">{home?.needsAttention.length ?? '—'}</span></Link>{home?.needsAttention.slice(0, 2).map((item) => <Link key={item.caseId} href={item.href} className="min-w-56 rounded-lg border px-3 py-1.5"><p className="truncate text-sm font-semibold">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.building?.name ?? 'Building review needed'} · {item.action}</p></Link>)}{privateError && <p role="status" className="text-sm text-destructive">{privateError}</p>}{copyNotice && <p role="status" className="text-sm text-muted-foreground">{copyNotice}</p>}</div></section>;

  return <BuildingBrowser key={JSON.stringify({ initialPage, initialFilters, publicSnapshot })} initialPage={initialPage} initialFilters={initialFilters} initialResult={initialResult} initialError={initialError} mode="buildings" routeBase="/agent" persistentParams={publicSnapshot ? { publicSnapshot } : undefined} notice={attention} renderCard={renderAgentCard} />;
}

function PropertyContactPanel({ buildingName, managementCompany, organizationName, propertyWebsite, applicationWebsite, contact, onCopy }: { buildingName:string; managementCompany:string|null; organizationName?:string; propertyWebsite:string|null; applicationWebsite:string|null|undefined; contact?:InventoryContact; onCopy:(value:string,label:string)=>Promise<void> }) {
  return <section className="rounded-xl border bg-muted/20 p-3" aria-label={`Verified property contacts for ${buildingName}`}><p className="text-xs font-bold uppercase tracking-wide text-primary">Verified property information</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><Metric label="Property / Management" value={managementCompany ?? organizationName ?? 'Not provided'} /><Metric label="Leasing Team" value={organizationName ?? contact?.name ?? 'Not provided'} /><Metric label="Leasing email" value={contact?.email ?? 'Not provided'} /><Metric label="Leasing phone" value={contact?.phone ?? 'Not provided'} /><Metric label="Contact verified" value={formatDate(contact?.last_verified_at)} /><Metric label="Application website" value={applicationWebsite ? 'Available' : 'Not provided'} /></div><div className="mt-3 grid grid-cols-2 gap-2">{propertyWebsite && <Button asChild size="sm" variant="outline"><a href={propertyWebsite} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />Visit property website</a></Button>}{applicationWebsite && <Button asChild size="sm" variant="outline"><a href={applicationWebsite} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />Application website</a></Button>}{contact?.email && <><Button asChild size="sm" variant="outline"><a href={`mailto:${contact.email}`}><Mail className="mr-1.5 h-4 w-4" />Email leasing</a></Button><Button type="button" size="sm" variant="outline" onClick={() => void onCopy(contact.email!, 'Email')}><Clipboard className="mr-1.5 h-4 w-4" />Copy email</Button></>}{contact?.phone && <><Button asChild size="sm" variant="outline"><a href={`tel:${contact.phone}`}><Phone className="mr-1.5 h-4 w-4" />Call leasing</a></Button><Button type="button" size="sm" variant="outline" onClick={() => void onCopy(contact.phone!, 'Phone')}><Clipboard className="mr-1.5 h-4 w-4" />Copy phone</Button></>}</div></section>;
}

function formatDate(value:string|null|undefined) { return value ? new Date(value).toLocaleString() : 'Not provided'; }
function Metric({ label, value }:{ label:string; value:string }) { return <div className="min-w-0 rounded-lg bg-white px-2.5 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 break-words font-medium">{value}</p></div>; }

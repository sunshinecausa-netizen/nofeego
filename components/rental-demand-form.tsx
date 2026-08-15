'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { accountFetch } from '@/lib/account/client';

export type RentalDemandContext = { buildingId: string; buildingSlug: string; buildingName: string; neighborhood: string; address: string; unitId?: string; floorPlan?: string; preferredUnitType?: string; startingPrice?: string };
type Draft = { name: string; email: string; phone: string; moveInDate: string; bedrooms: string; monthlyBudget: string; roommatePreferences: string; notes: string };
const EMPTY_DRAFT: Draft = { name: '', email: '', phone: '', moveInDate: '', bedrooms: '', monthlyBudget: '', roommatePreferences: '', notes: '' };

export function RentalDemandForm({ mode, context }: { mode: 'entire' | 'roommate'; context: RentalDemandContext }) {
  const { user, profile } = useAuth();
  const storageKey = useMemo(() => `nofeego:${mode}-request:${context.buildingId}`, [context.buildingId, mode]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = mode === 'entire' ? 'Get Photos & Current Unit Details' : 'Find a Roommate';

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as Partial<Draft> | null;
        setDraft({ ...EMPTY_DRAFT, ...saved, name: saved?.name || profile?.display_name || '', email: saved?.email || user?.email || '' });
      } catch { setDraft({ ...EMPTY_DRAFT, name: profile?.display_name ?? '', email: user?.email ?? '' }); }
    });
  }, [profile?.display_name, storageKey, user?.email]);

  const update = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
    if (!user) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/sign-in?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    setSubmitting(true);
    try {
      await accountFetch('/api/account/inquiries', { method: 'POST', body: JSON.stringify({
        buildingId: context.buildingId,
        requestType: mode === 'entire' ? 'entire_place' : 'roommate',
        message: draft.notes,
        moveInDate: draft.moveInDate || null,
        monthlyBudget: draft.monthlyBudget ? Number(draft.monthlyBudget) : null,
        contactName: draft.name,
        contactEmail: draft.email,
        contactPhone: draft.phone,
        bedrooms: draft.bedrooms,
        roommatePreferences: draft.roommatePreferences,
        selectedFloorPlan: context.floorPlan || '',
        displayedStartingRent: context.startingPrice ? Number(context.startingPrice) : null,
        preferredUnitType: draft.bedrooms || context.preferredUnitType || '',
      }) });
      window.localStorage.removeItem(storageKey); setSubmitted(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit your request.'); }
    finally { setSubmitting(false); }
  }

  if (mode === 'entire') return <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><Button asChild variant="ghost" className="mb-4 px-0"><Link href={`/buildings/${context.buildingSlug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to building</Link></Button><div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Current options request</p><h1 className="mt-1 font-serif text-3xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">We’ll ask the agent or leasing team for current unit details, available photos, pricing and move-in dates.</p><div className="my-5 grid gap-2 rounded-xl bg-muted/60 p-4 text-sm"><p className="flex items-center gap-2 text-base font-semibold"><Building2 className="h-4 w-4 text-primary" />{context.buildingName || 'Selected building'}</p>{context.address && <p className="text-muted-foreground">{context.address}</p>}<div className="mt-2 grid gap-2 sm:grid-cols-2"><p><span className="text-muted-foreground">Selected floor plan</span><br/><strong>{context.floorPlan || 'Flexible'}</strong></p><p><span className="text-muted-foreground">Starting price shown</span><br/><strong>{context.startingPrice ? `$${Number(context.startingPrice).toLocaleString()}` : 'Not shown'}</strong></p></div></div>{submitted ? <div className="rounded-xl bg-success/15 p-5"><h2 className="font-semibold">Rental Case created</h2><p className="mt-1 text-sm text-muted-foreground">Current photos and unit details will appear in your private requests page when the leasing team updates your case.</p><Button asChild className="mt-4"><Link href="/dashboard/requests">View My Requests</Link></Button></div> : <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Move-in date<Input value={draft.moveInDate} onChange={(event) => update('moveInDate', event.target.value)} type="date" required className="mt-1" /></label><label className="text-sm font-medium">Budget<Input value={draft.monthlyBudget} onChange={(event) => update('monthlyBudget', event.target.value)} type="number" min="1" step="100" required className="mt-1" placeholder="$" /></label><label className="text-sm font-medium">Preferred unit type<select value={draft.bedrooms || context.preferredUnitType || ''} onChange={(event) => update('bedrooms', event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select a unit type</option><option value="Studio">Studio</option><option value="1 Bed">1 Bed</option><option value="2 Beds">2 Beds</option><option value="3 Beds">3 Beds</option></select></label><label className="text-sm font-medium">Email<Input value={draft.email} onChange={(event) => update('email', event.target.value)} type="email" required className="mt-1" autoComplete="email" /></label></div><p className="text-xs text-muted-foreground">Sign in is required so updates can be delivered securely to your private Rental Case page.</p>{error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={submitting} className="min-h-12 w-full text-base">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{user ? 'Send Me Current Options' : 'Sign in to continue'}</Button></form>}</div></main>;

  return <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><Button asChild variant="ghost" className="mb-4 px-0"><Link href={`/buildings/${context.buildingSlug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to building</Link></Button><div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Rental request</p><h1 className="mt-1 font-serif text-3xl font-bold">{title}</h1><div className="my-5 rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" />{context.buildingName || 'Selected building'}</p>{context.address && <p className="text-sm text-muted-foreground">{context.address}</p>}</div>{submitted ? <div className="rounded-xl bg-success/15 p-5"><h2 className="font-semibold">Request submitted</h2><Button asChild className="mt-4"><Link href="/dashboard/requests">View My Requests</Link></Button></div> : <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Name<Input value={draft.name} onChange={(event) => update('name', event.target.value)} required className="mt-1" /></label><label className="text-sm font-medium">Email<Input value={draft.email} onChange={(event) => update('email', event.target.value)} type="email" required className="mt-1" /></label><label className="text-sm font-medium">Preferred move-in<Input value={draft.moveInDate} onChange={(event) => update('moveInDate', event.target.value)} type="date" className="mt-1" /></label><label className="text-sm font-medium">Monthly budget<Input value={draft.monthlyBudget} onChange={(event) => update('monthlyBudget', event.target.value)} type="number" min="1" step="100" className="mt-1" /></label></div><label className="block text-sm font-medium">About your roommate preferences<textarea value={draft.roommatePreferences} onChange={(event) => update('roommatePreferences', event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>{error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={submitting} className="min-h-11 w-full">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{user ? 'Submit Request' : 'Sign in to submit'}</Button></form>}</div></main>;
}

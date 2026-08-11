'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { accountFetch } from '@/lib/account/client';

export type RentalDemandContext = { buildingId: string; buildingSlug: string; buildingName: string; neighborhood: string; address: string };
type Draft = { name: string; email: string; phone: string; moveInDate: string; bedrooms: string; monthlyBudget: string; roommatePreferences: string; notes: string };
const EMPTY_DRAFT: Draft = { name: '', email: '', phone: '', moveInDate: '', bedrooms: '', monthlyBudget: '', roommatePreferences: '', notes: '' };

export function RentalDemandForm({ mode, context }: { mode: 'entire' | 'roommate'; context: RentalDemandContext }) {
  const { user, profile } = useAuth();
  const storageKey = useMemo(() => `nofeego:${mode}-request:${context.buildingId}`, [context.buildingId, mode]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = mode === 'entire' ? 'Rent the Entire Unit' : 'Find a Roommate';

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
      }) });
      window.localStorage.removeItem(storageKey); setSubmitted(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit your request.'); }
    finally { setSubmitting(false); }
  }

  return <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><Button asChild variant="ghost" className="mb-4 px-0"><Link href={`/buildings/${context.buildingSlug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to building</Link></Button><div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Rental request</p><h1 className="mt-1 font-serif text-3xl font-bold">{title}</h1><div className="my-5 rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" />{context.buildingName || 'Selected building'}</p>{context.neighborhood && <p className="mt-1 text-sm text-muted-foreground">{context.neighborhood}</p>}{context.address && <p className="text-sm text-muted-foreground">{context.address}</p>}</div>{submitted ? <div className="rounded-xl bg-success/15 p-5"><h2 className="font-semibold">Request submitted</h2><p className="mt-1 text-sm text-muted-foreground">You can track its status in My Requests.</p><Button asChild className="mt-4"><Link href="/dashboard/requests">View My Requests</Link></Button></div> : <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Name<Input value={draft.name} onChange={(event) => update('name', event.target.value)} required className="mt-1" autoComplete="name" /></label><label className="text-sm font-medium">Email<Input value={draft.email} onChange={(event) => update('email', event.target.value)} type="email" required className="mt-1" autoComplete="email" /></label><label className="text-sm font-medium">Phone<Input value={draft.phone} onChange={(event) => update('phone', event.target.value)} type="tel" className="mt-1" autoComplete="tel" /></label><label className="text-sm font-medium">Preferred move-in<Input value={draft.moveInDate} onChange={(event) => update('moveInDate', event.target.value)} type="date" className="mt-1" /></label><label className="text-sm font-medium">Bedrooms<select value={draft.bedrooms} onChange={(event) => update('bedrooms', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Flexible</option><option value="studio">Studio</option><option value="1">1 Bed</option><option value="2">2 Beds</option><option value="3">3 Beds</option></select></label><label className="text-sm font-medium">Monthly budget<Input value={draft.monthlyBudget} onChange={(event) => update('monthlyBudget', event.target.value)} type="number" min="1" step="100" className="mt-1" placeholder="$" /></label></div>{mode === 'roommate' && <label className="block text-sm font-medium">About your roommate preferences<textarea value={draft.roommatePreferences} onChange={(event) => update('roommatePreferences', event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>}<label className="block text-sm font-medium">Additional notes<textarea value={draft.notes} onChange={(event) => update('notes', event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label><p className="text-xs text-muted-foreground">Availability, rent, and roommate matches require verification. Your draft remains on this device until you sign in and submit it.</p>{error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={submitting} className="min-h-11 w-full">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{user ? 'Submit Request' : 'Sign in to submit'}</Button></form>}</div></main>;
}

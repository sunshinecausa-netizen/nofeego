'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type RentalDemandContext = { buildingId: string; buildingSlug: string; buildingName: string; neighborhood: string; address: string };

export function RentalDemandForm({ mode, context }: { mode: 'entire' | 'roommate'; context: RentalDemandContext }) {
  const [saved, setSaved] = useState(false);
  const title = mode === 'entire' ? 'Rent the Entire Place' : 'Find Someone to Rent With';

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    window.localStorage.setItem(`nofeego:${mode}-request:${context.buildingId}`, JSON.stringify({ ...values, ...context, mode, savedAt: new Date().toISOString() }));
    setSaved(true);
  }

  return <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6"><Button asChild variant="ghost" className="mb-4 px-0"><Link href={`/buildings/${context.buildingSlug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to building</Link></Button><div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Rental request</p><h1 className="mt-1 font-serif text-3xl font-bold">{title}</h1><div className="my-5 rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" />{context.buildingName || 'Selected building'}</p>{context.neighborhood && <p className="mt-1 text-sm text-muted-foreground">{context.neighborhood}</p>}{context.address && <p className="text-sm text-muted-foreground">{context.address}</p>}<p className="mt-2 text-[11px] text-muted-foreground">Building ID: {context.buildingId}</p></div><form onSubmit={saveDraft} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Name<Input name="name" required className="mt-1" autoComplete="name" /></label><label className="text-sm font-medium">Email<Input name="email" type="email" required className="mt-1" autoComplete="email" /></label><label className="text-sm font-medium">Phone<Input name="phone" type="tel" className="mt-1" autoComplete="tel" /></label><label className="text-sm font-medium">Preferred move-in<Input name="moveInDate" type="date" className="mt-1" /></label><label className="text-sm font-medium">Bedrooms<select name="bedrooms" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Flexible</option><option value="studio">Studio</option><option value="1">1 Bed</option><option value="2">2 Beds</option><option value="3">3 Beds</option></select></label><label className="text-sm font-medium">Monthly budget<Input name="monthlyBudget" type="number" min="0" step="100" className="mt-1" placeholder="$" /></label></div>{mode === 'roommate' && <label className="block text-sm font-medium">About your roommate preferences<textarea name="roommatePreferences" rows={4} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Lifestyle, schedule, preferred number of roommates…" /></label>}<label className="block text-sm font-medium">Additional notes<textarea name="notes" rows={4} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label><p className="text-xs text-muted-foreground">Availability, rent, and roommate matches are not guaranteed and will require verification. This version saves a draft on this device and does not send it to NoFeeGo yet.</p><Button type="submit" className="min-h-11 w-full">Save Request Draft</Button>{saved && <p role="status" className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-medium text-primary">Draft saved on this device. No request has been sent and no booking or roommate match has been created.</p>}</form></div></main>;
}

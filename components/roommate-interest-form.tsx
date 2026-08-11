'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { accountFetch } from '@/lib/account/client';
import type { RentalDemandContext } from '@/components/rental-demand-form';

type Draft = {
  budget: string; moveInDate: string; flexibility: string; leaseTerm: string; roommatesWanted: string;
  eligibility: string; creditRange: string; smoking: string; pets: string; schedule: string; workFromHome: string;
  cleanliness: string; bio: string; notificationMethod: 'email' | 'sms'; contactEmail: string; contactPhone: string; consent: boolean;
};
const EMPTY: Draft = { budget: '', moveInDate: '', flexibility: 'plus_minus_2_weeks', leaseTerm: '12_months', roommatesWanted: '1', eligibility: 'confirming_eligibility', creditRange: 'unknown', smoking: 'no', pets: 'none', schedule: 'flexible', workFromHome: 'sometimes', cleanliness: 'balanced', bio: '', notificationMethod: 'email', contactEmail: '', contactPhone: '', consent: false };
const selectClass = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function RoommateInterestForm({ context }: { context: RentalDemandContext }) {
  const { user } = useAuth(); const storageKey = useMemo(() => `nofeego:roommate-interest:${context.buildingId}`, [context.buildingId]);
  const [draft, setDraft] = useState(EMPTY); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false);
  const [hasPotentialMatches, setHasPotentialMatches] = useState(false); const [error, setError] = useState<string | null>(null);
  const update = (key: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let saved: Partial<Draft> = {}; try { saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<Draft>; } catch {}
    queueMicrotask(() => setDraft((current) => ({ ...current, ...saved, contactEmail: saved.contactEmail || user?.email || '' })));
    if (!user) return;
    accountFetch<{ profile?: { bio?: string; notification_method?: 'email' | 'sms'; contact_email?: string; contact_phone?: string }; preferences?: Record<string, string | number> }>('/api/account/roommate-interests').then(({ profile, preferences }) => {
      if (!profile && !preferences) return;
      setDraft((current) => ({ ...current,
        budget: current.budget || String(preferences?.max_monthly_budget ?? ''), moveInDate: current.moveInDate || String(preferences?.move_in_date ?? ''),
        flexibility: String(preferences?.move_in_flexibility ?? current.flexibility), leaseTerm: String(preferences?.lease_term ?? current.leaseTerm),
        roommatesWanted: String(preferences?.roommates_wanted ?? current.roommatesWanted), eligibility: String(preferences?.eligibility_status ?? current.eligibility),
        creditRange: String(preferences?.credit_range ?? current.creditRange), smoking: String(preferences?.smoking ?? current.smoking), pets: String(preferences?.pets ?? current.pets),
        schedule: String(preferences?.schedule ?? current.schedule), workFromHome: String(preferences?.work_from_home ?? current.workFromHome), cleanliness: String(preferences?.cleanliness ?? current.cleanliness),
        bio: current.bio || profile?.bio || '', notificationMethod: profile?.notification_method ?? current.notificationMethod,
        contactEmail: current.contactEmail || profile?.contact_email || user.email || '', contactPhone: current.contactPhone || profile?.contact_phone || '',
      }));
    }).catch(() => {});
  }, [storageKey, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); localStorage.setItem(storageKey, JSON.stringify(draft));
    if (!user) { window.location.assign(`/sign-in?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`); return; }
    if (draft.notificationMethod === 'sms' && !draft.contactPhone.trim()) { setError('Enter a phone number for SMS notifications.'); return; }
    setSubmitting(true);
    try {
      const result = await accountFetch<{ hasPotentialMatches: boolean }>('/api/account/roommate-interests', { method: 'POST', body: JSON.stringify({
        buildingId: context.buildingId, unitId: context.unitId || null, floorPlan: context.floorPlan || 'Any available floor plan',
        maxMonthlyBudget: Number(draft.budget), moveInDate: draft.moveInDate, moveInFlexibility: draft.flexibility, leaseTerm: draft.leaseTerm,
        roommatesWanted: Number(draft.roommatesWanted), eligibilityStatus: draft.eligibility, creditRange: draft.creditRange,
        smoking: draft.smoking, pets: draft.pets, schedule: draft.schedule, workFromHome: draft.workFromHome, cleanliness: draft.cleanliness,
        bio: draft.bio, notificationMethod: draft.notificationMethod, contactEmail: draft.contactEmail, contactPhone: draft.contactPhone, consent: draft.consent,
      }) });
      localStorage.removeItem(storageKey); setHasPotentialMatches(result.hasPotentialMatches); setSubmitted(true);
    } catch (caught) { const code = caught instanceof Error ? caught.message : ''; setError(code === 'ROOMMATE_INTEREST_LIMIT' ? 'You already have 5 active homes. Pause or remove one before adding another.' : 'Unable to register your interest. Please review the form and try again.'); }
    finally { setSubmitting(false); }
  }

  if (submitted) return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><div className="rounded-2xl border bg-white p-7 shadow-sm"><CheckCircle2 className="h-12 w-12 text-success" /><h1 className="mt-4 font-serif text-3xl font-bold text-navy">You&apos;re on the roommate interest list</h1><p className="mt-2 text-muted-foreground">We&apos;ll notify you when someone with compatible timing and budget is interested in this home.</p><div className="mt-5 rounded-xl bg-muted/60 p-4"><p className="font-semibold">{hasPotentialMatches ? 'Potential matches are available.' : 'No compatible match yet.'}</p><p className="mt-1 text-sm text-muted-foreground">Keep browsing while we look. You never need to wait before contacting or adding another home.</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Button asChild variant="outline"><Link href="/dashboard/roommates">View potential matches</Link></Button><Button asChild variant="outline"><Link href="/buildings">Add another home</Link></Button><Button asChild><Link href={`/rent-request?${new URLSearchParams({ buildingId: context.buildingId, buildingSlug: context.buildingSlug, buildingName: context.buildingName, neighborhood: context.neighborhood, address: context.address }).toString()}`}>Ask about this home</Link></Button></div></div></main>;

  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><Button asChild variant="ghost" className="mb-4 px-0"><Link href={`/buildings/${context.buildingSlug}`}><ArrowLeft className="mr-2 h-4 w-4" />Back to building</Link></Button><form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">About 2 minutes</p><h1 className="mt-1 font-serif text-3xl font-bold">Find a roommate</h1><p className="mt-1 text-sm text-muted-foreground">Join others interested in sharing this home.</p></div><ShieldCheck className="h-9 w-9 text-primary" /></div>
    <section className="mt-6 rounded-xl bg-muted/60 p-4"><p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" />{context.buildingName || 'Selected building'}</p><p className="mt-1 text-sm text-muted-foreground">{context.address}</p><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Building</dt><dd className="font-medium">Automatically selected</dd></div><div><dt className="text-muted-foreground">Unit / floor plan</dt><dd className="font-medium">{context.floorPlan || 'Any available floor plan'}</dd></div></dl></section>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Maximum monthly rent per person"><Input type="number" min="1" step="50" value={draft.budget} onChange={(e) => update('budget', e.target.value)} required placeholder="e.g. 2500" /></Field><Field label="Expected move-in date"><Input type="date" value={draft.moveInDate} onChange={(e) => update('moveInDate', e.target.value)} required /></Field>
      <SelectField label="Move-in flexibility" value={draft.flexibility} onChange={(v) => update('flexibility', v)} options={[['exact','Exact date'],['plus_minus_1_week','± 1 week'],['plus_minus_2_weeks','± 2 weeks'],['plus_minus_1_month','± 1 month']]} /><SelectField label="Lease term" value={draft.leaseTerm} onChange={(v) => update('leaseTerm', v)} options={[['12_months','12 months'],['short_term','Short term'],['other','Other']]} />
      <SelectField label="How many roommates do you need?" value={draft.roommatesWanted} onChange={(v) => update('roommatesWanted', v)} options={[['1','1 person'],['2','2 people'],['3','3 people'],['4','4 people']]} /><SelectField label="Financial readiness" value={draft.eligibility} onChange={(v) => update('eligibility', v)} options={[['likely_meets_income','Likely meets income requirement'],['guarantor_available','Guarantor available'],['confirming_eligibility','Still confirming eligibility']]} />
      <SelectField label="Credit range" value={draft.creditRange} onChange={(v) => update('creditRange', v)} options={[['unknown','Prefer not to say / unknown'],['under_600','Under 600'],['600_649','600–649'],['650_699','650–699'],['700_749','700–749'],['750_plus','750+']]} /><SelectField label="Smoking" value={draft.smoking} onChange={(v) => update('smoking', v)} options={[['no','No'],['outside_only','Outside only'],['yes','Yes']]} />
      <SelectField label="Pets" value={draft.pets} onChange={(v) => update('pets', v)} options={[['none','None'],['cat','Cat'],['dog','Dog'],['other','Other']]} /><SelectField label="Typical schedule" value={draft.schedule} onChange={(v) => update('schedule', v)} options={[['early','Early'],['standard','Standard'],['late','Late'],['flexible','Flexible']]} />
      <SelectField label="Work from home" value={draft.workFromHome} onChange={(v) => update('workFromHome', v)} options={[['never','Never'],['sometimes','Sometimes'],['most_days','Most days']]} /><SelectField label="Cleaning preference" value={draft.cleanliness} onChange={(v) => update('cleanliness', v)} options={[['relaxed','Relaxed'],['balanced','Balanced'],['very_tidy','Very tidy']]} />
    </div><Field label="Short introduction (optional, max 300 characters)" className="mt-4"><textarea maxLength={300} rows={3} value={draft.bio} onChange={(e) => update('bio', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><p className="text-right text-xs text-muted-foreground">{draft.bio.length}/300</p></Field>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><SelectField label="Notification method" value={draft.notificationMethod} onChange={(v) => update('notificationMethod', v as 'email' | 'sms')} options={[['email','Email'],['sms','SMS']]} /><Field label="Email"><Input type="email" required value={draft.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} /></Field>{draft.notificationMethod === 'sms' && <Field label="Mobile number"><Input type="tel" required value={draft.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} /></Field>}</div>
    <label className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm"><input type="checkbox" checked={draft.consent} onChange={(e) => update('consent', e.target.checked)} required className="mt-1" /><span>I agree to the privacy, safety, and platform disclaimer terms. My contact details stay private unless I choose to share them.</span></label><p className="mt-3 text-xs text-muted-foreground">We do not request ID documents, bank statements, pay stubs, or an exact credit score. You can pause or remove this interest at any time.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={submitting} className="mt-5 min-h-11 w-full">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{user ? 'Join the roommate interest list' : 'Sign in or create an account to continue'}</Button></form></main>;
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`block text-sm font-medium ${className}`}>{label}<div className="mt-1">{children}</div></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} required>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }

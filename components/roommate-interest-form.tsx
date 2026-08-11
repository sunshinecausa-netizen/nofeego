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
  utilitiesBudget: string; qualificationStatus: string; guarantorStatus: string; roomArrangement: string;
  smoking: string; pets: string; petAllergies: string; noisePreference: string; guestFrequency: string; overnightGuests: string;
  temperaturePreference: string; schedule: string; workFromHome: string; cleanliness: string; language: string; bio: string;
  notificationMethod: 'email' | 'sms'; contactEmail: string; contactPhone: string; ageConfirmed: boolean;
  requiredAgreement: boolean; communityAgreement: boolean; optionalMatchConsent: boolean;
};
const EMPTY: Draft = { budget: '', moveInDate: '', flexibility: 'plus_minus_2_weeks', leaseTerm: '12_months', roommatesWanted: '1', utilitiesBudget: 'not_included', qualificationStatus: 'still_confirming', guarantorStatus: 'none', roomArrangement: 'private_bedroom', smoking: 'none', pets: 'none', petAllergies: 'none', noisePreference: 'moderate', guestFrequency: 'occasionally', overnightGuests: 'discuss_first', temperaturePreference: 'moderate', schedule: 'varies', workFromHome: 'sometimes', cleanliness: 'regularly_tidy', language: '', bio: '', notificationMethod: 'email', contactEmail: '', contactPhone: '', ageConfirmed: false, requiredAgreement: false, communityAgreement: false, optionalMatchConsent: false };
const selectClass = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function RoommateInterestForm({ context }: { context: RentalDemandContext }) {
  const { user } = useAuth(); const storageKey = useMemo(() => `nofeego:roommate-interest:${context.buildingId}`, [context.buildingId]);
  const [draft, setDraft] = useState(EMPTY); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false);
  const [hasPotentialMatches, setHasPotentialMatches] = useState(false); const [error, setError] = useState<string | null>(null); const [emailEditable, setEmailEditable] = useState(false);
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
        roommatesWanted: String(preferences?.roommates_wanted ?? current.roommatesWanted), utilitiesBudget: String(preferences?.utilities_budget ?? current.utilitiesBudget),
        qualificationStatus: String(preferences?.qualification_status ?? current.qualificationStatus), guarantorStatus: String(preferences?.guarantor_status ?? current.guarantorStatus), roomArrangement: String(preferences?.room_arrangement ?? current.roomArrangement),
        smoking: String(preferences?.smoking ?? current.smoking), pets: String(preferences?.pets ?? current.pets), petAllergies: String(preferences?.pet_allergies ?? current.petAllergies), noisePreference: String(preferences?.noise_preference ?? current.noisePreference),
        guestFrequency: String(preferences?.guest_frequency ?? current.guestFrequency), overnightGuests: String(preferences?.overnight_guests ?? current.overnightGuests), temperaturePreference: String(preferences?.temperature_preference ?? current.temperaturePreference),
        schedule: String(preferences?.schedule ?? current.schedule), workFromHome: String(preferences?.work_from_home ?? current.workFromHome), cleanliness: String(preferences?.cleanliness ?? current.cleanliness), language: String(preferences?.language ?? current.language),
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
        roommatesWanted: Number(draft.roommatesWanted), utilitiesBudget: draft.utilitiesBudget, qualificationStatus: draft.qualificationStatus,
        guarantorStatus: draft.guarantorStatus, roomArrangement: draft.roomArrangement, smoking: draft.smoking, pets: draft.pets,
        petAllergies: draft.petAllergies, noisePreference: draft.noisePreference, guestFrequency: draft.guestFrequency,
        overnightGuests: draft.overnightGuests, temperaturePreference: draft.temperaturePreference, schedule: draft.schedule,
        workFromHome: draft.workFromHome, cleanliness: draft.cleanliness, language: draft.language, bio: draft.bio,
        notificationMethod: draft.notificationMethod, contactEmail: draft.contactEmail, contactPhone: draft.contactPhone,
        ageConfirmed: draft.ageConfirmed, requiredAgreement: draft.requiredAgreement, communityAgreement: draft.communityAgreement,
        optionalMatchConsent: draft.optionalMatchConsent,
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
      <SelectField label="How many more people do you need?" value={draft.roommatesWanted} onChange={(v) => update('roommatesWanted', v)} options={[['1','1 more person'],['2','2 more people'],['3','3 more people'],['4','4 more people']]} /><SelectField label="Utilities budget" value={draft.utilitiesBudget} onChange={(v) => update('utilitiesBudget', v)} options={[['included','Budget includes utilities'],['not_included','Budget excludes utilities'],['flexible','Flexible / not sure']]} />
      <SelectField label="Rental qualification status" value={draft.qualificationStatus} onChange={(v) => update('qualificationStatus', v)} options={[['self_reported_eligible','Self-reported eligible'],['still_confirming','Still confirming eligibility']]} /><SelectField label="Guarantor status" value={draft.guarantorStatus} onChange={(v) => update('guarantorStatus', v)} options={[['none','No guarantor'],['has_guarantor','Guarantor available'],['consider_third_party','Considering a third-party guarantor service']]} />
      <SelectField label="Preferred room arrangement" value={draft.roomArrangement} onChange={(v) => update('roomArrangement', v)} options={[['private_bedroom','Private bedroom'],['primary_bedroom','Primary bedroom'],['flex_room','Flex room acceptable']]} /><SelectField label="Smoking / vaping" value={draft.smoking} onChange={(v) => update('smoking', v)} options={[['none','Neither'],['smoking','Smoking'],['vaping','Vaping'],['both','Smoking and vaping']]} />
      <SelectField label="Pets" value={draft.pets} onChange={(v) => update('pets', v)} options={[['none','None'],['cat','Cat'],['dog','Dog'],['other','Other']]} /><SelectField label="Pet allergies" value={draft.petAllergies} onChange={(v) => update('petAllergies', v)} options={[['none','None'],['cats','Allergic to cats'],['dogs','Allergic to dogs'],['all_pets','Avoid all pets']]} />
      <SelectField label="Noise preference" value={draft.noisePreference} onChange={(v) => update('noisePreference', v)} options={[['quiet','Quiet'],['moderate','Moderate'],['social','Social']]} /><SelectField label="Guest frequency" value={draft.guestFrequency} onChange={(v) => update('guestFrequency', v)} options={[['rarely','Rarely'],['occasionally','Occasionally'],['frequently','Frequently']]} />
      <SelectField label="Overnight guests" value={draft.overnightGuests} onChange={(v) => update('overnightGuests', v)} options={[['not_comfortable','Not comfortable'],['discuss_first','Discuss first'],['comfortable','Comfortable']]} /><SelectField label="Temperature preference" value={draft.temperaturePreference} onChange={(v) => update('temperaturePreference', v)} options={[['cool','Cool'],['moderate','Moderate'],['warm','Warm']]} />
      <SelectField label="Typical schedule" value={draft.schedule} onChange={(v) => update('schedule', v)} options={[['early_riser','Early riser'],['standard_daytime','Standard daytime'],['night_schedule','Night schedule'],['varies','Varies']]} /><SelectField label="Work from home" value={draft.workFromHome} onChange={(v) => update('workFromHome', v)} options={[['never','Never'],['sometimes','Sometimes'],['most_days','Most days']]} />
      <SelectField label="Cleaning preference" value={draft.cleanliness} onChange={(v) => update('cleanliness', v)} options={[['relaxed','Relaxed'],['regularly_tidy','Regularly tidy'],['very_tidy','Very tidy']]} /><Field label="Language (for communication only)"><Input value={draft.language} onChange={(e) => update('language', e.target.value)} maxLength={80} placeholder="Optional" /><p className="mt-1 text-xs text-muted-foreground">Never used for housing qualification.</p></Field>
    </div><Field label="Short introduction (optional, max 300 characters)" className="mt-4"><textarea maxLength={300} rows={3} value={draft.bio} onChange={(e) => update('bio', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><p className="text-right text-xs text-muted-foreground">{draft.bio.length}/300</p></Field>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><SelectField label="Notification method" value={draft.notificationMethod} onChange={(v) => update('notificationMethod', v as 'email' | 'sms')} options={[['email','Email'],['sms','SMS']]} /><Field label="Account email"><div className="flex gap-2"><Input type="email" required readOnly={!emailEditable} value={draft.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} className={!emailEditable ? 'bg-muted' : ''} /><Button type="button" variant="outline" onClick={() => setEmailEditable((value) => !value)}>{emailEditable ? 'Done' : 'Change'}</Button></div></Field>{draft.notificationMethod === 'sms' && <Field label="Mobile number"><Input type="tel" required value={draft.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} /></Field>}</div>
    <div className="mt-5 space-y-3"><Consent checked={draft.ageConfirmed} onChange={(value) => update('ageConfirmed', value)} required>I confirm that I am 18 years or older.</Consent><Consent checked={draft.requiredAgreement} onChange={(value) => update('requiredAgreement', value)} required>I agree to the required privacy, safety, and platform disclaimer terms.</Consent><Consent checked={draft.communityAgreement} onChange={(value) => update('communityAgreement', value)} required>I agree to the Community Guidelines and understand how to report safety or conduct concerns.</Consent><Consent checked={draft.optionalMatchConsent} onChange={(value) => update('optionalMatchConsent', value)}>Optional: I allow NoFeeGo to use these preferences to suggest compatible roommate matches.</Consent></div><p className="mt-3 text-xs text-muted-foreground">We do not request ID documents, bank statements, pay stubs, or an exact credit score. Qualification is shown to other users only as Self-reported or Verified eligibility. You can pause or remove this interest at any time.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={submitting} className="mt-5 min-h-11 w-full">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{user ? 'Join the roommate interest list' : 'Sign in or create an account to continue'}</Button></form></main>;
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`block text-sm font-medium ${className}`}>{label}<div className="mt-1">{children}</div></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} required>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function Consent({ checked, onChange, required = false, children }: { checked: boolean; onChange: (value: boolean) => void; required?: boolean; children: React.ReactNode }) { return <label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required={required} className="mt-1" /><span>{children}</span></label>; }

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'NYC Apartments for Students — Current Options, Human Help',
  description: 'Tell us your move-in date and budget. A local leasing agent will send current NYC rental options in one private Rental Case.',
  alternates: { canonical: '/student-rentals' },
};

export default async function StudentRentalsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
    const value = params[key]; if (typeof value === 'string') query.set(key,value);
  }
  const requestHref = `/rent-request${query.size ? `?${query}` : ''}`;
  return <main className="bg-gradient-to-b from-primary/10 via-white to-white">
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_.8fr] md:py-24">
      <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">NYC student rentals</p><h1 className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-6xl">Stop chasing stale listings. Get current options from a real person.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Share your date, budget and preferred apartment size. We create one private Rental Case and guide it from options to tour, application and lease.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link href={requestHref}>Start my rental request <ArrowRight className="ml-2 h-4 w-4"/></Link></Button><Button asChild size="lg" variant="outline"><Link href="/buildings">Browse buildings</Link></Button></div><p className="mt-4 text-sm text-muted-foreground">No application fee to submit a request. Availability and terms are confirmed before you apply.</p></div>
      <aside className="rounded-3xl border bg-white p-6 shadow-xl"><h2 className="text-2xl font-bold">What happens next</h2><ol className="mt-5 space-y-4">{['Submit your move-in date and budget','Review current options in your private Case','Choose one option and let us confirm with the Property','Tour and apply through the official Property process'].map((item,index)=><li key={item} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{index+1}</span><span>{item}</span></li>)}</ol><div className="mt-6 flex items-start gap-3 rounded-xl bg-muted p-4 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-primary"/><p>Your contact details stay private and are shared only when needed for the rental step you approve.</p></div></aside>
    </section>
    <section className="mx-auto max-w-6xl px-5 pb-20"><div className="grid gap-4 sm:grid-cols-3">{['One Case, one clear status','Human-reviewed current options','Property confirmation before application'].map(item=><div key={item} className="flex items-center gap-3 rounded-2xl border bg-white p-5"><CheckCircle2 className="h-5 w-5 text-primary"/><strong>{item}</strong></div>)}</div></section>
  </main>;
}

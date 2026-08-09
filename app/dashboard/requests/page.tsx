'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { accountFetch } from '@/lib/account/client';
import { useAccountBuildings } from '@/lib/account/use-account-buildings';

type Inquiry = { id: string; building_id: string | null; request_type: 'entire_place' | 'roommate' | null; message: string | null; move_in_date: string | null; monthly_budget: number | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null; status: string; created_at: string; updated_at: string };

export default function RequestsPage() {
  const router = useRouter(); const { user, loading: authLoading } = useAuth(); const [items, setItems] = useState<Inquiry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const buildingIds = useMemo(() => items.map((item) => item.building_id).filter((id): id is string => Boolean(id)), [items]); const { buildings } = useAccountBuildings(buildingIds); const names = new Map(buildings.map((building) => [building.id, building.name]));
  useEffect(() => { if (!authLoading && !user) router.replace('/sign-in?next=/dashboard/requests'); }, [authLoading, router, user]);
  useEffect(() => { if (!user) return; accountFetch<{ items: Inquiry[] }>('/api/account/inquiries').then((data) => setItems(data.items)).catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load requests.')).finally(() => setLoading(false)); }, [user]);
  if (authLoading || !user || loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="font-serif text-3xl font-bold">My Requests</h1><p className="mt-1 text-sm text-muted-foreground">Only you can see these requests. Request status is managed by NoFeeGo.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>}{items.length ? <div className="mt-6 space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary-hover">{item.request_type === 'roommate' ? 'Find Someone to Rent With' : 'Rent the Entire Place'}</p><h2 className="mt-1 font-serif text-xl font-bold">{item.building_id ? names.get(item.building_id) ?? 'Building details unavailable' : 'Building details unavailable'}</h2><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(item.created_at).toLocaleString()}</p></div><span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{item.status === 'new' ? 'Submitted' : item.status}</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Move-in</dt><dd>{item.move_in_date ?? 'Not provided'}</dd></div><div><dt className="text-muted-foreground">Budget</dt><dd>{item.monthly_budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.monthly_budget) : 'Not provided'}</dd></div><div><dt className="text-muted-foreground">Contact</dt><dd>{item.contact_email ?? 'Not provided'}</dd></div></dl>{item.message && <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">{item.message}</p>}</article>)}</div> : <div className="mt-10 rounded-2xl border bg-card p-8 text-center"><MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-muted-foreground">You have not submitted any requests.</p><Button asChild className="mt-4"><Link href="/">Browse Buildings</Link></Button></div>}</main>;
}

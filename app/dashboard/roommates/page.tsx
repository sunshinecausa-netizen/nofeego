'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { accountFetch } from '@/lib/account/client';
import { useAccountBuildings } from '@/lib/account/use-account-buildings';

type Interest = { id: string; building_id: string; floor_plan: string; status: 'active' | 'paused' | 'withdrawn' | 'home_unavailable'; created_at: string };

export default function RoommateInterestsPage() {
  const { user, loading: authLoading } = useAuth(); const [items, setItems] = useState<Interest[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const buildingIds = useMemo(() => items.map((item) => item.building_id), [items]); const { buildings } = useAccountBuildings(buildingIds); const names = new Map(buildings.map((building) => [building.id, building.name]));
  useEffect(() => { if (!authLoading && !user) location.assign('/sign-in?next=/dashboard/roommates'); }, [authLoading, user]);
  useEffect(() => { if (!user) return; accountFetch<{ items: Interest[] }>('/api/account/roommate-interests').then((result) => setItems(result.items)).catch(() => setError('Unable to load roommate interests.')).finally(() => setLoading(false)); }, [user]);
  async function setStatus(id: string, status: 'active' | 'paused' | 'withdrawn') { try { await accountFetch(`/api/account/roommate-interests/${id}`, { method: status === 'withdrawn' ? 'DELETE' : 'PATCH', body: status === 'withdrawn' ? undefined : JSON.stringify({ status }) }); setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item)); } catch { setError('Unable to update this interest.'); } }
  if (authLoading || !user || loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="font-serif text-3xl font-bold">Roommate interests</h1><p className="mt-1 text-sm text-muted-foreground">Manage up to 5 active homes. Your contact information is private by default.</p>{error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>}<div className="mt-6 space-y-3">{items.filter((item) => item.status !== 'withdrawn').map((item) => <article key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.status}</p><h2 className="mt-1 font-serif text-xl font-bold">{names.get(item.building_id) ?? 'Selected building'}</h2><p className="text-sm text-muted-foreground">{item.floor_plan}</p></div><div className="flex gap-2">{item.status === 'active' ? <Button variant="outline" onClick={() => setStatus(item.id, 'paused')}>Pause</Button> : <Button variant="outline" onClick={() => setStatus(item.id, 'active')}>Resume</Button>}<Button variant="ghost" className="text-destructive" onClick={() => setStatus(item.id, 'withdrawn')}>Remove</Button></div></div><p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">We&apos;ll show compatible candidates here and notify you by your selected method. Keep browsing in the meantime.</p></article>)}{!items.some((item) => item.status !== 'withdrawn') && <div className="rounded-2xl border p-8 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-muted-foreground">You have no active roommate interests.</p></div>}</div><Button asChild className="mt-5"><Link href="/buildings">Add another home</Link></Button></main>;
}


'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GitCompareArrows, Heart, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTenantData } from '@/lib/account/tenant-data-context';
import { accountFetch } from '@/lib/account/client';

export default function DashboardPage() {
  const router = useRouter(); const { user, loading: authLoading } = useAuth(); const { favoriteIds, compareIds } = useTenantData();
  const [requests, setRequests] = useState<Array<{ id: string; request_type: string | null; status: string; created_at: string }>>([]);
  useEffect(() => { if (!authLoading && !user) router.replace('/sign-in?next=/dashboard'); }, [authLoading, router, user]);
  useEffect(() => { if (user) accountFetch<{ items: typeof requests }>('/api/account/inquiries').then((data) => setRequests(data.items)).catch(() => undefined); }, [user]);
  if (authLoading || !user) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  const cards = [{ href: '/dashboard/saved', label: 'Saved Buildings', value: favoriteIds.length, icon: Heart }, { href: '/compare', label: 'Compare', value: compareIds.length, icon: GitCompareArrows }, { href: '/dashboard/requests', label: 'My Requests', value: requests.length, icon: MessageSquare }];
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><p className="text-sm text-muted-foreground">Welcome back, {user.email}</p><h1 className="font-serif text-3xl font-bold">Tenant Dashboard</h1><div className="mt-6 grid gap-4 sm:grid-cols-3">{cards.map(({ href, label, value, icon: Icon }) => <Link key={href} href={href} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"><Icon className="h-6 w-6 text-primary" /><p className="mt-4 text-3xl font-bold text-navy">{value}</p><p className="text-sm text-muted-foreground">{label}</p></Link>)}</div><section className="mt-8 rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Recent requests</h2><Link href="/dashboard/requests" className="text-sm font-semibold text-primary-hover hover:underline">View all</Link></div>{requests.length ? <ul className="mt-4 divide-y">{requests.slice(0, 5).map((request) => <li key={request.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{request.request_type === 'roommate' ? 'Find Someone to Rent With' : 'Rent the Entire Place'}</span><span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">{request.status === 'new' ? 'Submitted' : request.status}</span></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">No requests submitted yet.</p>}</section></main>;
}

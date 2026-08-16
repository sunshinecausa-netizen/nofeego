'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { accountFetch } from '@/lib/account/client';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/database.types';

type Case = Database['public']['Tables']['rental_cases']['Row'];
type Snapshot = Database['public']['Tables']['rental_case_recommendation_snapshots']['Row'];
type History = Database['public']['Tables']['rental_case_status_history']['Row'];
type Payload = { rentalCase: Case; recommendations: Snapshot[]; history: History[] };

export function RentalCaseWorkspace({ caseId, audience }: { caseId: string; audience: 'tenant'|'agent'|'admin' }) {
  const [payload,setPayload]=useState<Payload|null>(null);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{accountFetch<Payload>(`/api/account/rental-cases?caseId=${encodeURIComponent(caseId)}`).then(setPayload).catch(caught=>setError(caught instanceof Error?caught.message:'CASE_LOAD_FAILED'))},[caseId]);
  if(error)return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">Rental Case unavailable</h1><p role="alert" className="mt-3 text-destructive">{error}</p><Button asChild className="mt-4"><Link href="/sign-in">Sign in again</Link></Button></main>;
  if(!payload)return <div className="flex min-h-[50vh] items-center justify-center" role="status"><Loader2 className="h-7 w-7 animate-spin"/><span className="sr-only">Loading Rental Case</span></div>;
  return <main className="mx-auto max-w-3xl p-6"><p className="text-sm uppercase tracking-wide text-muted-foreground">{audience} workspace</p><h1 className="mt-1 text-3xl font-bold">Rental Case</h1><div className="mt-5 rounded-xl border bg-white p-5"><p className="text-sm text-muted-foreground">Current status</p><p className="mt-1 text-xl font-semibold">{payload.rentalCase.status.replaceAll('_',' ')}</p><p className="mt-2 text-sm">Case ID: <span className="font-mono">{payload.rentalCase.id}</span></p></div><section className="mt-6"><h2 className="text-xl font-bold">Recommendations sent</h2>{payload.recommendations.length?<ul className="mt-3 space-y-3">{payload.recommendations.map(item=><li key={item.id} className="rounded-xl border p-4"><strong>{item.unit_label||'Unit option'}</strong><p className="text-sm">Gross rent: {item.gross_rent??'Not provided'} · Net effective: {item.net_effective_rent??'Not provided'}</p><p className="text-xs text-muted-foreground">Snapshot sent {new Date(item.sent_at).toLocaleString()}</p></li>)}</ul>:<p className="mt-2 text-muted-foreground">No recommendations have been sent yet.</p>}</section><section className="mt-6"><h2 className="text-xl font-bold">Case history</h2>{payload.history.length?<ol className="mt-3 space-y-2">{payload.history.map(item=><li key={item.id} className="border-l-2 pl-3 text-sm">{item.to_status.replaceAll('_',' ')} · {new Date(item.created_at).toLocaleString()}</li>)}</ol>:<p className="mt-2 text-muted-foreground">The first status event will appear after processing begins.</p>}</section></main>;
}

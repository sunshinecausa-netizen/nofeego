'use client';

import { useCallback,useEffect,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type RentalCase=Database['public']['Tables']['rental_cases']['Row'];
export default function AdminRentalCasesPage(){
  const {profile,loading}=useAuth();const router=useRouter();const [items,setItems]=useState<RentalCase[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState<string|null>(null);
  const load=useCallback(async()=>{setBusy(true);const {data,error:loadError}=await supabase.from('rental_cases').select('*').order('created_at',{ascending:false});if(loadError)setError('Unable to load Rental Cases.');else setItems(data??[]);setBusy(false)},[]);
  useEffect(()=>{if(!loading&&profile?.account_role!=='admin'&&!profile?.is_admin){router.replace('/unauthorized');return}if(profile?.account_role==='admin'||profile?.is_admin){const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)}},[load,loading,profile?.account_role,profile?.is_admin,router]);
  if(loading||busy)return <div className="flex min-h-[60vh] items-center justify-center" role="status"><Loader2 className="h-7 w-7 animate-spin"/><span className="sr-only">Loading Rental Cases</span></div>;
  return <main className="mx-auto max-w-5xl p-6"><h1 className="text-3xl font-bold">Rental Cases</h1><p className="mt-2 text-sm text-muted-foreground">Read-only queue. Review, assignment, and status changes use protected server actions from the Case page.</p>{error&&<p role="alert" className="mt-4 text-destructive">{error}</p>}{items.length?<ul className="mt-6 space-y-3">{items.map(item=><li key={item.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{item.preferred_unit_type||item.selected_floor_plan||'Flexible unit type'}</p><p className="mt-1 text-sm text-muted-foreground">{item.status.replaceAll('_',' ')} · {new Date(item.created_at).toLocaleString()}</p></div><Link className="font-medium text-primary hover:underline" href={`/admin/cases/${item.id}`}>Open Case</Link></div></li>)}</ul>:<div className="mt-8 rounded-xl border p-8 text-center text-muted-foreground">No Rental Cases require review.</div>}</main>;
}

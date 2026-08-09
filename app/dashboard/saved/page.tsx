'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuildingCard } from '@/components/building-result-card';
import { useAuth } from '@/lib/auth-context';
import { useTenantData } from '@/lib/account/tenant-data-context';
import { useAccountBuildings } from '@/lib/account/use-account-buildings';

export default function SavedBuildingsPage() {
  const router = useRouter(); const { user, loading: authLoading } = useAuth(); const { favoriteIds, compareIds, toggleFavorite, toggleCompare } = useTenantData(); const { buildings, inventoryByBuilding, loading } = useAccountBuildings(favoriteIds);
  useEffect(() => { if (!authLoading && !user) router.replace('/sign-in?next=/dashboard/saved'); }, [authLoading, router, user]);
  if (authLoading || !user || loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="font-serif text-3xl font-bold">Saved Buildings</h1><p className="mt-1 text-sm text-muted-foreground">Your saved buildings stay synchronized across signed-in devices.</p>{buildings.length ? <div className="mt-6 space-y-4">{buildings.map((building) => <BuildingCard key={building.id} building={building} inventory={inventoryByBuilding[building.id]} favorited compared={compareIds.includes(building.id)} onFavoriteChange={(item, checked) => void toggleFavorite(item.id, checked)} onCompareChange={(item, checked) => void toggleCompare(item.id, checked)} />)}</div> : <div className="mt-10 rounded-2xl border bg-card p-8 text-center"><Heart className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-muted-foreground">You have not saved any buildings yet.</p><Button asChild className="mt-4"><Link href="/">Browse Buildings</Link></Button></div>}</main>;
}

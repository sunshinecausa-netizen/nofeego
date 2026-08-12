'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, MapPin, Home, Loader2, TrendingUp,
  CheckCircle, Clock, DollarSign, LogOut, Users, Settings, FileClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/services';

type SubmissionSummary = {
  id: string;
  submission_data: {
    title?: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    neighborhood_name?: string;
  };
  profiles?: { email: string | null } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    totalBuildings: 0,
    totalNeighborhoods: 0,
    totalUsers: 0,
    avgPrice: 0,
  });
  const [pendingSubmissions, setPendingSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
    if (profile?.is_admin) loadStats();
  }, [user, profile, authLoading]);

  async function loadStats() {
    try {
      const [listings, buildings, neighborhoods, users, submissions] = await Promise.all([
        supabase.from('listings').select('price, status'),
        supabase.from('buildings').select('id', { count: 'exact' }),
        supabase.from('neighborhoods').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('property_submissions').select('*, profiles(email)').eq('status', 'pending').order('created_at', { ascending: false }),
      ]);

      const allListings = listings.data ?? [];
      const active = allListings.filter((l) => l.status === 'active');
      const pending = allListings.filter((l) => l.status === 'pending');
      const avgPrice = active.length > 0
        ? Math.round(active.reduce((sum, l) => sum + l.price, 0) / active.length)
        : 0;

      setStats({
        totalListings: allListings.length,
        activeListings: active.length,
        pendingListings: pending.length,
        totalBuildings: buildings.count ?? 0,
        totalNeighborhoods: neighborhoods.count ?? 0,
        totalUsers: users.count ?? 0,
        avgPrice,
      });
      setPendingSubmissions((submissions.data ?? []) as unknown as SubmissionSummary[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const approveSubmission = async (id: string) => {
    await supabase.from('property_submissions').update({ status: 'approved' }).eq('id', id);
    loadStats();
  };

  const rejectSubmission = async (id: string) => {
    await supabase.from('property_submissions').update({ status: 'rejected' }).eq('id', id);
    loadStats();
  };

  if (authLoading || (user && !profile)) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile?.is_admin) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your property listings, buildings, and neighborhoods.</p>
        </div>
        <Button variant="ghost" onClick={() => signOut()} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Home} label="Total Listings" value={stats.totalListings} color="text-primary" />
        <StatCard icon={CheckCircle} label="Active" value={stats.activeListings} color="text-green-600" />
        <StatCard icon={Clock} label="Pending" value={stats.pendingListings} color="text-orange-600" />
        <StatCard icon={DollarSign} label="Avg Rent" value={stats.avgPrice ? `$${stats.avgPrice.toLocaleString()}` : '0'} color="text-primary" />
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickLink href="/admin/listings" icon={Home} title="Manage Listings" description={`${stats.totalListings} total`} />
        <QuickLink href="/admin/buildings" icon={Building2} title="Manage Buildings" description={`${stats.totalBuildings} total`} />
        <QuickLink href="/admin/neighborhoods" icon={MapPin} title="Manage Neighborhoods" description={`${stats.totalNeighborhoods} total`} />
        <QuickLink href="/admin/users" icon={Users} title="Manage Users" description={`${stats.totalUsers} total`} />
        <QuickLink href="/admin/settings" icon={Settings} title="Settings" description="Platform configuration" />
        <QuickLink href="/admin/pending" icon={FileClock} title="Pending Submissions" description={`${pendingSubmissions.length} awaiting review`} />
        <QuickLink href="/admin/roommate-interests" icon={Users} title="Roommate Interests" description="Review and follow up" />
      </div>

      {/* Pending submissions */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Pending Property Submissions
            {pendingSubmissions.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700">{pendingSubmissions.length}</Badge>
            )}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : pendingSubmissions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p>No pending submissions to review.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingSubmissions.map((sub) => {
              const d = sub.submission_data;
              return (
                <div key={sub.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{d.title ?? 'Untitled'}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {d.price && <span>{formatPrice(d.price)}/mo</span>}
                      {d.bedrooms != null && <span>{d.bedrooms} bed · {d.bathrooms} bath</span>}
                      {d.neighborhood_name && <span>{d.neighborhood_name}</span>}
                      <span>by {sub.profiles?.email ?? 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => rejectSubmission(sub.id)}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => approveSubmission(sub.id)} className="gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <Icon className={`h-5 w-5 ${color} mb-2`} />
      <p className="font-serif text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-xl border border-border p-5 transition-all hover:shadow-md hover:border-primary/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

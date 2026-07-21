'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileClock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/services';

export default function AdminPendingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
    if (profile?.is_admin) loadSubmissions();
  }, [user, profile, authLoading]);

  const loadSubmissions = async () => {
    try {
      const { data } = await supabase
        .from('property_submissions')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false });
      setSubmissions(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('property_submissions').update({ status }).eq('id', id);
    setViewing(null);
    loadSubmissions();
  };

  if (authLoading || (user && !profile)) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile?.is_admin) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const pending = submissions.filter((s) => s.status === 'pending');
  const reviewed = submissions.filter((s) => s.status !== 'pending');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
        </Button>
        <h1 className="font-serif text-3xl font-bold">Pending Submissions</h1>
        <p className="text-muted-foreground mt-1">Review and approve property submissions from users.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <>
          {/* Pending */}
          <div className="mb-8">
            <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
              <FileClock className="h-5 w-5 text-orange-600" />
              Awaiting Review ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-2xl">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No pending submissions.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {pending.map((sub) => {
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
                          <Button size="sm" variant="ghost" onClick={() => setViewing(sub)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus(sub.id, 'rejected')}>
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => updateStatus(sub.id, 'approved')} className="gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reviewed */}
          {reviewed.length > 0 && (
            <div>
              <h2 className="font-serif text-xl font-bold mb-4">Recently Reviewed</h2>
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {reviewed.slice(0, 10).map((sub) => {
                    const d = sub.submission_data;
                    return (
                      <div key={sub.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{d.title ?? 'Untitled'}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {d.price && <span>{formatPrice(d.price)}/mo</span>}
                            <span>by {sub.profiles?.email ?? 'Unknown'}</span>
                          </div>
                        </div>
                        <Badge className={sub.status === 'approved' ? 'bg-green-600' : 'bg-red-500'}>
                          {sub.status === 'approved' ? 'Approved' : 'Rejected'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* View dialog */}
      {viewing && (
        <Dialog open onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewing.submission_data.title ?? 'Untitled Property'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {Object.entries(viewing.submission_data).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-right max-w-[60%] truncate">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                     Array.isArray(value) ? value.join(', ') :
                     value?.toString() ?? '-'}
                  </span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" className="text-destructive" onClick={() => updateStatus(viewing.id, 'rejected')}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button onClick={() => updateStatus(viewing.id, 'approved')} className="gap-1">
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

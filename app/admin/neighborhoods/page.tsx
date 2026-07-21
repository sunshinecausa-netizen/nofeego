'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Neighborhood } from '@/lib/types';

export default function AdminNeighborhoodsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Neighborhood | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
    if (profile?.is_admin) loadData();
  }, [user, profile, authLoading]);

  const loadData = async () => {
    try {
      const { data } = await supabase.from('neighborhoods').select('*').order('name');
      setNeighborhoods(data as Neighborhood[] ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this neighborhood? Buildings and listings will lose their neighborhood reference.')) return;
    await supabase.from('neighborhoods').delete().eq('id', id);
    loadData();
  };

  const filtered = neighborhoods.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || (user && !profile)) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile?.is_admin) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
          </Button>
          <h1 className="font-serif text-3xl font-bold">Manage Neighborhoods</h1>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Neighborhood
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search neighborhoods..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No neighborhoods found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Borough</TableHead>
                <TableHead>Avg Rent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell className="text-sm">{n.borough}</TableCell>
                  <TableCell className="text-sm">{n.avg_rent ? `$${n.avg_rent.toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(n); setShowForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(n.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showForm && (
        <NeighborhoodForm
          neighborhood={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); loadData(); }}
        />
      )}
    </div>
  );
}

function NeighborhoodForm({
  neighborhood,
  onClose,
  onSaved,
}: {
  neighborhood: Neighborhood | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: neighborhood?.name ?? '',
    slug: neighborhood?.slug ?? '',
    borough: neighborhood?.borough ?? 'Manhattan',
    description: neighborhood?.description ?? '',
    avg_rent: neighborhood?.avg_rent?.toString() ?? '',
    latitude: neighborhood?.latitude?.toString() ?? '',
    longitude: neighborhood?.longitude?.toString() ?? '',
    hero_image: neighborhood?.hero_image ?? '',
    highlights: (neighborhood?.highlights ?? []).join(', '),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const highlightsArray = form.highlights.split(',').map((s) => s.trim()).filter(Boolean);
      const data = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        borough: form.borough,
        description: form.description || null,
        avg_rent: form.avg_rent ? parseInt(form.avg_rent) : null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        hero_image: form.hero_image || null,
        highlights: highlightsArray.length ? highlightsArray : null,
      };

      if (neighborhood) {
        const { error } = await supabase.from('neighborhoods').update(data).eq('id', neighborhood.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('neighborhoods').insert(data);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{neighborhood ? 'Edit Neighborhood' : 'New Neighborhood'}</DialogTitle>
        </DialogHeader>
        {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 border border-destructive/20">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Borough</Label>
              <Input value={form.borough} onChange={(e) => setForm({ ...form, borough: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Avg Rent</Label>
              <Input type="number" value={form.avg_rent} onChange={(e) => setForm({ ...form, avg_rent: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hero Image URL</Label>
            <Input value={form.hero_image} onChange={(e) => setForm({ ...form, hero_image: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Highlights (comma-separated)</Label>
            <Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} placeholder="Central Park, Dining, Nightlife" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {neighborhood ? 'Save Changes' : 'Create Neighborhood'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

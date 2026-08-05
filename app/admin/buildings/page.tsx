'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Building, Neighborhood } from '@/lib/types';

export default function AdminBuildingsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Building | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
    if (profile?.is_admin) loadData();
  }, [user, profile, authLoading]);

  async function loadData() {
    try {
      const [b, n] = await Promise.all([
        supabase.from('buildings').select('*, neighborhoods(name)').order('name'),
        supabase.from('neighborhoods').select('id, name').order('name'),
      ]);
      setBuildings(b.data as Building[] ?? []);
      setNeighborhoods(n.data as Neighborhood[] ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this building? Listings in this building will remain but lose the building reference.')) return;
    await supabase.from('buildings').delete().eq('id', id);
    loadData();
  };

  const filtered = buildings.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="font-serif text-3xl font-bold">Manage Buildings</h1>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Building
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search buildings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No buildings found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Neighborhood</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{b.address}</TableCell>
                  <TableCell className="text-sm">{b.neighborhoods?.name ?? '-'}</TableCell>
                  <TableCell>{b.building_type && <Badge variant="secondary" className="text-xs">{b.building_type}</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setShowForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)} className="text-destructive">
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
        <BuildingForm
          building={editing}
          neighborhoods={neighborhoods}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); loadData(); }}
        />
      )}
    </div>
  );
}

function BuildingForm({
  building,
  neighborhoods,
  onClose,
  onSaved,
}: {
  building: Building | null;
  neighborhoods: Neighborhood[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: building?.name ?? '',
    slug: building?.slug ?? '',
    neighborhood_id: building?.neighborhood_id ?? '',
    address: building?.address ?? '',
    zip_code: building?.zip_code ?? '',
    latitude: building?.latitude?.toString() ?? '',
    longitude: building?.longitude?.toString() ?? '',
    description: building?.description ?? '',
    building_type: building?.building_type ?? '',
    amenities: (building?.amenities ?? []).join(', '),
    year_built: building?.year_built?.toString() ?? '',
    floors: building?.floors?.toString() ?? '',
    hero_image: building?.hero_image ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const amenitiesArray = form.amenities.split(',').map((s) => s.trim()).filter(Boolean);
      const data = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
        neighborhood_id: form.neighborhood_id || null,
        address: form.address,
        zip_code: form.zip_code || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        description: form.description || null,
        building_type: form.building_type || null,
        amenities: amenitiesArray.length ? amenitiesArray : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        floors: form.floors ? parseInt(form.floors) : null,
        hero_image: form.hero_image || null,
      };

      if (building) {
        const { error } = await supabase.from('buildings').update(data).eq('id', building.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('buildings').insert(data);
        if (error) throw error;
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save building.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{building ? 'Edit Building' : 'New Building'}</DialogTitle>
        </DialogHeader>
        {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 border border-destructive/20">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Neighborhood</Label>
              <Select value={form.neighborhood_id} onValueChange={(v) => setForm({ ...form, neighborhood_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {neighborhoods.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Building Type</Label>
              <Input value={form.building_type} onChange={(e) => setForm({ ...form, building_type: e.target.value })} placeholder="e.g., Pre-war Luxury" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="40.7736" />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-73.9560" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year Built</Label>
              <Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Floors</Label>
              <Input type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hero Image URL</Label>
            <Input value={form.hero_image} onChange={(e) => setForm({ ...form, hero_image: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Amenities (comma-separated)</Label>
            <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Doorman, Elevator, Gym" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {building ? 'Save Changes' : 'Create Building'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

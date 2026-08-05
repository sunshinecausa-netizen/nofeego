'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Check, X, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Listing, Building, Neighborhood } from '@/lib/types';
import { STATUS_LABELS, LISTING_TYPE_LABELS, PET_POLICY_OPTIONS, BEDROOM_OPTIONS, BATHROOM_OPTIONS, LEASE_TERM_OPTIONS } from '@/lib/types';
import { formatPrice } from '@/lib/data';

export default function AdminListingsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
    if (profile?.is_admin) loadData();
  }, [user, profile, authLoading]);

  async function loadData() {
    try {
      const [l, b, n] = await Promise.all([
        supabase.from('listings').select('*, buildings(name), neighborhoods(name)').order('created_at', { ascending: false }),
        supabase.from('buildings').select('id, name').order('name'),
        supabase.from('neighborhoods').select('id, name').order('name'),
      ]);
      setListings(l.data as Listing[] ?? []);
      setBuildings(b.data as Building[] ?? []);
      setNeighborhoods(n.data as Neighborhood[] ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    await supabase.from('listings').delete().eq('id', id);
    loadData();
  };

  const toggleStatus = async (listing: Listing) => {
    const newStatus = listing.status === 'active' ? 'inactive' : 'active';
    await supabase.from('listings').update({ status: newStatus }).eq('id', listing.id);
    loadData();
  };

  const filtered = listings.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.neighborhoods?.name?.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="font-serif text-3xl font-bold">Manage Listings</h1>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Listing
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No listings found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Beds/Baths</TableHead>
                <TableHead>Neighborhood</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium max-w-xs truncate">{listing.title}</TableCell>
                  <TableCell>{formatPrice(listing.price)}</TableCell>
                  <TableCell className="text-sm">{listing.bedrooms} / {listing.bathrooms}</TableCell>
                  <TableCell className="text-sm">{listing.neighborhoods?.name ?? '-'}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{LISTING_TYPE_LABELS[listing.listing_type]}</Badge></TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(listing)}>
                      <Badge className={`text-xs cursor-pointer ${listing.status === 'active' ? 'bg-green-600' : listing.status === 'pending' ? 'bg-orange-500' : 'bg-gray-400'}`}>
                        {STATUS_LABELS[listing.status]}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(listing); setShowForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(listing.id)} className="text-destructive">
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

      {/* Form dialog */}
      {showForm && (
        <ListingForm
          listing={editing}
          buildings={buildings}
          neighborhoods={neighborhoods}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); loadData(); }}
        />
      )}
    </div>
  );
}

function ListingForm({
  listing,
  buildings,
  neighborhoods,
  onClose,
  onSaved,
}: {
  listing: Listing | null;
  buildings: Building[];
  neighborhoods: Neighborhood[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: listing?.title ?? '',
    slug: listing?.slug ?? '',
    neighborhood_id: listing?.neighborhood_id ?? '',
    building_id: listing?.building_id ?? '',
    unit_number: listing?.unit_number ?? '',
    price: listing?.price.toString() ?? '',
    bedrooms: listing?.bedrooms.toString() ?? '1',
    bathrooms: listing?.bathrooms.toString() ?? '1',
    sqft: listing?.sqft?.toString() ?? '',
    furnished: listing?.furnished ?? false,
    pet_policy: listing?.pet_policy ?? 'pets_allowed',
    move_in_date: listing?.move_in_date ?? '',
    lease_term_months: listing?.lease_term_months?.toString() ?? '12',
    listing_type: listing?.listing_type ?? 'rental',
    status: listing?.status ?? 'active',
    description: listing?.description ?? '',
    images: (listing?.images ?? []).join('\n'),
    amenities: (listing?.amenities ?? []).join(', '),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const imagesArray = form.images.split('\n').map((s) => s.trim()).filter(Boolean);
      const amenitiesArray = form.amenities.split(',').map((s) => s.trim()).filter(Boolean);
      const data = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
        neighborhood_id: form.neighborhood_id || null,
        building_id: form.building_id || null,
        unit_number: form.unit_number || null,
        price: parseInt(form.price),
        bedrooms: parseFloat(form.bedrooms),
        bathrooms: parseFloat(form.bathrooms),
        sqft: form.sqft ? parseInt(form.sqft) : null,
        furnished: form.furnished,
        pet_policy: form.pet_policy,
        move_in_date: form.move_in_date || null,
        lease_term_months: parseInt(form.lease_term_months),
        listing_type: form.listing_type,
        status: form.status,
        description: form.description || null,
        images: imagesArray.length ? imagesArray : null,
        amenities: amenitiesArray.length ? amenitiesArray : null,
      };

      if (listing) {
        const { error } = await supabase.from('listings').update(data).eq('id', listing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('listings').insert(data);
        if (error) throw error;
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save listing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing ? 'Edit Listing' : 'New Listing'}</DialogTitle>
        </DialogHeader>
        {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 border border-destructive/20">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
              <Label>Building</Label>
              <Select value={form.building_id} onValueChange={(v) => setForm({ ...form, building_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price/mo *</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Select value={form.bedrooms} onValueChange={(v) => setForm({ ...form, bedrooms: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BEDROOM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Select value={form.bathrooms} onValueChange={(v) => setForm({ ...form, bathrooms: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BATHROOM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sqft</Label>
              <Input type="number" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Listing Type</Label>
              <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="short_stay">Short Stay</SelectItem>
                  <SelectItem value="shared_living">Shared Living</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pet Policy</Label>
              <Select value={form.pet_policy} onValueChange={(v) => setForm({ ...form, pet_policy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PET_POLICY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lease Term</Label>
              <Select value={form.lease_term_months} onValueChange={(v) => setForm({ ...form, lease_term_months: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEASE_TERM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Move-in Date</Label>
              <Input type="date" value={form.move_in_date} onChange={(e) => setForm({ ...form, move_in_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Unit Number</Label>
              <Input value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
            <Switch id="furnished-edit" checked={form.furnished} onCheckedChange={(c) => setForm({ ...form, furnished: c })} />
            <Label htmlFor="furnished-edit">Furnished</Label>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Image URLs (one per line)</Label>
            <Textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Amenities (comma-separated)</Label>
            <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {listing ? 'Save Changes' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Home, DollarSign, Calendar, Check, ChevronRight, ChevronLeft,
  Loader2, ImagePlus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { submitProperty } from '@/lib/services';
import { fetchNeighborhoods } from '@/lib/data';
import type { Neighborhood } from '@/lib/types';
import { PET_POLICY_OPTIONS, BEDROOM_OPTIONS, BATHROOM_OPTIONS, LEASE_TERM_OPTIONS } from '@/lib/types';

const STEPS = ['Property Details', 'Pricing & Terms', 'Photos & Description', 'Review'];

export default function ListYourPropertyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    neighborhood_id: '',
    building_name: '',
    address: '',
    unit_number: '',
    price: '',
    bedrooms: '1',
    bathrooms: '1',
    sqft: '',
    furnished: false,
    pet_policy: 'pets_allowed',
    move_in_date: '',
    lease_term_months: '12',
    listing_type: 'rental',
    description: '',
    amenities: '',
    images: [] as string[],
    contact_email: '',
    contact_phone: '',
  });

  useEffect(() => {
    fetchNeighborhoods().then(setNeighborhoods).catch(console.error);
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold mb-2">Sign In Required</h1>
        <p className="text-muted-foreground mb-6">Please sign in to list your property.</p>
        <Button asChild>
          <a href="/sign-in">Sign In</a>
        </Button>
      </div>
    );
  }

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm({ ...form, [key]: value });

  const canProceed = () => {
    if (step === 0) return form.title && form.neighborhood_id && form.address;
    if (step === 1) return form.price;
    if (step === 2) return form.description;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const neighborhood = neighborhoods.find((n) => n.id === form.neighborhood_id);
      const amenitiesArray = form.amenities.split(',').map((a) => a.trim()).filter(Boolean);

      await submitProperty({
        title: form.title,
        neighborhood_id: form.neighborhood_id,
        neighborhood_name: neighborhood?.name ?? null,
        building_name: form.building_name,
        address: form.address,
        unit_number: form.unit_number,
        price: parseInt(form.price),
        bedrooms: parseFloat(form.bedrooms),
        bathrooms: parseFloat(form.bathrooms),
        sqft: form.sqft ? parseInt(form.sqft) : null,
        furnished: form.furnished,
        pet_policy: form.pet_policy,
        move_in_date: form.move_in_date || null,
        lease_term_months: parseInt(form.lease_term_months),
        listing_type: form.listing_type,
        description: form.description,
        amenities: amenitiesArray,
        images: form.images.filter(Boolean),
        contact_email: form.contact_email || user.email || null,
        contact_phone: form.contact_phone,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit property.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl font-bold mb-2">Property Submitted!</h1>
        <p className="text-muted-foreground mb-6">
          Your property has been submitted for review. An administrator will review and approve it before it appears publicly on the site.
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">List Your Property</h1>
        <p className="text-muted-foreground">Reach thousands of qualified renters searching for apartments in Manhattan.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 border border-destructive/20 mb-4">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold">Property Details</h2>
            <div className="space-y-2">
              <Label htmlFor="title">Listing Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="e.g., Spacious 2BR in the Upper East Side" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Neighborhood *</Label>
                <Select value={form.neighborhood_id} onValueChange={(v) => updateForm('neighborhood_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select neighborhood" /></SelectTrigger>
                  <SelectContent>
                    {neighborhoods.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="building">Building Name</Label>
                <Input id="building" value={form.building_name} onChange={(e) => updateForm('building_name', e.target.value)} placeholder="e.g., The Beresford" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input id="address" value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="e.g., 211 Central Park West" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit Number</Label>
                <Input id="unit" value={form.unit_number} onChange={(e) => updateForm('unit_number', e.target.value)} placeholder="e.g., 14A" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Select value={form.bedrooms} onValueChange={(v) => updateForm('bedrooms', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BEDROOM_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Select value={form.bathrooms} onValueChange={(v) => updateForm('bathrooms', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BATHROOM_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sqft">Square Feet</Label>
                <Input id="sqft" type="number" value={form.sqft} onChange={(e) => updateForm('sqft', e.target.value)} placeholder="e.g., 1100" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold">Pricing & Terms</h2>
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Rent ($) *</Label>
              <Input id="price" type="number" value={form.price} onChange={(e) => updateForm('price', e.target.value)} placeholder="e.g., 4500" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Listing Type</Label>
                <Select value={form.listing_type} onValueChange={(v) => updateForm('listing_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">Long-Term Rental</SelectItem>
                    <SelectItem value="short_stay">Short Stay</SelectItem>
                    <SelectItem value="shared_living">Shared Living</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lease Term</Label>
                <Select value={form.lease_term_months} onValueChange={(v) => updateForm('lease_term_months', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEASE_TERM_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moveIn">Move-in Date</Label>
                <Input id="moveIn" type="date" value={form.move_in_date} onChange={(e) => updateForm('move_in_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pet Policy</Label>
                <Select value={form.pet_policy} onValueChange={(v) => updateForm('pet_policy', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PET_POLICY_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg">
              <Switch id="furnished" checked={form.furnished} onCheckedChange={(checked) => updateForm('furnished', checked)} />
              <Label htmlFor="furnished" className="cursor-pointer">This apartment is furnished</Label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" value={form.contact_email} onChange={(e) => updateForm('contact_email', e.target.value)} placeholder={user.email ?? 'you@example.com'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input id="contactPhone" value={form.contact_phone} onChange={(e) => updateForm('contact_phone', e.target.value)} placeholder="(212) 555-0100" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold">Photos & Description</h2>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Describe your apartment — what makes it special? Mention views, natural light, building amenities, etc." rows={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities (comma-separated)</Label>
              <Input id="amenities" value={form.amenities} onChange={(e) => updateForm('amenities', e.target.value)} placeholder="e.g., Hardwood floors, Dishwasher, Central AC, Doorman" />
            </div>
            <div className="space-y-2">
              <Label>Image URLs</Label>
              <div className="space-y-2">
                {form.images.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={url} onChange={(e) => { const images = [...form.images]; images[i] = e.target.value; updateForm('images', images); }} placeholder="https://images.pexels.com/..." />
                    <Button type="button" variant="ghost" size="icon" onClick={() => updateForm('images', form.images.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => updateForm('images', [...form.images, ''])} className="gap-1">
                  <ImagePlus className="h-4 w-4" /> Add Image URL
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold">Review & Submit</h2>
            <div className="space-y-3 text-sm">
              <ReviewRow label="Title" value={form.title} />
              <ReviewRow label="Neighborhood" value={neighborhoods.find((n) => n.id === form.neighborhood_id)?.name ?? '-'} />
              <ReviewRow label="Address" value={form.address} />
              <ReviewRow label="Monthly Rent" value={form.price ? `$${parseInt(form.price).toLocaleString()}` : '-'} />
              <ReviewRow label="Bedrooms" value={BEDROOM_OPTIONS.find((o) => o.value === form.bedrooms)?.label ?? form.bedrooms} />
              <ReviewRow label="Bathrooms" value={BATHROOM_OPTIONS.find((o) => o.value === form.bathrooms)?.label ?? form.bathrooms} />
              <ReviewRow label="Furnished" value={form.furnished ? 'Yes' : 'No'} />
              <ReviewRow label="Pet Policy" value={PET_POLICY_OPTIONS.find((o) => o.value === form.pet_policy)?.label ?? form.pet_policy} />
              <ReviewRow label="Lease Term" value={LEASE_TERM_OPTIONS.find((o) => o.value === form.lease_term_months)?.label ?? form.lease_term_months} />
              <ReviewRow label="Move-in Date" value={form.move_in_date || 'Flexible'} />
              <ReviewRow label="Description" value={form.description ? `${form.description.slice(0, 100)}...` : '-'} />
              <ReviewRow label="Images" value={`${form.images.filter(Boolean).length} image(s)`} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Note:</strong> Your listing will be submitted as <strong>Pending</strong> and will not appear publicly until an administrator reviews and approves it.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>) : ('Submit Property')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || '-'}</span>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Settings as SettingsIcon, Globe, MapPin, Mail, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    siteName: 'ManhattanLiving',
    siteDescription: 'Find your perfect Manhattan apartment. Browse rentals, short stays, and shared living across NYC\'s best neighborhoods.',
    contactEmail: 'contact@manhattanliving.com',
    contactPhone: '(212) 555-0100',
    defaultCity: 'New York',
    defaultState: 'NY',
    googleMapsApiKey: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/sign-in'); return; }
    if (profile && !profile.is_admin) { router.push('/'); return; }
  }, [user, profile, authLoading]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // In Phase 1, settings are layout-only. In production, these would be saved to a settings table.
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  if (authLoading || (user && !profile)) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile?.is_admin) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
        </Button>
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your platform settings. These are layout-only in Phase 1.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
        {saved && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 border border-green-200">
            Settings saved successfully.
          </div>
        )}

        {/* General */}
        <div>
          <h2 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" /> General
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input id="siteName" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea id="siteDescription" value={settings.siteDescription} onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })} rows={3} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Contact
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" value={settings.contactPhone} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <h2 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Default Location
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultCity">Default City</Label>
              <Input id="defaultCity" value={settings.defaultCity} onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultState">Default State</Label>
              <Input id="defaultState" value={settings.defaultState} onChange={(e) => setSettings({ ...settings, defaultState: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div>
          <h2 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Integrations
          </h2>
          <div className="space-y-2">
            <Label htmlFor="googleMaps">Google Maps API Key</Label>
            <Input
              id="googleMaps"
              type="password"
              value={settings.googleMapsApiKey}
              onChange={(e) => setSettings({ ...settings, googleMapsApiKey: e.target.value })}
              placeholder="Enter your Google Maps JavaScript API key"
            />
            <p className="text-xs text-muted-foreground">
              This key will be used for the interactive map. For now, the map uses a placeholder component.
              The actual key should be set as <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Badge variant="secondary" className="text-xs">Phase 1 — Layout Only</Badge>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}

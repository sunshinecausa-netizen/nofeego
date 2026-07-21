'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Home, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push('/sign-in');
  }, [loading, user]);

  if (loading || !user) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-serif text-3xl font-bold mb-6">My Account</h1>

      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
            {profile?.display_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold">{profile?.display_name || 'User'}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {profile?.is_admin && (
              <span className="inline-block mt-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/list-your-property" className="group">
          <div className="bg-white rounded-xl border border-border p-5 transition-all hover:shadow-md hover:border-primary/30">
            <Home className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold group-hover:text-primary transition-colors">List a Property</h3>
            <p className="text-sm text-muted-foreground">Submit a new apartment listing.</p>
          </div>
        </Link>
        {profile?.is_admin && (
          <Link href="/admin" className="group">
            <div className="bg-white rounded-xl border border-border p-5 transition-all hover:shadow-md hover:border-primary/30">
              <Building2 className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold group-hover:text-primary transition-colors">Admin Dashboard</h3>
              <p className="text-sm text-muted-foreground">Manage all listings, buildings, and neighborhoods.</p>
            </div>
          </Link>
        )}
      </div>

      <Button variant="outline" onClick={() => signOut()} className="mt-6 gap-2">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}

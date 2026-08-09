'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const returnPath = () => {
    const value = new URLSearchParams(window.location.search).get('next');
    return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
  };

  useEffect(() => {
    if (!authLoading && user) router.replace(returnPath());
  }, [authLoading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/sign-in?next=${encodeURIComponent(returnPath())}` } });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setMagicLinkSent(true);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/sign-in?next=${encodeURIComponent(returnPath())}` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const [magicLinkSent, setMagicLinkSent] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-accent/30 to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="font-serif text-2xl font-bold">
              Manhattan<span className="text-primary">Living</span>
            </span>
          </Link>
          <h1 className="font-serif text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Sign in to save, compare, and manage your rental requests.</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-lg p-6 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 border border-destructive/20">
              {error}
            </div>
          )}

          <Button variant="outline" className="w-full gap-2" size="lg" onClick={handleGoogle} disabled={googleLoading}>
            {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="pl-10" />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>) : ('Email me a magic link')}
            </Button>
            {magicLinkSent && <p role="status" className="rounded-lg bg-success/15 p-3 text-sm text-foreground">Check your email for a secure sign-in link. You can close this tab after opening it.</p>}
          </form>
          <p className="text-center text-xs text-muted-foreground">No password required. A tenant profile is created automatically after your first sign-in.</p>
        </div>
      </div>
    </div>
  );
}

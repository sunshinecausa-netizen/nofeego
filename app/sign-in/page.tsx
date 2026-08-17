'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { authCallbackUrl, safeAuthNext } from '@/lib/auth/redirects';
import { AuthShell } from '@/components/auth-shell';

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

type SignInPortal = 'tenant' | 'agent';

export function SignInExperience({ portal = 'tenant' }: { portal?: SignInPortal }) {
  const router = useRouter();
  const { user, profile, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [nextPath, setNextPath] = useState(portal === 'agent' ? '/agent/cases' : '/dashboard');

  const requestedReturnPath = () => {
    const value = new URLSearchParams(window.location.search).get('next');
    return value ? safeAuthNext(value) : null;
  };

  const roleHome = useCallback(() => profile?.authorization_status !== 'active' ? '/access-pending' : profile?.account_role === 'agent' ? '/agent/cases' : profile?.account_role === 'property' ? '/property/registrations' : profile?.account_role === 'admin' || profile?.is_admin ? '/admin/rental-cases' : '/', [profile]);

  const portalDestination = useCallback(() => {
    if (portal !== 'agent') return requestedReturnPath() ?? roleHome();
    if (profile?.authorization_status !== 'active' || profile.account_role !== 'agent') return roleHome();
    const requested = requestedReturnPath();
    return requested === '/agent' || requested?.startsWith('/agent/') ? requested : '/agent/cases';
  }, [portal, profile, roleHome]);

  const callbackReturnPath = () => portal === 'agent'
    ? `/agent/sign-in?next=${encodeURIComponent(requestedReturnPath() === '/agent' || requestedReturnPath()?.startsWith('/agent/') ? requestedReturnPath()! : '/agent/cases')}`
    : requestedReturnPath();

  useEffect(() => {
    queueMicrotask(() => setNextPath(requestedReturnPath() ?? '/'));
    if (!authLoading && user && profile) { router.replace(portalDestination()); }
  }, [authLoading, portalDestination, profile, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl(window.location.origin, callbackReturnPath()) },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError(null); setMagicLinkSent(false);
    if (!email) { setError('Enter your email address first.'); return; }
    setMagicLoading(true);
    const next = callbackReturnPath();
    const { error: magicError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: authCallbackUrl(window.location.origin, next) } });
    setMagicLoading(false);
    if (magicError) setError(magicError.message); else setMagicLinkSent(true);
  };

  return (
    <AuthShell mode={portal === 'agent' ? 'feature' : 'overlay'} eyebrow={portal === 'agent' ? 'NYC HOMES AGENT PORTAL' : 'Secure account access'} title={portal === 'agent' ? 'Manage your rental clients' : 'Welcome back'} description={portal === 'agent' ? 'Review assigned rental cases, share verified options, coordinate with properties, and keep every deal moving.' : 'Sign in without leaving your NYC rental search.'} feature={portal === 'agent' ? { badge: 'NYC Homes professional workspace', heading: 'Move every rental case forward.', accent: 'One verified workflow.', description: 'Work from assigned client demand through recommendations, property coordination, tours, applications, and signed leases.', points: ['View assigned rental cases','Review current inventory and concessions','Send verified recommendations','Register clients with leasing teams','Track tours, applications, and signed leases'] } : undefined} footer={portal === 'agent' ? 'Agent access is provided by NYC Homes. Contact an administrator if you need access.' : undefined}>
        <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required className="pl-10" />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>) : ('Sign In')}
            </Button>
            <Button type="button" variant="outline" className="w-full" size="lg" disabled={magicLoading} onClick={handleMagicLink}>
              {magicLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : portal === 'agent' ? 'Continue with email' : 'Email me a magic link'}
            </Button>
            {magicLinkSent && <p role="status" className="rounded-lg bg-success/15 p-3 text-sm">Check your email. The link returns to your original task and can only be used once.</p>}
          </form>
          {portal !== 'agent' && <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href={`/sign-up?next=${encodeURIComponent(nextPath)}`} className="font-medium text-primary hover:underline">Create one</Link>
          </p>}
        </div>
    </AuthShell>
  );
}

export default function SignInPage() { return <SignInExperience />; }

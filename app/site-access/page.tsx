import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const metadata = {
  title: 'Private Access — NoFeeGo',
  robots: { index: false, follow: false },
};

export default async function SiteAccessPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const destination = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/buildings';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-xl sm:p-8" aria-labelledby="access-title">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><LockKeyhole className="h-6 w-6" /></div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">NoFeeGo private preview</p>
        <h1 id="access-title" className="font-serif text-2xl font-bold text-foreground">Enter access details</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">This site is temporarily available to approved reviewers only.</p>

        <form action="/api/site-access" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={destination} />
          <div><label htmlFor="username" className="mb-1.5 block text-sm font-medium">Username</label><Input id="username" name="username" autoComplete="username" required autoFocus /></div>
          <div><label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
          {params.error === '1' && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">The username or password is incorrect.</p>}
          <Button type="submit" className="min-h-11 w-full">Continue</Button>
        </form>
      </section>
    </main>
  );
}

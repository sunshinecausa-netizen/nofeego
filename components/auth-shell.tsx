import { Building2, CheckCircle2, MapPin } from 'lucide-react';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  mode = 'feature',
  feature,
  footer = 'Protected account access for ManhattanLiving by NoFeeGo.',
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  mode?: 'feature' | 'overlay';
  feature?: { badge: string; heading: string; accent: string; description: string; points: string[] };
  footer?: string;
}) {
  if (mode === 'overlay') {
    return (
      <section className="w-full max-w-md rounded-3xl border bg-background/95 p-5 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-7">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">{children}</div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{footer}</p>
      </section>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1440px] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]">
        <section className="relative hidden overflow-hidden bg-[hsl(var(--navy))] px-10 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90">
              <Building2 className="h-4 w-4 text-primary" />
              {feature?.badge ?? 'NYC rental search, in one place'}
            </div>
            <h2 className="mt-8 max-w-xl font-serif text-5xl font-bold leading-[1.08] text-white xl:text-6xl">
              {feature?.heading ?? 'Find the right home.'}<br /><span className="text-primary">{feature?.accent ?? 'Keep every next step clear.'}</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
              {feature?.description ?? 'Browse current buildings, compare options, and work with the right people from request to lease.'}
            </p>
          </div>

          {feature ? <ul className="relative grid gap-3 sm:grid-cols-2">
            {feature.points.map((point) => <li key={point} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white/90 backdrop-blur-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{point}</li>)}
          </ul> : <div className="relative grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold text-white">One private Rental Case</p>
              <p className="mt-1 text-sm leading-6 text-white/65">Your selected building, current options, and status stay together.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold text-white">Role-based, secure access</p>
              <p className="mt-1 text-sm leading-6 text-white/65">Tenant, Agent, Property, and Admin each see only what they need.</p>
            </div>
          </div>}
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="mb-7">
              <p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">{eyebrow}</p>
              <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-elevated)] sm:p-7">
              {children}
            </div>
            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              {footer}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

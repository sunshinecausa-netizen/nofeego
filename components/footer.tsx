'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOOTER_LINKS = [
  {
    title: 'Browse',
    links: [
      { label: 'Buildings', href: '/buildings' },
      { label: 'Neighborhoods', href: '/neighborhoods' },
      { label: 'Short Stays', href: '/search?listingType=short_stay' },
      { label: 'Shared Living', href: '/search?listingType=shared_living' },
    ],
  },
  {
    title: 'Neighborhoods',
    links: [
      { label: 'Upper East Side', href: '/neighborhoods/upper-east-side' },
      { label: 'West Village', href: '/neighborhoods/west-village' },
      { label: 'Chelsea', href: '/neighborhoods/chelsea' },
      { label: 'Tribeca', href: '/neighborhoods/tribeca' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'List Your Property', href: '/list-your-property' },
      { label: 'Sign In', href: '/sign-in' },
      { label: 'Sign Up', href: '/sign-up' },
      { label: 'Admin', href: '/admin' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
];

export function Footer({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  if (!embedded && (pathname === '/' || pathname === '/buildings' || pathname === '/search')) return null;
  return (
    <footer className={cn('border-t border-border bg-muted/30 mt-auto', embedded && 'mt-6')}>
      <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12', embedded && 'px-4 py-8 sm:px-4 lg:px-4')}>
        <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-8', embedded && 'grid-cols-2 gap-6 md:grid-cols-2')}>
          <div className={cn('col-span-2 md:col-span-1', embedded && 'md:col-span-2')}>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-serif text-lg font-bold">
                Manhattan<span className="text-primary">Living</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Find your perfect Manhattan apartment. Browse rentals, short stays, and shared living across NYC.
            </p>
          </div>

          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-foreground mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={cn('mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4', embedded && 'mt-8 items-start pt-6 sm:flex-col sm:items-start')}>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ManhattanLiving. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Building photos from Pexels. Street-level imagery © Google; Google Maps terms apply.</p>
        </div>
      </div>
    </footer>
  );
}

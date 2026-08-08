'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, LogIn, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-border transition-all duration-200 ${scrolled ? 'bg-white/95 shadow-sm backdrop-blur-md' : 'bg-white'}`}>
      <div className="flex h-16 w-full items-center justify-between gap-2 px-3 sm:px-5">
        <Link href="/" className="group flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="hidden truncate font-serif text-xl font-bold tracking-tight text-foreground min-[430px]:inline">
            Manhattan<span className="text-primary">Living</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
            <Link href="/list-your-property">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">List Your Property</span>
              <span className="sm:hidden">List Property</span>
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-in">
              <LogIn className="mr-1.5 h-4 w-4" />
              Sign In
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

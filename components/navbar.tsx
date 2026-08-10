'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Building2, GitCompareArrows, Heart, Languages, LayoutDashboard, LogIn, LogOut, MessageSquare, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useTenantData } from '@/lib/account/tenant-data-context';
import { useLocale } from '@/components/locale-provider';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { favoriteIds, compareIds } = useTenantData();
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const englishPath = pathname.replace(/^\/zh-hans(?=\/|$)/, '') || '/';
  const languageHref = `${locale === 'zh-Hans' ? englishPath : englishPath === '/' ? '/zh-hans' : `/zh-hans${englishPath}`}${searchParams.size ? `?${searchParams.toString()}` : ''}`;

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

        <div className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <a href={languageHref} hrefLang={locale === 'zh-Hans' ? 'en' : 'zh-Hans'} aria-label={locale === 'zh-Hans' ? '切换至英文' : 'Switch to Chinese'} onClick={() => { document.cookie = `nofeego_locale=${locale === 'zh-Hans' ? 'en' : 'zh-Hans'};path=/;max-age=31536000;samesite=lax`; }} data-no-translate data-no-localize>
              <Languages className="mr-1.5 h-4 w-4" />
              <span>{locale === 'zh-Hans' ? '切换至英文' : '中文'}</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
            <Link href="/list-your-property">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">List Your Property</span>
              <span className="sm:hidden">List Property</span>
            </Link>
          </Button>
          {!loading && user ? <>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><LayoutDashboard className="mr-1.5 h-4 w-4" /><span className="hidden lg:inline">Dashboard</span></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/saved"><Heart className="mr-1.5 h-4 w-4" /><span className="hidden lg:inline">Saved Buildings</span><span className="ml-1 text-xs">{favoriteIds.length}</span></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/compare"><GitCompareArrows className="mr-1.5 h-4 w-4" /><span className="hidden lg:inline">Compare</span><span className="ml-1 text-xs">{compareIds.length}</span></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/requests"><MessageSquare className="mr-1.5 h-4 w-4" /><span className="hidden lg:inline">My Requests</span></Link></Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}><LogOut className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Sign Out</span></Button>
          </> : <Button asChild size="sm">
            <Link href="/sign-in">
              <LogIn className="mr-1.5 h-4 w-4" />
              Sign In
            </Link>
          </Button>}
        </div>
      </div>
    </header>
  );
}

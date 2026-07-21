'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Building2, MapPin, CalendarClock, Users, PlusCircle, LogIn, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { href: '/buildings', label: 'Buildings', icon: Building2 },
  { href: '/neighborhoods', label: 'Neighborhoods', icon: MapPin },
  { href: '/search?listingType=short_stay', label: 'Short Stays', icon: CalendarClock },
  { href: '/search?listingType=shared_living', label: 'Shared Living', icon: Users },
];

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-white border-b border-border'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-foreground">
                Manhattan<span className="text-primary">Living</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/list-your-property">
                <PlusCircle className="mr-1.5 h-4 w-4" />
                List Your Property
              </Link>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {profile?.display_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="max-w-[100px] truncate">
                      {profile?.display_name || user.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> My Account
                    </Link>
                  </DropdownMenuItem>
                  {profile?.is_admin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link href="/sign-in">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <div className="flex flex-col gap-1 pt-8">
                <SheetClose asChild>
                  <Link href="/" className="font-serif text-lg font-bold mb-4">
                    Manhattan<span className="text-primary">Living</span>
                  </Link>
                </SheetClose>
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="h-px bg-border my-2" />
                <SheetClose asChild>
                  <Link href="/list-your-property" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <PlusCircle className="h-4 w-4" />
                    List Your Property
                  </Link>
                </SheetClose>
                {user ? (
                  <>
                    {profile?.is_admin && (
                      <SheetClose asChild>
                        <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                          <LayoutDashboard className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </SheetClose>
                    )}
                    <SheetClose asChild>
                      <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 rounded-md transition-colors text-left">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link href="/sign-in" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent rounded-md transition-colors">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Link>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

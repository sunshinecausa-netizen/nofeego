'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, DollarSign, BedDouble, Bath, PawPrint, Sofa, Calendar, Clock, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Neighborhood, SearchFilters } from '@/lib/types';
import {
  BEDROOM_OPTIONS, BATHROOM_OPTIONS, PET_POLICY_OPTIONS, PRICE_OPTIONS, LEASE_TERM_OPTIONS,
} from '@/lib/types';

export function SearchBar({
  neighborhoods,
  defaultListingType,
  variant = 'full',
}: {
  neighborhoods: Neighborhood[];
  defaultListingType?: string;
  variant?: 'full' | 'compact';
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({
    listingType: defaultListingType ?? 'all',
  });
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (filters.neighborhood && filters.neighborhood !== 'all') params.set('neighborhood', filters.neighborhood);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.bedrooms && filters.bedrooms !== 'any') params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms && filters.bathrooms !== 'any') params.set('bathrooms', filters.bathrooms);
    if (filters.petPolicy && filters.petPolicy !== 'any') params.set('petPolicy', filters.petPolicy);
    if (filters.furnished) params.set('furnished', filters.furnished);
    if (date) params.set('moveInDate', date.toISOString().split('T')[0]);
    if (filters.leaseTerm && filters.leaseTerm !== 'any') params.set('leaseTerm', filters.leaseTerm);
    if (filters.listingType && filters.listingType !== 'all') params.set('listingType', filters.listingType);
    if (filters.q) params.set('q', filters.q);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-lg border border-border p-4 sm:p-5">
        {/* Keyword search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by keyword, building, or neighborhood..."
            value={filters.q ?? ''}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 h-11 text-sm"
          />
        </div>

        {/* Primary filter row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <FilterField icon={MapPin} label="Neighborhood">
            <Select
              value={filters.neighborhood ?? 'all'}
              onValueChange={(v) => setFilters({ ...filters, neighborhood: v })}
            >
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Neighborhoods</SelectItem>
                {neighborhoods.map((n) => (
                  <SelectItem key={n.id} value={n.slug}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField icon={DollarSign} label="Min Price">
            <Select
              value={filters.minPrice ?? 'any'}
              onValueChange={(v) => setFilters({ ...filters, minPrice: v === 'any' ? undefined : v })}
            >
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="No Min" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">No Minimum</SelectItem>
                {PRICE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField icon={DollarSign} label="Max Price">
            <Select
              value={filters.maxPrice ?? 'any'}
              onValueChange={(v) => setFilters({ ...filters, maxPrice: v === 'any' ? undefined : v })}
            >
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="No Max" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">No Maximum</SelectItem>
                {PRICE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField icon={BedDouble} label="Bedrooms">
            <Select
              value={filters.bedrooms ?? 'any'}
              onValueChange={(v) => setFilters({ ...filters, bedrooms: v })}
            >
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {BEDROOM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        {/* Advanced filters (collapsible) */}
        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border animate-fade-in">
            <FilterField icon={Bath} label="Bathrooms">
              <Select
                value={filters.bathrooms ?? 'any'}
                onValueChange={(v) => setFilters({ ...filters, bathrooms: v })}
              >
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {BATHROOM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField icon={PawPrint} label="Pet Friendly">
              <Select
                value={filters.petPolicy ?? 'any'}
                onValueChange={(v) => setFilters({ ...filters, petPolicy: v })}
              >
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {PET_POLICY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField icon={Calendar} label="Move-in Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 text-sm w-full justify-start font-normal">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Any Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </FilterField>

            <FilterField icon={Clock} label="Lease Length">
              <Select
                value={filters.leaseTerm ?? 'any'}
                onValueChange={(v) => setFilters({ ...filters, leaseTerm: v })}
              >
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Term</SelectItem>
                  {LEASE_TERM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </div>
        )}

        {/* Furnished toggle + search */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="furnished-search"
                checked={filters.furnished === 'true'}
                onCheckedChange={(checked) => setFilters({ ...filters, furnished: checked ? 'true' : undefined })}
              />
              <Label htmlFor="furnished-search" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                <Sofa className="h-3.5 w-3.5" /> Furnished
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground gap-1"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showAdvanced ? 'Less Filters' : 'More Filters'}
            </Button>
          </div>
          <Button onClick={handleSearch} size="lg" className="gap-2">
            <Search className="h-4 w-4" />
            Search Apartments
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </label>
      {children}
    </div>
  );
}

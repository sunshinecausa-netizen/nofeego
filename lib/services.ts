import { supabase } from '@/lib/supabase/client';
import type { Listing, Building, Neighborhood, SearchFilters } from '@/lib/types';

// ==========================================
// Neighborhoods
// ==========================================
export async function fetchNeighborhoods(): Promise<Neighborhood[]> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Neighborhood[];
}

export async function fetchNeighborhoodBySlug(slug: string): Promise<Neighborhood | null> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as Neighborhood | null;
}

// ==========================================
// Buildings
// ==========================================
export async function fetchBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('*, neighborhoods(*)')
    .order('name');
  if (error) throw error;
  return data as Building[];
}

export async function fetchFeaturedBuildings(limit = 6): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('*, neighborhoods(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Building[];
}

export async function fetchBuildingBySlug(slug: string): Promise<Building | null> {
  const { data, error } = await supabase
    .from('buildings')
    .select('*, neighborhoods(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as Building | null;
}

export async function fetchBuildingsByNeighborhood(neighborhoodId: string): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('*, neighborhoods(*)')
    .eq('neighborhood_id', neighborhoodId)
    .order('name');
  if (error) throw error;
  return data as Building[];
}

// ==========================================
// Listings
// ==========================================
export async function fetchListings(filters: SearchFilters = {}): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('status', 'active');

  if (filters.listingType && filters.listingType !== 'all') {
    query = query.eq('listing_type', filters.listingType);
  }
  if (filters.neighborhood && filters.neighborhood !== 'all') {
    query = query.eq('neighborhoods.slug', filters.neighborhood);
  }
  if (filters.minPrice) query = query.gte('price', parseInt(filters.minPrice));
  if (filters.maxPrice) query = query.lte('price', parseInt(filters.maxPrice));
  if (filters.bedrooms && filters.bedrooms !== 'any') {
    if (filters.bedrooms === '4') query = query.gte('bedrooms', 4);
    else query = query.eq('bedrooms', parseFloat(filters.bedrooms));
  }
  if (filters.bathrooms && filters.bathrooms !== 'any') {
    if (filters.bathrooms === '3') query = query.gte('bathrooms', 3);
    else query = query.eq('bathrooms', parseFloat(filters.bathrooms));
  }
  if (filters.petPolicy && filters.petPolicy !== 'any') {
    query = query.eq('pet_policy', filters.petPolicy);
  }
  if (filters.furnished === 'true') query = query.eq('furnished', true);
  else if (filters.furnished === 'false') query = query.eq('furnished', false);
  if (filters.moveInDate) query = query.lte('move_in_date', filters.moveInDate);
  if (filters.leaseTerm && filters.leaseTerm !== 'any') {
    query = query.eq('lease_term_months', parseInt(filters.leaseTerm));
  }
  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data as Listing[];
}

export async function fetchListingBySlug(slug: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as Listing | null;
}

export async function fetchListingsByNeighborhood(neighborhoodId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('neighborhood_id', neighborhoodId)
    .eq('status', 'active')
    .order('price', { ascending: true });
  if (error) throw error;
  return data as Listing[];
}

export async function fetchListingsByBuilding(buildingId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('building_id', buildingId)
    .eq('status', 'active')
    .order('price', { ascending: true });
  if (error) throw error;
  return data as Listing[];
}

export async function fetchLatestListings(limit = 8): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Listing[];
}

export async function fetchLuxuryListings(limit = 4): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('status', 'active')
    .gte('price', 5000)
    .order('price', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Listing[];
}

export async function fetchListingsByType(listingType: string, limit = 12): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, buildings(*), neighborhoods(*)')
    .eq('status', 'active')
    .eq('listing_type', listingType)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Listing[];
}

// ==========================================
// Favorites
// ==========================================
export async function fetchFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id');
  if (error) throw error;
  return (data ?? []).map((f) => f.listing_id);
}

export async function toggleFavorite(listingId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('listing_id', listingId);
    return false;
  } else {
    const { error } = await supabase.from('favorites').insert({ listing_id: listingId });
    if (error) throw error;
    return true;
  }
}

// ==========================================
// Property Submissions
// ==========================================
export async function submitProperty(formData: Record<string, any>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Must be signed in to submit a property');

  const { error } = await supabase.from('property_submissions').insert({
    user_id: userData.user.id,
    submission_data: formData,
    status: 'pending',
  });
  if (error) throw error;
}

// ==========================================
// Formatting helpers
// ==========================================
export function formatPrice(price: number): string {
  return '$' + price.toLocaleString();
}

export function formatBedrooms(bedrooms: number): string {
  if (bedrooms === 0) return 'Studio';
  if (bedrooms % 1 !== 0) return `${bedrooms} Bed`;
  return `${bedrooms} Bed${bedrooms > 1 ? 's' : ''}`;
}

export function formatBathrooms(bathrooms: number): string {
  if (bathrooms % 1 !== 0) return `${bathrooms} Bath`;
  return `${bathrooms} Bath${bathrooms > 1 ? 's' : ''}`;
}

export function formatDate(date: string | null): string {
  if (!date) return 'Flexible';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

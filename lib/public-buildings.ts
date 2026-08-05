import { getPublicSupabaseClient } from '@/lib/supabase/public-client';
import type { Building } from '@/lib/types';

export type BuildingsPageResult = { buildings: Building[]; total: number };

export async function fetchBuildingsPage({
  page,
  pageSize,
  search = '',
}: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<BuildingsPageResult> {
  const supabase = getPublicSupabaseClient();
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
  let query = supabase
    .from('buildings')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (term) {
    query = query.or(`name.ilike.%${term}%,building_name.ilike.%${term}%,address.ilike.%${term}%,street_address.ilike.%${term}%,neighborhood.ilike.%${term}%,borough.ilike.%${term}%`);
  }

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(from, from + safePageSize - 1);
  if (error) throw error;
  return { buildings: (data ?? []) as Building[], total: count ?? 0 };
}

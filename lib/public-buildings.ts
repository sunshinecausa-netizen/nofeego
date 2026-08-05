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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Public building data is not configured.');

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
  const endpoint = new URL('/rest/v1/buildings', url);
  endpoint.searchParams.set('select', '*');
  endpoint.searchParams.set('is_active', 'eq.true');
  endpoint.searchParams.set('order', 'name.asc');
  endpoint.searchParams.set('offset', String(from));
  endpoint.searchParams.set('limit', String(safePageSize));

  if (term) {
    endpoint.searchParams.set('or', `(name.ilike.*${term}*,building_name.ilike.*${term}*,address.ilike.*${term}*,street_address.ilike.*${term}*,neighborhood.ilike.*${term}*,borough.ilike.*${term}*)`);
  }

  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Prefer: 'count=exact' },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { code?: string };
    console.error('Public buildings query failed', { code: error.code ?? `HTTP_${response.status}` });
    throw new Error('Unable to load buildings.');
  }

  const buildings = await response.json() as Building[];
  const contentRange = response.headers.get('content-range');
  const total = Number.parseInt(contentRange?.split('/')[1] ?? '0', 10) || 0;
  return { buildings, total };
}

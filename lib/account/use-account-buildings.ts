'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Building } from '@/lib/types';
import type { BuildingInventorySummary, PublicAvailabilityStatus } from '@/lib/public-buildings';

export function useAccountBuildings(ids: string[]) {
  const [buildings, setBuildings] = useState<Building[]>([]); const [inventoryByBuilding, setInventoryByBuilding] = useState<Record<string, BuildingInventorySummary>>({}); const [loading, setLoading] = useState(true);
  const key = [...new Set(ids)].sort().join(',');
  useEffect(() => { let active = true; const buildingIds = key ? key.split(',') : [];
    if (!buildingIds.length) { queueMicrotask(() => { if (active) { setBuildings([]); setInventoryByBuilding({}); setLoading(false); } }); return () => { active = false; }; }
    void (async () => { setLoading(true);
      const { data } = await supabase.from('public_buildings').select('*').in('id', buildingIds);
      const rows = (data ?? []) as Array<Record<string, unknown>>; const slugs = rows.map((row) => String(row.slug));
      const [{ data: availabilityRows }, { data: rentRows }] = await Promise.all([supabase.from('public_building_availability').select('*').in('building_slug', slugs), supabase.from('public_building_rent_summary').select('*').in('building_slug', slugs)]);
      if (!active) return; const bySlug = new Map((availabilityRows ?? []).map((row) => [row.building_slug, row.availability_status as PublicAvailabilityStatus]));
      const rents = new Map((rentRows ?? []).map((row) => [row.building_slug, Object.fromEntries([[0,row.studio_min_rent],[1,row.one_bed_min_rent],[2,row.two_bed_min_rent],[3,row.three_bed_min_rent]].filter((entry): entry is [number, number] => typeof entry[1] === 'number'))]));
      const mapped = rows.map((row) => ({ id: String(row.id), slug: String(row.slug), name: String(row.name), address: String(row.address), city: String(row.city), state: String(row.state), zip_code: row.zip_code as string | null, latitude: row.latitude as number | null, longitude: row.longitude as number | null, building_type: row.building_type as string | null, amenities: row.amenities as string[] | null, year_built: row.year_built as number | null, floors: row.stories as number | null, hero_image: row.hero_image as string | null, hero_image_url: row.hero_image_url as string | null, gallery: row.gallery as string[] | null, nearby_subway: row.nearby_subway as string[] | null, borough: row.borough as string | null, neighborhood: row.neighborhood as string | null, stories: row.stories as number | null, total_units: row.total_units as number | null, is_active: true, updated_at: String(row.updated_at) } as Building));
      const order = new Map(buildingIds.map((id, i) => [id, i])); mapped.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
      setBuildings(mapped); setInventoryByBuilding(Object.fromEntries(mapped.map((b) => [b.id, { availabilityStatus: bySlug.get(b.slug) ?? 'unavailable', bedroomMinimums: rents.get(b.slug) ?? {} }]))); setLoading(false);
    })(); return () => { active = false; };
  }, [key]); return { buildings, inventoryByBuilding, loading };
}

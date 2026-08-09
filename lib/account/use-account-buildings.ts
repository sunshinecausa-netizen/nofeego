'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Building } from '@/lib/types';
import type { BuildingInventorySummary } from '@/lib/public-buildings';

export function useAccountBuildings(ids: string[]) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [inventoryByBuilding, setInventoryByBuilding] = useState<Record<string, BuildingInventorySummary>>({});
  const [loading, setLoading] = useState(true);
  const key = [...new Set(ids)].sort().join(',');

  useEffect(() => {
    const buildingIds = key ? key.split(',') : [];
    let active = true;
    if (buildingIds.length === 0) {
      queueMicrotask(() => {
        if (!active) return;
        setBuildings([]); setInventoryByBuilding({}); setLoading(false);
      });
      return () => { active = false; };
    }
    (async () => {
      queueMicrotask(() => { if (active) setLoading(true); });
      const [{ data: buildingRows }, { data: inventoryRows }] = await Promise.all([
        supabase.from('buildings').select('*').in('id', buildingIds).eq('is_active', true),
        supabase.from('inventory_snapshots').select('building_id, unit_id, rent, concession_text, available_date, is_no_fee, captured_at, units!inner(bedrooms, is_active)').in('building_id', buildingIds).eq('inventory_status', 'available').is('valid_until', null).gt('rent', 0).eq('units.is_active', true),
      ]);
      if (!active) return;
      const summaries: Record<string, BuildingInventorySummary> = {};
      const latestByUnit = new Map<string, Record<string, unknown>>();
      for (const raw of inventoryRows ?? []) {
        const row = raw as unknown as { building_id: string; unit_id: string; rent: number; concession_text: string | null; available_date: string | null; is_no_fee: boolean | null; captured_at: string; units: { bedrooms: number | null } };
        const current = latestByUnit.get(row.unit_id) as typeof row | undefined;
        if (!current || row.captured_at > current.captured_at) latestByUnit.set(row.unit_id, row);
      }
      for (const raw of latestByUnit.values()) {
        const row = raw as unknown as { building_id: string; rent: number; concession_text: string | null; available_date: string | null; is_no_fee: boolean | null; captured_at: string; units: { bedrooms: number | null } };
        const bedroom = row.units?.bedrooms;
        const summary = summaries[row.building_id] ?? { minPrice: row.rent, maxPrice: row.rent, bedrooms: [], availableCount: 0, updatedAt: null, bedroomMinimums: {}, concessionText: null, earliestAvailableDate: null, isNoFee: false };
        summary.minPrice = Math.min(summary.minPrice, row.rent); summary.maxPrice = Math.max(summary.maxPrice, row.rent); summary.availableCount += 1;
        if (bedroom != null && [0, 1, 2, 3].includes(bedroom)) { const supported = bedroom as 0 | 1 | 2 | 3; const current = summary.bedroomMinimums[supported]; summary.bedroomMinimums[supported] = current == null ? row.rent : Math.min(current, row.rent); if (!summary.bedrooms.includes(bedroom)) summary.bedrooms.push(bedroom); }
        if (!summary.concessionText && row.concession_text) summary.concessionText = row.concession_text;
        if (row.available_date && (!summary.earliestAvailableDate || row.available_date < summary.earliestAvailableDate)) summary.earliestAvailableDate = row.available_date;
        if (!summary.updatedAt || row.captured_at > summary.updatedAt) summary.updatedAt = row.captured_at;
        summary.isNoFee ||= row.is_no_fee === true; summaries[row.building_id] = summary;
      }
      const order = new Map(buildingIds.map((id, index) => [id, index]));
      setBuildings(((buildingRows ?? []) as Building[]).sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)));
      setInventoryByBuilding(summaries); setLoading(false);
    })();
    return () => { active = false; };
  }, [key]);
  return { buildings, inventoryByBuilding, loading };
}

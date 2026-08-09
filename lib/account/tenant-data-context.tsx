'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { accountFetch } from '@/lib/account/client';

const COMPARE_KEY = 'nofeego:compare-buildings';
const PENDING_FAVORITES_KEY = 'nofeego:pending-favorite-buildings';
export const MAX_COMPARE_BUILDINGS = 10;

type TenantDataContextValue = {
  favoriteIds: string[];
  compareIds: string[];
  loading: boolean;
  error: string | null;
  toggleFavorite: (buildingId: string, saved: boolean) => Promise<void>;
  toggleCompare: (buildingId: string, saved: boolean) => Promise<void>;
  replaceCompare: (buildingIds: string[]) => Promise<void>;
  clearCompare: () => Promise<void>;
  reload: () => Promise<void>;
};

const TenantDataContext = createContext<TenantDataContextValue | null>(null);

function readIds(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];
  } catch { return []; }
}

function writeIds(key: string, ids: string[]) {
  window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
}

export function TenantDataProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user || !session) {
      setFavoriteIds(readIds(PENDING_FAVORITES_KEY));
      setCompareIds(readIds(COMPARE_KEY).slice(0, MAX_COMPARE_BUILDINGS));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await accountFetch('/api/account/bootstrap', { method: 'POST' });
      const pendingFavorites = readIds(PENDING_FAVORITES_KEY);
      const localCompare = readIds(COMPARE_KEY).slice(0, MAX_COMPARE_BUILDINGS);
      await Promise.all(pendingFavorites.map((buildingId) => accountFetch('/api/account/favorites', { method: 'POST', body: JSON.stringify({ buildingId }) })));
      for (const buildingId of localCompare) {
        await accountFetch('/api/account/compare', { method: 'POST', body: JSON.stringify({ buildingId }) });
      }
      const [favorites, comparisons] = await Promise.all([
        accountFetch<{ items: Array<{ building_id: string | null }> }>('/api/account/favorites'),
        accountFetch<{ items: Array<{ building_id: string }> }>('/api/account/compare'),
      ]);
      const nextFavorites = favorites.items.map((item) => item.building_id).filter((id): id is string => Boolean(id));
      const nextCompare = comparisons.items.map((item) => item.building_id).slice(0, MAX_COMPARE_BUILDINGS);
      setFavoriteIds(nextFavorites);
      setCompareIds(nextCompare);
      writeIds(PENDING_FAVORITES_KEY, []);
      writeIds(COMPARE_KEY, nextCompare);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ACCOUNT_SYNC_FAILED');
    } finally { setLoading(false); }
  }, [session, user]);

  useEffect(() => {
    if (!authLoading) queueMicrotask(() => void reload());
  }, [authLoading, reload]);

  const toggleFavorite = useCallback(async (buildingId: string, saved: boolean) => {
    const next = saved ? [...new Set([...favoriteIds, buildingId])] : favoriteIds.filter((id) => id !== buildingId);
    setFavoriteIds(next);
    if (!user) {
      writeIds(PENDING_FAVORITES_KEY, next);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/sign-in?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    try { await accountFetch('/api/account/favorites', { method: saved ? 'POST' : 'DELETE', body: JSON.stringify({ buildingId }) }); }
    catch (caught) { setFavoriteIds(favoriteIds); setError(caught instanceof Error ? caught.message : 'FAVORITE_UPDATE_FAILED'); }
  }, [favoriteIds, user]);

  const toggleCompare = useCallback(async (buildingId: string, saved: boolean) => {
    if (saved && !compareIds.includes(buildingId) && compareIds.length >= MAX_COMPARE_BUILDINGS) { setError('You can compare up to 10 buildings.'); return; }
    const next = saved ? [...new Set([...compareIds, buildingId])].slice(0, MAX_COMPARE_BUILDINGS) : compareIds.filter((id) => id !== buildingId);
    setCompareIds(next); writeIds(COMPARE_KEY, next);
    if (!user) return;
    try { await accountFetch('/api/account/compare', { method: saved ? 'POST' : 'DELETE', body: JSON.stringify({ buildingId }) }); }
    catch (caught) { setCompareIds(compareIds); writeIds(COMPARE_KEY, compareIds); setError(caught instanceof Error ? caught.message : 'COMPARE_UPDATE_FAILED'); }
  }, [compareIds, user]);

  const replaceCompare = useCallback(async (buildingIds: string[]) => {
    const next = [...new Set(buildingIds)].slice(0, MAX_COMPARE_BUILDINGS);
    const removed = compareIds.filter((id) => !next.includes(id));
    const added = next.filter((id) => !compareIds.includes(id));
    setCompareIds(next); writeIds(COMPARE_KEY, next);
    if (!user) return;
    try {
      await Promise.all(removed.map((buildingId) => accountFetch('/api/account/compare', { method: 'DELETE', body: JSON.stringify({ buildingId }) })));
      for (const buildingId of added) await accountFetch('/api/account/compare', { method: 'POST', body: JSON.stringify({ buildingId }) });
    } catch { await reload(); }
  }, [compareIds, reload, user]);

  const clearCompare = useCallback(async () => {
    setCompareIds([]); writeIds(COMPARE_KEY, []);
    if (user) await accountFetch('/api/account/compare', { method: 'DELETE', body: JSON.stringify({ clearAll: true }) }).catch(() => reload());
  }, [reload, user]);

  const value = useMemo(() => ({ favoriteIds, compareIds, loading, error, toggleFavorite, toggleCompare, replaceCompare, clearCompare, reload }), [favoriteIds, compareIds, loading, error, toggleFavorite, toggleCompare, replaceCompare, clearCompare, reload]);
  return <TenantDataContext.Provider value={value}>{children}</TenantDataContext.Provider>;
}

export function useTenantData() {
  const value = useContext(TenantDataContext);
  if (!value) throw new Error('useTenantData must be used inside TenantDataProvider');
  return value;
}

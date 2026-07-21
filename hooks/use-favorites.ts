'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchFavoriteIds, toggleFavorite } from '@/lib/services';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setFavoriteIds(new Set());
        setLoading(false);
        return;
      }
      const ids = await fetchFavoriteIds();
      setFavoriteIds(new Set(ids));
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async (listingId: string) => {
    try {
      const isNowFavorite = await toggleFavorite(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isNowFavorite) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }, []);

  return { favoriteIds, toggle, loading, reload: load };
}

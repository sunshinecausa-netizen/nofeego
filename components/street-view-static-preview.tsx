'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
type SharedStatus = 'idle' | 'loading' | 'ready' | 'failed';
const sessionStatus = new Map<string, SharedStatus>();
const statusListeners = new Map<string, Set<(status: SharedStatus) => void>>();

function publish(key: string, status: SharedStatus) {
  sessionStatus.set(key, status);
  statusListeners.get(key)?.forEach((listener) => listener(status));
}

function streetViewUrl(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    size: '900x580',
    location: `${latitude},${longitude}`,
    radius: '150',
    source: 'outdoor',
    return_error_code: 'true',
    key: GOOGLE_MAPS_API_KEY!,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params}`;
}

type Props = {
  buildingId: string;
  buildingName: string;
  latitude: number | null;
  longitude: number | null;
  snapshotUrl?: string | null;
  className?: string;
};

export function StreetViewStaticPreview({ buildingId, buildingName, latitude, longitude, snapshotUrl, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheKey = latitude != null && longitude != null ? `${latitude.toFixed(6)},${longitude.toFixed(6)}` : buildingId;
  const [visible, setVisible] = useState(false);
  const [requestOwner, setRequestOwner] = useState(false);
  const [status, setStatus] = useState<SharedStatus>(() => sessionStatus.get(cacheKey) ?? 'idle');
  const canRequestStreetView = visible && GOOGLE_MAPS_API_KEY && latitude != null && longitude != null && ((requestOwner && status !== 'failed') || status === 'ready');

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: '200px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !GOOGLE_MAPS_API_KEY || latitude == null || longitude == null) return;
    if ((sessionStatus.get(cacheKey) ?? 'idle') !== 'idle') return;
    publish(cacheKey, 'loading');
    queueMicrotask(() => setRequestOwner(true));
  }, [cacheKey, latitude, longitude, visible]);

  useEffect(() => {
    const listeners = statusListeners.get(cacheKey) ?? new Set<(next: SharedStatus) => void>();
    const listener = (next: SharedStatus) => setStatus(next);
    listeners.add(listener);
    statusListeners.set(cacheKey, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) statusListeners.delete(cacheKey);
    };
  }, [cacheKey]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      {canRequestStreetView ? (
        // Google-hosted imagery is referenced directly and is never downloaded or persisted by NoFeeGo.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={streetViewUrl(latitude, longitude)}
          alt={`Google Street View near ${buildingName}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full object-cover"
          onLoad={() => publish(cacheKey, 'ready')}
          onError={() => { setRequestOwner(false); publish(cacheKey, 'failed'); }}
        />
      ) : snapshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={snapshotUrl} alt={`${buildingName} Building Snapshot`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary/70">
          <Building2 className="h-14 w-14 text-muted-foreground/35" />
          <span className="sr-only">Building Snapshot unavailable</span>
        </div>
      )}
      {canRequestStreetView && <span className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">Google Street View</span>}
      {!canRequestStreetView && <span className="absolute bottom-2 right-2 rounded bg-navy/85 px-2 py-1 text-[10px] font-semibold text-white shadow">Building Snapshot</span>}
    </div>
  );
}

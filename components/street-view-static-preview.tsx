'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
type SharedStatus = 'idle' | 'loading' | 'ready' | 'failed';
const sessionStatus = new Map<string, SharedStatus>();
const statusListeners = new Map<string, Set<(status: SharedStatus) => void>>();
let mapsScriptPromise: Promise<void> | null = null;

export function ensureGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-nofeego-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true });
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps is not configured'));
      return;
    }
    const script = document.createElement('script');
    script.dataset.nofeegoGoogleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

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
  const panoramaRef = useRef<HTMLDivElement>(null);
  const cacheKey = latitude != null && longitude != null ? `${latitude.toFixed(6)},${longitude.toFixed(6)}` : buildingId;
  const [visible, setVisible] = useState(false);
  const [requestOwner, setRequestOwner] = useState(false);
  const [status, setStatus] = useState<SharedStatus>(() => sessionStatus.get(cacheKey) ?? 'idle');
  const [interactiveOpen, setInteractiveOpen] = useState(false);
  const [interactiveError, setInteractiveError] = useState(false);
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

  useEffect(() => {
    if (!interactiveOpen || !panoramaRef.current || latitude == null || longitude == null) return;
    let panorama: google.maps.StreetViewPanorama | null = null;
    let cancelled = false;
    void ensureGoogleMaps().then(async () => {
      const response = await new google.maps.StreetViewService().getPanorama({
        location: { lat: latitude, lng: longitude },
        radius: 150,
        preference: google.maps.StreetViewPreference.NEAREST,
        source: google.maps.StreetViewSource.OUTDOOR,
      });
      if (cancelled || !panoramaRef.current || !response.data.location?.latLng) return;
      panorama = new google.maps.StreetViewPanorama(panoramaRef.current, {
        position: response.data.location.latLng,
        pov: { heading: 0, pitch: 0 },
        addressControl: true,
        fullscreenControl: true,
        enableCloseButton: false,
        visible: true,
      });
    }).catch(() => {
      if (!cancelled) setInteractiveError(true);
    });
    return () => {
      cancelled = true;
      panorama?.setVisible(false);
    };
  }, [interactiveOpen, latitude, longitude]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      <button type="button" className="relative block h-full w-full text-left" aria-label={`Open interactive Google Street View near ${buildingName}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setInteractiveError(false); setInteractiveOpen(true); }}>
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
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow"><Expand className="h-3 w-3" />{canRequestStreetView ? 'Open Google Street View' : 'Open interactive view'}</span>
      </button>
      {interactiveOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/75 p-4" role="dialog" aria-modal="true" aria-label={`Interactive Street View near ${buildingName}`} onClick={() => setInteractiveOpen(false)}>
          <div className="relative h-[min(76vh,720px)] w-[min(94vw,1100px)] overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div ref={panoramaRef} className="h-full w-full" />
            {interactiveError && <div className="absolute inset-0"><StreetViewFallback buildingName={buildingName} snapshotUrl={snapshotUrl} /><p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-navy shadow">Street View is unavailable here. Showing Building Snapshot.</p></div>}
            <button type="button" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-lg" aria-label="Close Street View" onClick={() => setInteractiveOpen(false)}><X className="h-5 w-5" /></button>
            <span className="absolute bottom-3 right-3 z-10 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">Google Street View</span>
          </div>
        </div>, document.body)}
    </div>
  );
}

function StreetViewFallback({ buildingName, snapshotUrl }: { buildingName: string; snapshotUrl?: string | null }) {
  return snapshotUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={snapshotUrl} alt={`${buildingName} Building Snapshot`} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary/70"><Building2 className="h-16 w-16 text-muted-foreground/35" /><span className="sr-only">Building Snapshot unavailable</span></div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { BuildingMapProps } from '@/components/building-map';

const BuildingMap = dynamic(() => import('@/components/building-map').then((module) => module.BuildingMap), {
  ssr: false,
  loading: () => <div className="h-full min-h-[420px] animate-pulse bg-muted" aria-label="Loading building map" />,
});

export function DeferredBuildingMap({ enabled, ...props }: BuildingMapProps & { enabled: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const shouldEnable = enabled || desktop;
  useEffect(() => {
    if (!shouldEnable || nearViewport || !containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [nearViewport, shouldEnable]);

  return <div ref={containerRef} className="h-full min-h-[420px]">{shouldEnable && nearViewport ? <BuildingMap {...props} /> : <div className="h-full min-h-[420px] bg-muted/40" aria-label="Building map available on demand" />}</div>;
}

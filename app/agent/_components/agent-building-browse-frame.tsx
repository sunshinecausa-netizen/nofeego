'use client';

import type { ReactNode } from 'react';
import { List, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  mobileView: 'list' | 'map';
  onMobileViewChange: (view: 'list' | 'map') => void;
  filters: ReactNode;
  resultCount: ReactNode;
  list: ReactNode;
  map: ReactNode;
  notice?: ReactNode;
  children?: ReactNode;
};

export function AgentBuildingBrowseFrame({ mobileView, onMobileViewChange, filters, resultCount, list, map, notice, children }: Props) {
  return <div className="flex min-h-screen flex-col bg-background md:h-[calc(100dvh-4rem)] md:min-h-0 md:overflow-hidden">
    {notice}
    <div className="flex shrink-0 border-b border-border bg-white p-2 md:hidden" role="group" aria-label="Choose map or list view">
      <Button type="button" variant={mobileView === 'map' ? 'default' : 'ghost'} className="h-11 flex-1" onClick={() => onMobileViewChange('map')}><Map className="mr-2 h-4 w-4" />Map</Button>
      <Button type="button" variant={mobileView === 'list' ? 'default' : 'ghost'} className="h-11 flex-1" onClick={() => onMobileViewChange('list')}><List className="mr-2 h-4 w-4" />Browse</Button>
    </div>
    <div className="min-h-0 flex-1 md:grid md:grid-cols-2">
      <section className={`${mobileView === 'list' ? 'flex' : 'hidden'} min-h-0 flex-col border-r border-border bg-muted/25 md:flex`} aria-label="Building results list">
        <div className="shrink-0">{filters}</div>
        <div className="shrink-0 border-b border-border bg-background/95 px-3 py-2 sm:px-4">{resultCount}</div>
        <div data-results-scroll-root className="results-list-scrollbar min-h-0 flex-1 overflow-y-auto">{list}</div>
      </section>
      <section className={`${mobileView === 'map' ? 'block' : 'hidden'} min-h-[55vh] overflow-hidden md:block md:min-h-0`} aria-label="Building map panel">{map}</section>
    </div>
    {children}
  </div>;
}

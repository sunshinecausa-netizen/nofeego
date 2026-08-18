'use client';

import type { ReactNode } from 'react';
import { BuildingCard } from '@/components/building-result-card';
import type { BuildingInventorySummary } from '@/lib/public-buildings';
import type { Building } from '@/lib/types';

type Props = {
  building: Building;
  inventory?: BuildingInventorySummary;
  actions: ReactNode;
};

export function AgentBuildingCard({ building, inventory, actions }: Props) {
  return <div className="space-y-2">
    <BuildingCard building={building} inventory={inventory} autoLoadStreetView />
    <div className="rounded-xl border bg-white p-2 shadow-sm">{actions}</div>
  </div>;
}

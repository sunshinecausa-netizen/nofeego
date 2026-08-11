import type { RentalDemandContext } from '@/components/rental-demand-form';
import { RoommateInterestForm } from '@/components/roommate-interest-form';

export default async function RoommateRequestPage({ searchParams }: { searchParams: Promise<Partial<RentalDemandContext>> }) {
  const params = await searchParams;
  const context: RentalDemandContext = { buildingId: params.buildingId ?? '', buildingSlug: params.buildingSlug ?? '', buildingName: params.buildingName ?? '', neighborhood: params.neighborhood ?? '', address: params.address ?? '', unitId: params.unitId ?? '', floorPlan: params.floorPlan ?? '' };
  return <RoommateInterestForm context={context} />;
}

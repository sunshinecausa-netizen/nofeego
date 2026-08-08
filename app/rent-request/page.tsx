import { RentalDemandForm, type RentalDemandContext } from '@/components/rental-demand-form';

export default async function RentRequestPage({ searchParams }: { searchParams: Promise<Partial<RentalDemandContext>> }) {
  const params = await searchParams;
  const context: RentalDemandContext = { buildingId: params.buildingId ?? '', buildingSlug: params.buildingSlug ?? '', buildingName: params.buildingName ?? '', neighborhood: params.neighborhood ?? '', address: params.address ?? '' };
  return <RentalDemandForm mode="entire" context={context} />;
}

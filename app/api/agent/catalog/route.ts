import { NextRequest, NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
import { fetchBuildingsPage } from '@/lib/public-buildings';

export async function GET(request: NextRequest) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { data: role, error: roleError } = await auth.supabase.rpc('current_account_role');
  if (roleError) return accountError('ROLE_READ_FAILED', 'The Building Catalog could not be loaded.', 500);
  if (role !== 'agent') return accountError('AGENT_REQUIRED', 'Active Agent access is required.', 403);

  const params = request.nextUrl.searchParams;
  try {
    const result = await fetchBuildingsPage({
      page: 1,
      pageSize: 500,
      mapOnly: true,
      search: params.get('q') ?? '',
      boroughs: params.getAll('borough'),
      neighborhoods: params.getAll('neighborhood'),
      amenities: params.getAll('amenity'),
      priceRanges: params.getAll('price'),
      bedrooms: params.getAll('bedrooms'),
      bathrooms: params.getAll('bathrooms'),
      moveInDate: params.get('moveInDate') ?? '',
      moveInFlex: params.getAll('moveInFlex'),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch {
    return accountError('AGENT_CATALOG_FAILED', 'The Building Catalog could not be loaded.', 503);
  }
}

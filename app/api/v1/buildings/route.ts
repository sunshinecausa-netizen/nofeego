import { NextRequest, NextResponse } from 'next/server';
import { MAX_VIEWPORT_BUILDINGS } from '@/lib/map-viewport-query';
import { fetchViewportBuildingsPage } from '@/lib/viewport-buildings';
import { canUsePublicHomeVisualFixture, getPublicHomeVisualFixture } from '@/lib/public-home-preview-fixtures';

const numberParam = (request: NextRequest, name: string) => {
  const raw = request.nextUrl.searchParams.get(name);
  if (raw == null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Math.min(100, Math.floor(numberParam(request, 'page') ?? 1)));
  const pageSize = Math.max(1, Math.min(MAX_VIEWPORT_BUILDINGS, Math.floor(numberParam(request, 'pageSize') ?? 48)));
  const north = numberParam(request, 'north');
  const south = numberParam(request, 'south');
  const east = numberParam(request, 'east');
  const west = numberParam(request, 'west');
  const validBounds = north != null && south != null && east != null && west != null
    && north > south && east > west
    && north <= 42 && south >= 39 && east <= -71 && west >= -76;
  if (!validBounds) return NextResponse.json({ error: 'A valid New York metro map boundary is required.' }, { status: 400 });
  if (canUsePublicHomeVisualFixture(process.env.VERCEL_ENV ?? process.env.NODE_ENV, params.get('visualFixture'))) {
    return NextResponse.json(getPublicHomeVisualFixture({ pageSize, north, south, east, west }), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
  try {
    const result = await fetchViewportBuildingsPage({
      page,
      pageSize,
      search: params.get('q') ?? '',
      boroughs: params.getAll('borough'),
      neighborhoods: params.getAll('neighborhood'),
      amenities: params.getAll('amenity'),
      priceRange: params.get('price') ?? '',
      bedrooms: params.get('bedrooms') ?? '',
      bathrooms: params.get('bathrooms') ?? '',
      moveInDate: params.get('moveInDate') ?? '',
      moveInFlex: params.get('moveInFlex') ?? 'flexible',
      north,
      south,
      east,
      west,
    });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to load buildings for this map area.' }, { status: 503 });
  }
}

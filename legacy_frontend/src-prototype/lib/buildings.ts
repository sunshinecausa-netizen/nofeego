import { getPublicSupabaseClient } from "@/lib/supabase/public-client";

export const BUILDINGS_PAGE_SIZE = 24;

export type PublicBuilding = {
  id: string;
  buildingId: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
  borough: string | null;
  neighborhood: string | null;
  buildingType: string | null;
  stories: number | null;
  totalUnits: number | null;
  heroImageUrl: string | null;
};

type BuildingRow = {
  id: string;
  building_id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  borough: string | null;
  neighborhood: string | null;
  building_type: string | null;
  stories: number | null;
  total_units: number | null;
  hero_image_url: string | null;
  hero_image: string | null;
};

export type BuildingPage = {
  buildings: PublicBuilding[];
  total: number;
  page: number;
  pageCount: number;
};

function normalizeSearchTerm(value: string): string {
  return value.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 100);
}

export async function fetchPublicBuildings({
  page,
  search,
}: {
  page: number;
  search?: string;
}): Promise<BuildingPage> {
  const supabase = getPublicSupabaseClient();
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * BUILDINGS_PAGE_SIZE;
  const to = from + BUILDINGS_PAGE_SIZE - 1;
  const term = normalizeSearchTerm(search ?? "");

  let query = supabase
    .from("buildings")
    .select(
      "id,building_id,slug,name,address,city,state,zip_code,borough,neighborhood,building_type,stories,total_units,hero_image_url,hero_image",
      { count: "exact" },
    )
    .eq("is_active", true);

  if (term) {
    query = query.or(
      `name.ilike.%${term}%,building_name.ilike.%${term}%,address.ilike.%${term}%,street_address.ilike.%${term}%,neighborhood.ilike.%${term}%,borough.ilike.%${term}%`,
    );
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to load buildings: ${error.message}`);
  }

  const total = count ?? 0;
  const rows = (data ?? []) as BuildingRow[];

  return {
    buildings: rows.map((row) => ({
      id: row.id,
      buildingId: row.building_id,
      slug: row.slug,
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      borough: row.borough,
      neighborhood: row.neighborhood,
      buildingType: row.building_type,
      stories: row.stories,
      totalUnits: row.total_units,
      heroImageUrl: row.hero_image_url ?? row.hero_image,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / BUILDINGS_PAGE_SIZE)),
  };
}

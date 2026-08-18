export const MAX_VIEWPORT_BUILDINGS = 2000;

export function viewportBuildingLimit(zoom: number) {
  if (zoom >= 15) return 120;
  if (zoom >= 14) return 300;
  if (zoom >= 13) return 600;
  if (zoom >= 12) return 1200;
  return MAX_VIEWPORT_BUILDINGS;
}

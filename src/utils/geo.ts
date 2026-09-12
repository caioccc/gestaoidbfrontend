/** Utilidades geográficas (Haversine) para o mapa de Grupos de Crescimento. */

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** IDs dos grupos cujo raio cobre o ponto informado. */
export function groupIdsCovering<T extends { latitude: number | null; longitude: number | null; radius_meters: number }>(
  groups: T[],
  point: LatLng
): number[];
export function groupIdsCovering(
  groups: Array<{ id: number; latitude: number | null; longitude: number | null; radius_meters: number }>,
  point: LatLng
): number[] {
  return groups
    .filter(
      (g) =>
        g.latitude != null &&
        g.longitude != null &&
        haversineMeters(g.latitude, g.longitude, point.lat, point.lng) <= g.radius_meters
    )
    .map((g) => g.id);
}

/** Grupo (com coordenadas) mais próximo do ponto informado. */
export function nearestGroup<T extends { latitude: number | null; longitude: number | null }>(
  groups: T[],
  point: LatLng
): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const g of groups) {
    if (g.latitude == null || g.longitude == null) continue;
    const d = haversineMeters(g.latitude, g.longitude, point.lat, point.lng);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return best;
}
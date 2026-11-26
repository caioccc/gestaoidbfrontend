export interface MemberGeocodeAddress {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}

export interface MemberGeocodeCoordinates {
  latitude: number;
  longitude: number;
}

export function buildMemberGeocodeQuery(values: MemberGeocodeAddress): string {
  const streetNumber = [
    String(values.street || '').trim(),
    String(values.number || '').trim(),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const cityState = [
    String(values.city || '').trim(),
    String(values.state || '').trim(),
  ]
    .filter(Boolean)
    .join('/');
  const parts = [
    streetNumber,
    String(values.complement || '').trim(),
    String(values.neighborhood || '').trim(),
    cityState,
    String(values.cep || '').trim(),
  ].filter(Boolean);
  if (!parts.length) return '';
  parts.push('Brasil');
  return parts.join(', ');
}

export async function geocodeMemberAddress(
  values: MemberGeocodeAddress
): Promise<MemberGeocodeCoordinates | null> {
  const query = buildMemberGeocodeQuery(values);
  if (!query) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      addressdetails: '0',
      countrycodes: 'br',
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;
    const results: Array<{ lat: string; lon: string }> = await response.json();
    if (!results.length) return null;
    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90) return null;
    if (longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

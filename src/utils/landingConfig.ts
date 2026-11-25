export const LANDING_CHURCH_SLUG =
  process.env.NEXT_PUBLIC_LANDING_CHURCH_SLUG || 'idbcen';

export const LANDING_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://idbcen.com.br';

const IDBCEN_HOSTS = new Set(['idbcen.com.br', 'www.idbcen.com.br']);

export function isIdbcenDeployment(): boolean {
  if (LANDING_CHURCH_SLUG.trim().toLowerCase() === 'idbcen') return true;

  if (typeof window !== 'undefined') {
    return IDBCEN_HOSTS.has(window.location.hostname.toLowerCase());
  }

  try {
    return IDBCEN_HOSTS.has(new URL(LANDING_SITE_URL).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function absoluteUrl(path = '/'): string {
  const base = LANDING_SITE_URL.replace(/\/$/, '');
  if (!path) return `${base}/`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export function mapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address.trim())}&output=embed`;
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { landingLinks } from '../../../data/landingContent';
import { absoluteUrl } from '../../../utils/landingConfig';

const SITEMAP_LINK_KEYS = ['calendar', 'links', 'visitor', 'growth_groups'];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sameOriginUrl(value: string, origin: string): string | null {
  try {
    const parsed = new URL(value, origin);
    return parsed.origin === origin ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const canonicalUrl = absoluteUrl('/');
  const origin = new URL(canonicalUrl).origin;
  const lastmod = new Date().toISOString().slice(0, 10);

  const entries = [{ url: canonicalUrl, priority: '1.0' }];
  for (const key of SITEMAP_LINK_KEYS) {
    const url = sameOriginUrl(landingLinks[key].url, origin);
    if (url) entries.push({ url, priority: '0.7' });
  }

  const uniqueEntries = Array.from(
    new Map(entries.map((entry) => [entry.url, entry])).values(),
  );
  const urls = uniqueEntries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).send(xml);
}

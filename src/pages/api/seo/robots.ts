import type { NextApiRequest, NextApiResponse } from 'next';
import { absoluteUrl } from '../../../utils/landingConfig';

const DISALLOWED_PATHS = [
  '/api/',
  '/admin/',
  '/dashboard',
  '/login',
  '/register',
  '/settings',
  '/members',
  '/entries',
  '/exits',
  '/receipts',
  '/tithers',
  '/closings',
  '/reports',
  '/dre',
  '/statement',
  '/validation',
  '/calendar',
  '/events',
  '/inscricao/',
  '/cultos',
  '/atas',
  '/songs',
  '/setlists',
  '/convite/',
  '/perfil/',
  '/cartao/',
  '/formulario/',
  '/ata/',
  '/folder/',
  '/check-in/',
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const lines = [
    'User-agent: *',
    'Allow: /',
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
  ];

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).send(lines.join('\n'));
}

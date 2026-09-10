let purifier: typeof import('dompurify').default | null = null;

async function getPurifier() {
  if (!purifier) {
    const mod = await import('dompurify');
    purifier = mod.default ?? mod;
  }
  return purifier;
}

export async function sanitizeHtml(html: string): Promise<string> {
  if (!html) return '';
  const purify = await getPurifier();
  return purify.sanitize(html);
}

export function hasHtmlTags(text: string): boolean {
  return /<([a-z][a-z0-9]*)\b[^>]*>/i.test(text);
}
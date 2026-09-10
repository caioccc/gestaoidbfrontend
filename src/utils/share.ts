export function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${p}`;
}

export function buildCardUrl(hash: string): string {
  return absoluteUrl(`/cartao/${hash}`);
}

export function buildFormUrl(hash: string): string {
  return absoluteUrl(`/formulario/${hash}`);
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
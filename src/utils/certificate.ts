import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export const CERT_A4_W_MM = 297;
export const CERT_A4_H_MM = 210;
export const CERT_A4_W_PX = 1122;
export const CERT_A4_H_PX = 794;

export function certificateFileName(name: string): string {
  const safe = name
    .trim()
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_');
  return `certificado_${safe || 'emissao'}`;
}

export function formatPtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso || '';
  return `${d}/${m}/${y}`;
}

export async function certificateNodeToBlob(node: HTMLElement): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(dataUrl, 'PNG', 0, 0, CERT_A4_W_MM, CERT_A4_H_MM, undefined, 'FAST');
  return pdf.output('blob');
}

export async function imageToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
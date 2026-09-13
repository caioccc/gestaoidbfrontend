import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { CardConfig } from '../types';

export function memberCardFileName(name: string): string {
  const safe = name
    .trim()
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_');
  return `carteirinha_${safe || 'membro'}`;
}

export function cardValidityDate(config?: CardConfig): Date {
  const until = config?.card_valid_until;
  if (until) {
    const [y, m, d] = until.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date(new Date().getFullYear(), 11, 31);
}

export function formatCardDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

export function memberPublicProfileUrl(publicHash: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/perfil/${encodeURIComponent(publicHash)}`;
}

export interface VcfMemberData {
  name: string;
  phone?: string | null;
  photo?: string | null;
  note?: string;
}

function vcfEscape(value: string): string {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

export function buildVcf(member: VcfMemberData, photoDataUrl?: string | null): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${vcfEscape(member.name)}`);
  lines.push(`FN:${vcfEscape(member.name)}`);
  if (member.phone) {
    const digits = (member.phone || '').replace(/\D/g, '');
    if (digits) lines.push(`TEL;TYPE=CELL:${digits}`);
  }
  if (photoDataUrl && photoDataUrl.startsWith('data:')) {
    const [header, b64] = photoDataUrl.split(',');
    const photoType = (header.match(/image\/([a-zA-Z0-9+]+)/) || [])[1];
    if (b64) lines.push(`PHOTO;ENCODING=b;TYPE=${(photoType || 'JPEG').toUpperCase()}:${b64}`);
  }
  if (member.note) lines.push(`NOTE:${vcfEscape(member.note)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function readAsDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export async function downloadVcf(member: VcfMemberData): Promise<void> {
  let photoDataUrl: string | null = null;
  try {
    if (member.photo) {
      const res = await fetch(member.photo);
      if (res.ok) photoDataUrl = await readAsDataUrl(await res.blob());
    }
  } catch {
    photoDataUrl = null;
  }
  const text = buildVcf(member, photoDataUrl);
  const blob = new Blob([text], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const baseName = (member.name || 'contato')
    .trim()
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName || 'contato'}.vcf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadMemberCardPairPng(
  node: HTMLElement,
  name: string
): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${memberCardFileName(name)}.png`;
  link.click();
}

export async function downloadMemberCardPairPdf(
  node: HTMLElement,
  name: string
): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgWidth = 120;
  const aspect = node.offsetHeight / node.offsetWidth || 514 / 400;
  const imgHeight = imgWidth * aspect;
  pdf.addImage(dataUrl, 'PNG', (210 - imgWidth) / 2, (297 - imgHeight) / 2, imgWidth, imgHeight);
  pdf.save(`${memberCardFileName(name)}.pdf`);
}

export async function printMemberCardPair(
  node: HTMLElement,
  title: string
): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const printWindow = window.open('', '_blank', 'width=700,height=900');
  if (!printWindow) return;
  printWindow.document.write(
    `<html><head><title>${title}</title>` +
      '<style>@page{margin:0}html,body{margin:0;padding:0}' +
      'body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#e9ecef}' +
      'img{width:100%;max-width:420px;height:auto;box-shadow:0 4px 12px rgba(0,0,0,.3)}' +
      '</style></head><body onload="window.print()"><img src="' +
      dataUrl +
      '" /></body></html>'
  );
  printWindow.document.close();
}

const asElements = (nodes: (HTMLElement | null)[]): HTMLElement[] =>
  nodes.filter((n): n is HTMLElement => !!n);

export async function exportMemberCardPairsPdf(
  nodes: (HTMLElement | null)[],
  fileName: string
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const list = asElements(nodes);
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    if (i > 0) pdf.addPage();
    const imgWidth = 150;
    const aspect = node.offsetHeight / node.offsetWidth || 514 / 400;
    const imgHeight = imgWidth * aspect;
    pdf.addImage(dataUrl, 'PNG', (210 - imgWidth) / 2, (297 - imgHeight) / 2, imgWidth, imgHeight);
  }
  pdf.save(`${fileName}.pdf`);
}

const GRID_COLS = 3;
const GRID_ROWS = 4;
const FACE_ASPECT = 250 / 400;

async function drawFacesPages(pdf: jsPDF, nodes: HTMLElement[]) {
  const margin = 10;
  const gap = 3;
  const cellW = (210 - margin * 2 - gap * (GRID_COLS - 1)) / GRID_COLS;
  const cellH = cellW * FACE_ASPECT;
  let col = 0;
  let row = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (i > 0 && i % (GRID_COLS * GRID_ROWS) === 0) {
      pdf.addPage();
      col = 0;
      row = 0;
    }
    const dataUrl = await toPng(nodes[i], { pixelRatio: 2, cacheBust: true });
    pdf.addImage(
      dataUrl,
      'PNG',
      margin + col * (cellW + gap),
      margin + row * (cellH + gap),
      cellW,
      cellH
    );
    col += 1;
    if (col === GRID_COLS) {
      col = 0;
      row += 1;
    }
  }
}

export async function exportMemberCardFacesGridPdf(
  frontNodes: (HTMLElement | null)[],
  backNodes: (HTMLElement | null)[],
  fileName: string
): Promise<void> {
  const fronts = asElements(frontNodes);
  const backs = asElements(backNodes);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await drawFacesPages(pdf, fronts);
  if (backs.length && fronts.length) {
    pdf.addPage();
    await drawFacesPages(pdf, backs);
  }
  pdf.save(`${fileName}.pdf`);
}

export async function printMemberCards(
  nodes: (HTMLElement | null)[],
  title: string
): Promise<void> {
  const list = asElements(nodes);
  const urls: string[] = [];
  for (const node of list) {
    urls.push(await toPng(node, { pixelRatio: 2, cacheBust: true }));
  }
  const printWindow = window.open('', '_blank', 'width=700,height=900');
  if (!printWindow) return;
  const sheets = urls
    .map((u) => `<div class="sheet"><img src="${u}" alt="" /></div>`)
    .join('');
  printWindow.document.write(
    `<html><head><title>${title}</title>` +
      '<style>@page{margin:6mm}html,body{margin:0;padding:0;background:#e9ecef}' +
      '.sheet{text-align:center;page-break-after:always}' +
      '.sheet:last-child{page-break-after:auto}' +
      'img{width:65mm;box-shadow:0 3px 10px rgba(0,0,0,.3)}' +
      '</style></head><body onload="window.print()">' +
      sheets +
      '</body></html>'
  );
  printWindow.document.close();
}
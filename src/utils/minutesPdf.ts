import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { sanitizeHtml, hasHtmlTags } from './sanitize';

export interface MinutesPdfOptions {
  title: string;
  meetingTypeDisplay: string;
  meetingDate: string;
  location: string;
  recorder: string;
  participants: string;
  content: string;
  churchName?: string;
  months: string[];
  dateStyle: 'DMY' | 'MDY';
  labels: {
    docTitle: string;
    meetingDate: string;
    meetingType: string;
    location: string;
    recorder: string;
    participants: string;
    signature: string;
  };
}

const A4_W_MM = 210;
const A4_H_MM = 297;
const MARGIN_X_MM = 12;
const TOP_MM = 15;
const BOTTOM_MM = 16;
const PAGE_CONTENT_MM = A4_H_MM - TOP_MM - BOTTOM_MM;
const OUT_W_PX = 794;

function formatLongDate(iso: string, months: string[], style: 'DMY' | 'MDY'): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  const month = months[Number(m) - 1] ?? '';
  if (style === 'MDY') return `${month} ${Number(d)}, ${y}`;
  return `${Number(d)} de ${month} de ${y}`;
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: string,
  parent?: HTMLElement
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute('style', style);
  parent?.appendChild(node);
  return node;
}

const PROSE_STYLE = `
.ata-prose{font:15px/1.7 Georgia,'Times New Roman',serif;color:#1f2937;text-align:justify;}
.ata-prose p{margin:0 0 12px 0;}
.ata-prose h1,.ata-prose h2,.ata-prose h3{font-family:Georgia,serif;color:#14284b;margin:22px 0 10px 0;line-height:1.3;}
.ata-prose h1{font-size:24px;} .ata-prose h2{font-size:20px;} .ata-prose h3{font-size:17px;}
.ata-prose ul,.ata-prose ol{margin:0 0 12px 0;padding-left:24px;}
.ata-prose li{margin-bottom:4px;}
.ata-prose blockquote{margin:0 0 12px 0;padding:2px 0 2px 14px;border-left:3px solid #c9a227;color:#4b5563;font-style:italic;}
.ata-prose a{color:#1e3a5f;text-decoration:underline;}
.ata-prose hr{border:none;border-top:1px solid #d1d5db;margin:18px 0;}
.ata-prose code{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:1px 5px;font-size:13px;}
.ata-prose mark{background:#fde68a;padding:0 2px;}
`;

function buildDocument(opts: MinutesPdfOptions): HTMLElement {
  const root = el('div', 'width:' + OUT_W_PX + 'px;background:#ffffff;box-sizing:border-box;');
  const style = el('style', '', root);
  style.textContent = PROSE_STYLE;

  const band = el(
    'div',
    'background:linear-gradient(135deg,#14284b,#1e3a5f);color:#ffffff;padding:44px 52px 36px 52px;',
    root
  );
  if (opts.churchName) {
    const church = el(
      'div',
      "font:600 12px/1 'Segoe UI',Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#c9a227;",
      band
    );
    church.textContent = opts.churchName;
  }
  const docTitle = el(
    'div',
    "font:400 32px/1.2 Georgia,'Times New Roman',serif;margin-top:10px;",
    band
  );
  docTitle.textContent = opts.labels.docTitle;
  const badge = el(
    'div',
    "display:inline-block;margin-top:16px;border:1px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.12);border-radius:999px;padding:6px 18px;font:600 11px/1 'Segoe UI',Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;",
    band
  );
  badge.textContent = opts.meetingTypeDisplay;

  const body = el('div', 'padding:30px 52px 46px 52px;', root);

  const title = el(
    'div',
    "font:600 22px/1.35 Georgia,'Times New Roman',serif;color:#14284b;margin-bottom:22px;",
    body
  );
  title.textContent = opts.title;

  const grid = el(
    'div',
    'display:grid;grid-template-columns:1fr 1fr;gap:18px 42px;margin-bottom:26px;',
    body
  );
  const meta = [
    { label: opts.labels.meetingDate, value: formatLongDate(opts.meetingDate, opts.months, opts.dateStyle) },
    { label: opts.labels.meetingType, value: opts.meetingTypeDisplay },
    { label: opts.labels.location, value: opts.location || '—' },
    { label: opts.labels.recorder, value: opts.recorder || '—' },
  ];
  meta.forEach((e) => {
    const cell = el('div', '', grid);
    const lab = el('div', "font:600 10px/1 'Segoe UI',Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;", cell);
    lab.textContent = e.label;
    const val = el('div', 'color:#1f2937;', cell);
    val.textContent = e.value;
  });

  const rule = el('div', 'height:1px;background:#e5e7eb;margin-bottom:26px;', body);

  if (opts.participants) {
    const partLabel = el('div', "font:600 11px/1 'Segoe UI',Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#c9a227;margin-bottom:8px;", body);
    partLabel.textContent = opts.labels.participants;
    const partValue = el('div', 'color:#374151;white-space:pre-line;margin-bottom:26px;', body);
    partValue.textContent = opts.participants;
  }

  const prose = document.createElement('div');
  prose.className = 'ata-prose';
  body.appendChild(prose);
  prose.innerHTML = opts.content;

  const sig = el(
    'div',
    'margin-top:54px;max-width:340px;margin-left:auto;margin-right:auto;text-align:center;',
    body
  );
  const sigLine = el('div', 'border-top:1px dashed #9ca3af;height:28px;', sig);
  const sigLabel = el('div', "font:600 11px/1 'Segoe UI',Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;", sig);
  sigLabel.textContent = opts.recorder
    ? `${opts.labels.signature} — ${opts.recorder}`
    : opts.labels.signature;

  return root;
}

export async function generateMinutesPdf(opts: MinutesPdfOptions): Promise<void> {
  const rawContent = opts.content || '';
  const contentHtml = hasHtmlTags(rawContent) ? rawContent : plainTextToHtml(rawContent);
  const clean = await sanitizeHtml(contentHtml);

  const root = buildDocument({ ...opts, content: clean });
  root.style.cssText +=
    'position:fixed;left:-10000px;top:0;z-index:-1;';
  document.body.appendChild(root);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    const dataUrl = await toPng(root, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });

    const imgW = root.offsetWidth || OUT_W_PX;
    const imgH = root.offsetHeight;
    const contentWmm = A4_W_MM - MARGIN_X_MM * 2;
    const pdfHmm = (contentWmm * imgH) / imgW;
    const pages = Math.max(1, Math.ceil(pdfHmm / PAGE_CONTENT_MM));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let offset = 0;
    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      pdf.setFillColor('#ffffff');
      pdf.rect(0, 0, A4_W_MM, A4_H_MM, 'F');
      pdf.addImage(dataUrl, 'PNG', MARGIN_X_MM, TOP_MM - offset, contentWmm, pdfHmm);

      const footerY = A4_H_MM - 8;
      pdf.setDrawColor('#d1d5db');
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_X_MM, footerY - 5, A4_W_MM - MARGIN_X_MM, footerY - 5);
      pdf.setTextColor('#6b7280');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      if (opts.churchName) {
        pdf.text(opts.churchName, MARGIN_X_MM, footerY);
      }
      pdf.text(`${i + 1} / ${pages}`, A4_W_MM - MARGIN_X_MM, footerY, { align: 'right' });

      offset += PAGE_CONTENT_MM;
    }

    pdf.save(fileName(opts.title));
  } finally {
    root.remove();
  }
}

function fileName(title: string): string {
  const safe = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00fc_\- ]/g, '')
    .replace(/\s+/g, '_');
  return `ata_${safe || 'redigida'}.pdf`;
}
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const FOLDER_WIDTH_PX = 794;
const A4_W_MM = 210;
const A4_H_MM = 297;

// Trifold: duas folhas A4 paisagem (297 x 210 mm @ 96 dpi).
const TRIFOLD_W_PX = 1123;
const TRIFOLD_H_PX = 794;

// Gera um PDF A4 retrato a partir do nó do folder (imagem full-bleed por página).
export async function generateFolderPdf(node: HTMLElement, title: string): Promise<void> {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.zIndex = '-1';
  clone.style.pointerEvents = 'none';
  clone.style.width = `${FOLDER_WIDTH_PX}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.boxSizing = 'border-box';
  document.body.appendChild(clone);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

    // Blocos destacáveis (marcados pelo preview) começam no topo de uma nova
    // página A4, para poderem ser recortados por inteiro.
    const imgW = clone.offsetWidth || FOLDER_WIDTH_PX;
    const pageHeightPx = (A4_H_MM / A4_W_MM) * imgW;
    const markers = Array.from(
      clone.querySelectorAll('[data-folder-pagebreak]'),
    ) as HTMLElement[];
    if (markers.length > 0) {
      const rootTop = clone.getBoundingClientRect().top;
      for (const el of markers) {
        if (!el.parentElement) continue;
        const top = el.getBoundingClientRect().top - rootTop;
        const remainder = top % pageHeightPx;
        const pad = remainder < 2 ? 0 : pageHeightPx - remainder;
        if (pad > 2) {
          const spacer = document.createElement('div');
          spacer.style.height = `${pad}px`;
          spacer.setAttribute('aria-hidden', 'true');
          el.parentElement.insertBefore(spacer, el);
          await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
        }
      }
    }

    const dataUrl = await toPng(clone, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });

    const finalW = clone.offsetWidth || FOLDER_WIDTH_PX;
    const imgH = clone.offsetHeight || 1;
    const pdfHmm = (A4_W_MM * imgH) / finalW;
    const pages = Math.max(1, Math.ceil(pdfHmm / A4_H_MM));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      pdf.setFillColor('#ffffff');
      pdf.rect(0, 0, A4_W_MM, A4_H_MM, 'F');
      pdf.addImage(dataUrl, 'PNG', 0, -i * A4_H_MM, A4_W_MM, pdfHmm);
    }

    pdf.save(fileName(title));
  } finally {
    clone.remove();
  }
}

// Gera o PDF do folder trifold (sanfonado): duas páginas A4 paisagem
// full-bleed, uma por folha (LADO A externo / LADO B interno). Cada folha
// é um elemento `[data-folder-sheet]` renderizado sem as guias de dobra.
export async function generateTrifoldPdf(node: HTMLElement, title: string): Promise<void> {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.zIndex = '-1';
  clone.style.pointerEvents = 'none';
  clone.style.width = `${TRIFOLD_W_PX}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.boxSizing = 'border-box';
  document.body.appendChild(clone);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

    const sheets = Array.from(
      clone.querySelectorAll('[data-folder-sheet]'),
    ) as HTMLElement[];

    const images: string[] = [];
    for (const sheet of sheets) {
      images.push(
        await toPng(sheet, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#ffffff',
          width: TRIFOLD_W_PX,
          height: TRIFOLD_H_PX,
        }),
      );
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [TRIFOLD_W_PX, TRIFOLD_H_PX],
    });
    images.forEach((dataUrl, index) => {
      if (index > 0) pdf.addPage();
      pdf.setFillColor('#ffffff');
      pdf.rect(0, 0, TRIFOLD_W_PX, TRIFOLD_H_PX, 'F');
      pdf.addImage(dataUrl, 'PNG', 0, 0, TRIFOLD_W_PX, TRIFOLD_H_PX);
    });

    pdf.save(fileName(title));
  } finally {
    clone.remove();
  }
}

function fileName(title: string): string {
  const safe = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00fc_\- ]/g, '')
    .replace(/\s+/g, '_');
  return `folder_${safe || 'boletim'}.pdf`;
}
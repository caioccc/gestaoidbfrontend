import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { sanitizeHtml, hasHtmlTags } from '../../utils/sanitize';
import type {
  FolderBlockKey,
  FolderCultoAniversarianteItem,
  FolderCultoAnuncioItem,
  FolderCultoProgramacaoItem,
  FolderCultoRow,
  FolderCultoQr,
  FolderCultoServiceType,
  FolderCultoTipo,
  FolderBlocks,
  TrifoldChurch,
  TrifoldLink,
} from '../../types';
import type { TranslationDict } from '../../i18n';

export type { TrifoldChurch } from '../../types';

// Dimensões físicas: A4 paisagem (297 x 210 mm) @ 96 dpi.
const SHEET_W = 1123;
const SHEET_H = 794;
const COLUMN_PAD = '6mm 8mm';
const MM = 96 / 25.4;

// Largura/altura úteis de uma coluna (110.99mm de largura, 198mm de altura).
const COLUMN_CONTENT_W = SHEET_W / 3 - 2 * 8 * MM;
const COLUMN_CONTENT_H = SHEET_H - 2 * 6 * MM;
const SECTION_GAP = 18;

const TRIFOLD_PROSE = `
.tfolder-prose{font-size:13px;line-height:1.65;font-family:var(--tf-body-font,Georgia,serif);color:var(--tf-ink,#1f2937);text-align:justify;}
.tfolder-prose p{margin:0 0 8px 0;}
.tfolder-prose h1,.tfolder-prose h2,.tfolder-prose h3{font-family:var(--tf-heading-font,Georgia,serif);color:var(--tf-accent,#14284b);margin:12px 0 6px 0;line-height:1.3;}
.tfolder-prose h1{font-size:18px;} .tfolder-prose h2{font-size:16px;} .tfolder-prose h3{font-size:14px;}
.tfolder-prose ul,.tfolder-prose ol{margin:0 0 8px 0;padding-left:20px;}
.tfolder-prose li{margin-bottom:2px;}
.tfolder-prose blockquote{margin:0 0 8px 0;padding:1px 0 1px 10px;border-left:3px solid var(--tf-accent,#c9a227);color:var(--tf-muted,#4b5563);font-style:italic;}
.tfolder-prose a{color:var(--tf-accent,#1e3a5f);text-decoration:underline;}
.tfolder-prose hr{border:none;border-top:1px solid var(--tf-line,#d1d5db);margin:12px 0;}
.tfolder-prose mark{background:#fde68a;padding:0 2px;}
`;

const TRIFOLD_THEME_CSS = `
.qrcode-container{display:flex;align-items:center;justify-content:center;width:100%;}
.qrcode-container svg,
.qrcode-container img,
.qrcode-container canvas{max-width:90px !important;width:90px !important;height:auto !important;object-fit:contain;margin:0 auto;display:block;}
.qrcode-mini{display:flex;align-items:center;justify-content:center;}
.qrcode-mini svg,
.qrcode-mini img,
.qrcode-mini canvas{max-width:72px !important;width:72px !important;height:auto !important;object-fit:contain;margin:0 auto;display:block;}
@media print{
  @page{size:A4 landscape;margin:0;}
  .trifold-scale{transform:none !important;}
  .trifold-spacer{display:none !important;}
  .folha-externa,.folha-interna{
    width:297mm !important;
    height:210mm !important;
    box-shadow:none !important;
    page-break-after:always;
    page-break-inside:avoid;
  }
}
`;

const sanitizeCache = new Map<string, Promise<string>>();

function useSanitizedHtml(html: string): string {
  const [clean, setClean] = useState('');
  useEffect(() => {
    let active = true;
    const key = html || '';
    let job = sanitizeCache.get(key);
    if (!job) {
      job = sanitizeHtml(key || '<p></p>');
      sanitizeCache.set(key, job);
    }
    job.then((value) => {
      if (active) setClean(value);
    });
    return () => {
      active = false;
    };
  }, [html]);
  return clean;
}

export interface TrifoldFolderData {
  tipo: FolderCultoTipo;
  title: string;
  subtitle: string;
  versiculo?: string;
  cover_template?: number;
  theme_color: string;
  background_color?: string;
  cover_font?: string;
  mensagem_pastoral: string;
  article_title?: string;
  reference_start: string;
  reference_end: string;
  programacao: FolderCultoProgramacaoItem[];
  anuncios: FolderCultoAnuncioItem[];
  aniversariantes: FolderCultoAniversarianteItem[];
  qr: FolderCultoQr;
  service_type?: FolderCultoServiceType | '';
  social?: Record<string, boolean>;
  blocks?: Partial<FolderBlocks>;
  block_order?: FolderBlockKey[];
  rows: FolderCultoRow[];
}

interface FolderTrifoldProps {
  folder: TrifoldFolderData;
  church?: TrifoldChurch;
  t: TranslationDict;
  locale: 'pt-br' | 'en' | 'es';
  interactive?: boolean;
  exportMode?: boolean;
  previewScale?: number;
  onOverflowChange?: (overflow: boolean) => void;
}

// ---- Sistema de temas (Clássico / Moderno / Elegante) ---------------------
interface TrifoldCoverTheme {
  band: boolean;
  background: string;
  ink: string;
  subInk: string;
  nameInk: string;
  tagBg: string;
  tagInk: string;
  tagBorder: string;
  titleBox: boolean;
  titleBoxBg: string;
  titleBoxInk: string;
  cardBg: string;
  cardBorder: string;
  cardInk: string;
  divider: string;
  frame: string;
}

interface TrifoldTheme {
  key: 'classic' | 'modern' | 'elegant' | 'minimal' | 'custom';
  pageBg: string;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  cover: TrifoldCoverTheme;
}

const FONT_STACKS: Record<string, { heading: string; body: string }> = {
  sans: {
    heading: "'Inter','Roboto','Segoe UI',Arial,sans-serif",
    body: "'Inter','Roboto','Segoe UI',Arial,sans-serif",
  },
  serif: {
    heading: "Georgia,'Times New Roman',serif",
    body: "Georgia,'Times New Roman',serif",
  },
  mono: {
    heading: "'Roboto Mono','Courier New',monospace",
    body: "'Roboto Mono','Courier New',monospace",
  },
  condensed: {
    heading: "'Arial Narrow','Roboto Condensed',Arial,sans-serif",
    body: "'Arial Narrow','Roboto Condensed',Arial,sans-serif",
  },
};

function resolveFonts(key?: string): { heading: string; body: string } {
  return (key && FONT_STACKS[key]) || FONT_STACKS.sans;
}

function buildCustomTheme(
  themeColor: string,
  backgroundColor?: string,
  coverFont?: string
): TrifoldTheme {
  const accent = themeColor || '#1d4ed8';
  const fonts = resolveFonts(coverFont);
  return {
    key: 'custom',
    pageBg: backgroundColor || '#ffffff',
    ink: '#1f2937',
    muted: '#6b7280',
    line: `${accent}33`,
    surface: '#ffffff',
    accent,
    headingFont: fonts.heading,
    bodyFont: fonts.body,
    cover: {
      band: false,
      background: `linear-gradient(160deg, ${accent}, ${shade(accent, -28)})`,
      ink: '#ffffff',
      subInk: 'rgba(255,255,255,0.85)',
      nameInk: '#ffffff',
      tagBg: 'rgba(255,255,255,0.18)',
      tagInk: '#ffffff',
      tagBorder: 'rgba(255,255,255,0.45)',
      titleBox: true,
      titleBoxBg: '#ffffff',
      titleBoxInk: accent,
      cardBg: 'rgba(255,255,255,0.9)',
      cardBorder: 'rgba(255,255,255,0.5)',
      cardInk: '#1f2937',
      divider: 'rgba(255,255,255,0.5)',
      frame: 'none',
    },
  };
}

function getTrifoldTheme(
  template: number,
  themeColor: string,
  backgroundColor?: string,
  coverFont?: string
): TrifoldTheme {
  if (template === 5) {
    return buildCustomTheme(themeColor, backgroundColor, coverFont);
  }
  if (template === 4) {
    return {
      key: 'minimal',
      pageBg: '#ffffff',
      ink: '#111111',
      muted: '#555555',
      line: '#111111',
      surface: '#ffffff',
      accent: '#111111',
      headingFont: "'Inter','Roboto','Segoe UI',Arial,sans-serif",
      bodyFont: "'Inter','Roboto','Segoe UI',Arial,sans-serif",
      cover: {
        band: false,
        background: '#ffffff',
        ink: '#111111',
        subInk: '#333333',
        nameInk: '#111111',
        tagBg: '#ffffff',
        tagInk: '#111111',
        tagBorder: '#111111',
        titleBox: false,
        titleBoxBg: 'transparent',
        titleBoxInk: '#111111',
        cardBg: '#ffffff',
        cardBorder: '#111111',
        cardInk: '#111111',
        divider: '#111111',
        frame: '2px solid #111111',
      },
    };
  }
  if (template === 2) {
    return {
      key: 'modern',
      pageBg: '#ffffff',
      ink: '#111827',
      muted: '#6b7280',
      line: '#e5e7eb',
      surface: '#ffffff',
      accent: themeColor,
      headingFont: "'Inter','Roboto','Segoe UI',Arial,sans-serif",
      bodyFont: "'Inter','Roboto','Segoe UI',Arial,sans-serif",
      cover: {
        band: false,
        background: `linear-gradient(160deg, ${tint(themeColor, 0.88)}, ${tint(themeColor, 0.7)})`,
        ink: '#1f2937',
        subInk: '#4b5563',
        nameInk: shade(themeColor, -34),
        tagBg: themeColor,
        tagInk: '#ffffff',
        tagBorder: 'transparent',
        titleBox: true,
        titleBoxBg: themeColor,
        titleBoxInk: '#ffffff',
        cardBg: 'rgba(255,255,255,0.9)',
        cardBorder: `${themeColor}33`,
        cardInk: '#1f2937',
        divider: `${themeColor}33`,
        frame: 'none',
      },
    };
  }
  if (template === 3) {
    const gold = '#c9a227';
    const burgundy = '#7b2d3b';
    return {
      key: 'elegant',
      pageBg: '#fbfbfa',
      ink: '#2D3748',
      muted: '#718096',
      line: '#e2e8f0',
      surface: '#ffffff',
      accent: burgundy,
      headingFont: "Georgia,'Times New Roman',serif",
      bodyFont: "'Segoe UI',Arial,sans-serif",
      cover: {
        band: false,
        background: 'linear-gradient(168deg, #2D3748, #1a202c)',
        ink: '#f5f5f4',
        subInk: '#cbd5e0',
        nameInk: gold,
        tagBg: 'transparent',
        tagInk: gold,
        tagBorder: `${gold}99`,
        titleBox: false,
        titleBoxBg: 'transparent',
        titleBoxInk: '#f5f5f4',
        cardBg: 'rgba(255,255,255,0.05)',
        cardBorder: `${gold}55`,
        cardInk: '#f5f5f4',
        divider: `${gold}66`,
        frame: `1px solid ${gold}55`,
      },
    };
  }
  const navy = '#1A365D';
  const gold = '#b8953f';
  return {
    key: 'classic',
    pageBg: '#F8F9FA',
    ink: '#1f2937',
    muted: '#6b7280',
    line: '#d1d5db',
    surface: '#ffffff',
    accent: navy,
    headingFont: "Georgia,'Times New Roman',serif",
    bodyFont: "'Segoe UI',Arial,sans-serif",
    cover: {
      band: true,
      background: '#F8F9FA',
      ink: navy,
      subInk: '#4b5563',
      nameInk: '#ffffff',
      tagBg: navy,
      tagInk: '#ffffff',
      tagBorder: 'transparent',
      titleBox: false,
      titleBoxBg: 'transparent',
      titleBoxInk: navy,
      cardBg: '#ffffff',
      cardBorder: `${navy}22`,
      cardInk: '#1f2937',
      divider: gold,
      frame: 'none',
    },
  };
}

const TrifoldThemeContext = createContext<TrifoldTheme>(
  getTrifoldTheme(1, '#1A365D')
);

function useTrifoldTheme(): TrifoldTheme {
  return useContext(TrifoldThemeContext);
}

function intl(locale: 'pt-br' | 'en' | 'es') {
  return locale === 'pt-br' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';
}

function weekdayName(iso: string, locale: 'pt-br' | 'en' | 'es'): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y) return '';
  return new Intl.DateTimeFormat(intl(locale), { weekday: 'long' }).format(
    new Date(y, m - 1, d)
  );
}

function shortDate(iso: string, locale: 'pt-br' | 'en' | 'es'): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y) return iso;
  return new Intl.DateTimeFormat(intl(locale), {
    day: '2-digit',
    month: 'short',
  }).format(new Date(y, m - 1, d));
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

function fmtAnniversary(item: FolderCultoAniversarianteItem, t: TranslationDict): string {
  const date = `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}`;
  const age = item.age ? ` (${t.folders.ageYears.replace('{age}', String(item.age))})` : '';
  return `${item.name} - ${date}${age}`;
}

function groupRowsByDate(rows: FolderCultoRow[]): Record<string, FolderCultoRow[]> {
  const grouped: Record<string, FolderCultoRow[]> = {};
  [...rows]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || '') || 0)
    .forEach((row) => {
      grouped[row.date] = grouped[row.date] || [];
      grouped[row.date].push(row);
    });
  return grouped;
}

function periodLabel(folder: TrifoldFolderData, t: TranslationDict, locale: 'pt-br' | 'en' | 'es'): string {
  const [sY, sM, sD] = folder.reference_start.slice(0, 10).split('-').map(Number);
  const [eY, eM, eD] = folder.reference_end.slice(0, 10).split('-').map(Number);
  if (!sY || !eY) return '';
  if (folder.tipo === 'MENSAL') {
    return new Intl.DateTimeFormat(intl(locale), {
      month: 'long',
      year: 'numeric',
    }).format(new Date(sY, sM - 1, 1));
  }
  if (eY === sY && eM === sM && eD === sD) {
    return new Intl.DateTimeFormat(intl(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(sY, sM - 1, sD));
  }
  const from = new Intl.DateTimeFormat(intl(locale), { day: 'numeric', month: 'short' }).format(
    new Date(sY, sM - 1, sD)
  );
  const to = new Intl.DateTimeFormat(intl(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(eY, eM - 1, eD)
  );
  return `${from} – ${to}`;
}

// ---- Blocos dinâmicos -----------------------------------------------------
const ALL_BLOCKS: FolderBlockKey[] = [
  'programacao',
  'agenda',
  'avisos',
  'aniversariantes',
  'contatos',
  'dizimos',
  'links',
  'social',
  'oracao',
  'ficha_visitante',
  'cadastro',
  'anotacoes',
];

// Ordem padrão (reproduz o layout atual no fluxo de leitura Pág3→Pág4→Pág5→Pág6).
const DEFAULT_BLOCK_ORDER: FolderBlockKey[] = [
  'programacao',
  'agenda',
  'avisos',
  'aniversariantes',
  'contatos',
  'dizimos',
  'links',
  'social',
  'oracao',
  'ficha_visitante',
  'cadastro',
  'anotacoes',
];

const LEGACY_BLOCK_ALIASES: Record<string, FolderBlockKey> = {
  donations: 'dizimos',
  address: 'contatos',
};

function resolveBlocks(blocks?: Partial<Record<string, boolean>>): FolderBlocks {
  const out = {} as FolderBlocks;
  for (const key of ALL_BLOCKS) {
    let value = blocks?.[key];
    if (value === undefined) {
      const alias = Object.entries(LEGACY_BLOCK_ALIASES).find(([, v]) => v === key)?.[0];
      if (alias !== undefined) value = blocks?.[alias];
    }
    out[key] = value ?? true;
  }
  return out;
}

function resolveBlockOrder(order?: FolderBlockKey[]): FolderBlockKey[] {
  const list = (order || []).filter(
    (k): k is FolderBlockKey => (ALL_BLOCKS as string[]).includes(k)
  );
  for (const k of ALL_BLOCKS) {
    if (!list.includes(k)) list.push(k);
  }
  return list;
}

function fullAddress(church?: TrifoldChurch): string {
  if (!church) return '';
  const parts = [
    church.street ? [church.street, church.number].filter(Boolean).join(', ') : '',
    church.neighborhood || '',
    church.city ? [church.city, church.state].filter(Boolean).join(' - ') : '',
  ].filter(Boolean);
  return parts.join(', ');
}

// Tipos de link da igreja que compõem o bloco de Redes Sociais.
export const SOCIAL_LINK_TYPES = ['WHATSAPP', 'YOUTUBE', 'INSTAGRAM', 'CUSTOM'];

function socialTargets(
  church?: TrifoldChurch,
  social?: Record<string, boolean>
): TrifoldLink[] {
  return (church?.links || []).filter(
    (l) =>
      SOCIAL_LINK_TYPES.includes(l.link_type) &&
      social?.[l.link_type] !== false
  );
}

function qrEntries(folder: TrifoldFolderData, t: TranslationDict) {
  const qr = folder.qr;
  const norm = (item: FolderCultoQr['oracao']) => ({ ...item, url: absoluteUrl(item.url) });
  return {
    visita: { label: t.folders.qrVisita, ...norm(qr.visita) },
    oracao: { label: t.folders.qrOracao, ...norm(qr.oracao) },
    agenda: { label: t.folders.qrAgenda, ...norm(qr.agenda) },
    cadastro: { label: t.folders.qrCadastro, ...norm(qr.cadastro) },
  };
}

interface BlockContext {
  folder: TrifoldFolderData;
  church?: TrifoldChurch;
  qrs: ReturnType<typeof qrEntries>;
  t: TranslationDict;
  locale: 'pt-br' | 'en' | 'es';
  exportMode?: boolean;
}

function BlockAgenda({ folder, qrs, t, locale }: BlockContext) {
  const theme = useTrifoldTheme();
  const grouped = groupRowsByDate(folder.rows);
  return (
    <>
      <ColumnSection title={t.folders.agenda}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ color: theme.muted, fontSize: 12 }}>—</div>
        ) : (
          Object.entries(grouped).map(([dateKey, rows]) => (
            <div key={dateKey} style={{ marginBottom: 12 }}>
              <div
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 700,
                  fontSize: 10.5,
                  color: theme.accent,
                  marginBottom: 5,
                  textAlign: 'left',
                }}
              >
                {weekdayName(dateKey, locale)} · {shortDate(dateKey, locale)}
              </div>
              {rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 0 5px 8px',
                    borderLeft: `3px solid ${theme.accent}`,
                    background: `${theme.accent}0d`,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: theme.ink }}>
                      {row.title ||
                        t.cultosPage.serviceTypes[row.service_type] ||
                        row.service_type_display}
                    </div>
                    {row.preacher && (
                      <div style={{ fontSize: 10.5, color: theme.muted }}>{row.preacher}</div>
                    )}
                  </div>
                  {row.start_time && (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: theme.accent,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtTime(row.start_time)}
                      {row.end_time ? `–${fmtTime(row.end_time)}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </ColumnSection>
      {qrs.agenda.enabled && qrs.agenda.url && (
        <div style={{ marginBottom: SECTION_GAP }}>
          <TrifoldQr label={qrs.agenda.label} url={qrs.agenda.url} shortUrl={qrs.agenda.url} />
        </div>
      )}
    </>
  );
}

function BlockAvisos({ folder, t }: BlockContext) {
  const theme = useTrifoldTheme();
  const anuncios = folder.anuncios.filter((a) => a.title || a.text);
  if (anuncios.length === 0) return null;
  return (
    <ColumnSection title={t.folders.anuncios}>
      {anuncios.map((a, i) => (
        <div
          key={i}
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            borderRadius: 4,
            background: a.highlight ? `${theme.accent}12` : theme.surface,
            border: a.highlight ? `1px solid ${theme.accent}44` : `1px solid ${theme.line}`,
          }}
        >
          {a.title && (
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 2 }}>{a.title}</div>
          )}
          {a.text && (
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: theme.muted }}>{a.text}</div>
          )}
        </div>
      ))}
    </ColumnSection>
  );
}

function BlockAniversariantes({ folder, t }: BlockContext) {
  const theme = useTrifoldTheme();
  if (folder.aniversariantes.length === 0) return null;
  return (
    <ColumnSection title={t.folders.aniversariantes}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px 16px' }}>
        {folder.aniversariantes.map((b, i) => (
          <div
            key={b.id ?? i}
            style={{
              fontSize: 12,
              padding: '3px 0',
              borderBottom: `1px dotted ${theme.line}`,
            }}
          >
            {fmtAnniversary(b, t)}
          </div>
        ))}
      </div>
    </ColumnSection>
  );
}

function BlockProgramacao({ folder, t }: BlockContext) {
  const theme = useTrifoldTheme();
  const items = folder.programacao.filter((p) => p.label || p.time);
  return (
    <ColumnSection title={t.folders.programacao}>
      {items.length === 0 ? (
        <div style={{ color: theme.muted, fontSize: 12 }}>—</div>
      ) : (
        items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: '6px 0',
              borderBottom: i < items.length - 1 ? `1px solid ${theme.line}` : 'none',
            }}
          >
            {item.time ? (
              <span
                style={{
                  width: 56,
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: theme.accent,
                }}
              >
                {fmtTime(item.time)}
              </span>
            ) : (
              <span style={{ width: 56, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, lineHeight: 1.5, color: theme.ink }}>
              {item.label}
            </span>
          </div>
        ))
      )}
    </ColumnSection>
  );
}

function BlockContatos({ church, qrs, t }: BlockContext) {
  const theme = useTrifoldTheme();
  const address = fullAddress(church);
  const whatsLink = (church?.links || []).find((l) => l.link_type === 'WHATSAPP');
  const wa = whatsappNumber(whatsLink);
  return (
    <ColumnSection title={t.folders.contact}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: theme.ink }}>
            {church?.name || ''}
          </div>
          {church?.phone && (
            <div style={{ fontSize: 13, color: theme.ink, marginTop: 2 }}>{church.phone}</div>
          )}
          {wa && <div style={{ fontSize: 13, color: theme.ink, marginTop: 2 }}>{wa}</div>}
          {address && (
            <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5, marginTop: 4 }}>
              {address}
            </div>
          )}
        </div>
        {qrs.visita.enabled && qrs.visita.url && (
          <div style={{ width: 104, flexShrink: 0 }}>
            <TrifoldQr
              label={qrs.visita.label}
              url={qrs.visita.url}
              shortUrl={qrs.visita.url}
            />
          </div>
        )}
      </div>
    </ColumnSection>
  );
}

function BlockDizimos({ church, qrs, blocks, t }: BlockContext & { blocks: FolderBlocks }) {
  const theme = useTrifoldTheme();
  const address = fullAddress(church);
  const linksUrl = church?.slug
    ? absoluteUrl(`/p/${church.slug}`)
    : qrs.oracao.enabled && qrs.oracao.url
      ? qrs.oracao.url
      : '';
  const pixUrl =
    church?.default_pix_key && church.default_pix_key.trim()
      ? buildPixPayload(
          church.default_pix_key,
          church.name || 'Igreja',
          (address.split(', ').pop() || 'BRASIL').slice(0, 15)
        )
      : '';
  const donationQrUrl = pixUrl || (blocks.links ? '' : linksUrl);
  if (!church?.default_pix_key && !donationQrUrl) return null;
  return (
    <ColumnSection title={t.folders.donations}>
      <div
        style={{
          borderRadius: 8,
          border: `1px dashed ${theme.accent}55`,
          background: `${theme.accent}0d`,
          padding: 12,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: theme.accent }}>
            {t.folders.pixKey}
          </div>
          {church?.default_pix_key && (
            <div
              style={{
                fontSize: 12,
                color: theme.ink,
                wordBreak: 'break-all',
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              {church.default_pix_key}
            </div>
          )}
          {church?.default_pix_type && (
            <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>
              {church.default_pix_type}
            </div>
          )}
        </div>
        {donationQrUrl && (
          <div className="qrcode-mini" style={{ flexShrink: 0 }}>
            <QRCodeSVG value={donationQrUrl} size={72} fgColor="#111827" />
          </div>
        )}
      </div>
    </ColumnSection>
  );
}

function BlockLinks({ church, qrs, t }: BlockContext) {
  const theme = useTrifoldTheme();
  const linksUrl = church?.slug
    ? absoluteUrl(`/p/${church.slug}`)
    : qrs.oracao.enabled && qrs.oracao.url
      ? qrs.oracao.url
      : '';
  if (!linksUrl) return null;
  return (
    <ColumnSection title={t.folders.linksHub}>
      <TrifoldQr label={t.folders.linksHub} url={linksUrl} shortUrl={linksUrl} />
    </ColumnSection>
  );
}

function BlockSocial({ folder, church, t }: BlockContext) {
  const theme = useTrifoldTheme();
  const links = socialTargets(church, folder.social);
  if (links.length === 0) return null;
  return (
    <ColumnSection title={t.folders.social}>
      {links.map((link, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: theme.ink }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{link.title}</div>
            <div
              style={{
                fontSize: 10,
                color: theme.accent,
                wordBreak: 'break-all',
                lineHeight: 1.4,
              }}
            >
              {shortUrlDisplay(link.url)}
            </div>
          </a>
        </div>
      ))}
    </ColumnSection>
  );
}

function BlockOracao({ qrs, t, exportMode }: BlockContext) {
  const theme = useTrifoldTheme();
  const lines = Array.from({ length: exportMode ? 8 : 6 });
  return (
    <>
      <ColumnSection title={t.folders.prayerRequestsBlockTitle}>
        <div style={{ borderRadius: 8, border: `1px solid ${theme.line}`, padding: '2px 12px' }}>
          {lines.map((_, i) => (
            <div
              key={i}
              style={{
                height: 26,
                borderBottom: i < lines.length - 1 ? `1px dashed ${theme.line}` : 'none',
              }}
            />
          ))}
        </div>
      </ColumnSection>
      {qrs.oracao.enabled && qrs.oracao.url && (
        <div style={{ marginBottom: SECTION_GAP }}>
          <TrifoldQr label={qrs.oracao.label} url={qrs.oracao.url} shortUrl={qrs.oracao.url} />
        </div>
      )}
    </>
  );
}

function BlockAnotacoes({ t, exportMode }: BlockContext) {
  const theme = useTrifoldTheme();
  const lines = Array.from({ length: exportMode ? 8 : 6 });
  return (
    <ColumnSection title={t.folders.blockAnotacoes}>
      <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, marginBottom: 8 }}>
        {t.folders.notesSubtitle}
      </div>
      <div style={{ borderRadius: 8, border: `1px solid ${theme.line}`, padding: '2px 12px' }}>
        {lines.map((_, i) => (
          <div
            key={i}
            style={{
              height: 26,
              borderBottom: i < lines.length - 1 ? `1px dashed ${theme.line}` : 'none',
            }}
          />
        ))}
      </div>
    </ColumnSection>
  );
}

function BlockFichaVisitante({ t }: BlockContext) {
  return (
    <DetachableBox t={t}>
      <ColumnSection title={t.folders.visitanteForm}>
        <FormLine label={t.folders.name} />
        <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
          <FormLine label={t.folders.whatsapp} flex={3} />
          <FormLine label={t.folders.birthDate} flex={2} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <FormLine label={t.folders.street} flex={4} />
          <FormLine label={t.folders.number} flex={1} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <FormLine label={t.folders.neighborhood} flex={3} />
          <FormLine label={t.folders.cep} flex={2} />
        </div>
        <FormLine label={t.folders.complement} />
      </ColumnSection>
    </DetachableBox>
  );
}

function BlockCadastro({ qrs, t }: BlockContext) {
  const cadastro = qrs.cadastro;
  if (!cadastro.enabled || !cadastro.url) return null;
  return (
    <ColumnSection title={t.folders.qrCadastro}>
      <TrifoldQr label={cadastro.label} url={cadastro.url} shortUrl={cadastro.url} />
    </ColumnSection>
  );
}

function renderBlock(
  key: FolderBlockKey,
  ctx: BlockContext,
  blocks: FolderBlocks
): React.ReactElement | null {
  const args = { ...ctx, blocks };
  switch (key) {
    case 'programacao':
      return <BlockProgramacao {...args} />;
    case 'agenda':
      return <BlockAgenda {...args} />;
    case 'avisos':
      return <BlockAvisos {...args} />;
    case 'aniversariantes':
      return <BlockAniversariantes {...args} />;
    case 'contatos':
      return <BlockContatos {...args} />;
    case 'dizimos':
      return <BlockDizimos {...args} />;
    case 'links':
      return <BlockLinks {...args} />;
    case 'social':
      return <BlockSocial {...args} />;
    case 'oracao':
      return <BlockOracao {...args} />;
    case 'anotacoes':
      return <BlockAnotacoes {...args} />;
    case 'ficha_visitante':
      return <BlockFichaVisitante {...args} />;
    case 'cadastro':
      return <BlockCadastro {...args} />;
    default:
      return null;
  }
}

function blockHasContent(
  key: FolderBlockKey,
  ctx: BlockContext
): boolean {
  const { folder, church, qrs } = ctx;
  switch (key) {
    case 'programacao':
      return folder.programacao.some((p) => p.label || p.time);
    case 'agenda':
      return folder.rows.length > 0 || Boolean(qrs.agenda.enabled && qrs.agenda.url);
    case 'avisos':
      return folder.anuncios.some((a) => a.title || a.text);
    case 'aniversariantes':
      return folder.aniversariantes.length > 0;
    case 'oracao':
      return true;
    case 'anotacoes':
      return true;
    case 'ficha_visitante':
      return true;
    case 'cadastro':
      return Boolean(qrs.cadastro.enabled && qrs.cadastro.url);
    case 'dizimos':
      return Boolean(church && church.default_pix_key && church.default_pix_key.trim());
    case 'links':
      return Boolean(church && church.slug);
    case 'social':
      return socialTargets(church, folder.social).length > 0;
    case 'contatos':
      return Boolean(church);
    default:
      return false;
  }
}

// Sequência de preenchimento por ordem de leitura (Pág 3 → Pág 6).
const FLOW_SLOTS = [
  'inner1',
  'inner2',
  'outer1',
  'outer0',
] as const;
type ColumnSlot = (typeof FLOW_SLOTS)[number];

function computeAssignment(
  heights: Map<FolderBlockKey, number>,
  activeKeys: FolderBlockKey[]
): { assignment: Record<ColumnSlot, FolderBlockKey[]>; overflow: boolean } {
  const assignment: Record<ColumnSlot, FolderBlockKey[]> = {
    inner1: [],
    inner2: [],
    outer1: [],
    outer0: [],
  };
  const used: Record<ColumnSlot, number> = { inner1: 0, inner2: 0, outer1: 0, outer0: 0 };
  let slotIndex = 0;
  let overflow = false;
  for (const key of activeKeys) {
    const h = (heights.get(key) ?? 0) + SECTION_GAP;
    for (let guard = 0; guard < FLOW_SLOTS.length; guard += 1) {
      const slot = FLOW_SLOTS[slotIndex % FLOW_SLOTS.length];
      if (used[slot] + h <= COLUMN_CONTENT_H) {
        assignment[slot].push(key);
        used[slot] += h;
        break;
      }
      slotIndex += 1;
    }
    const finalSlot = FLOW_SLOTS[slotIndex % FLOW_SLOTS.length];
    if (assignment[finalSlot].length === 0) {
      assignment[finalSlot].push(key);
      used[finalSlot] += h;
    }
    if (used[FLOW_SLOTS[FLOW_SLOTS.length - 1]] > COLUMN_CONTENT_H) {
      overflow = true;
    }
  }
  return { assignment, overflow };
}

const FolderTrifold = forwardRef<HTMLDivElement, FolderTrifoldProps>(
  function FolderTrifold(
    { folder, church, t, locale, interactive, exportMode, previewScale, onOverflowChange },
    ref
  ) {
    const themeColor = folder.theme_color || church?.theme_color || '#1d4ed8';
    const theme = useMemo(
      () =>
        getTrifoldTheme(
          folder.cover_template ?? 1,
          themeColor,
          folder.background_color,
          folder.cover_font
        ),
      [folder.cover_template, themeColor, folder.background_color, folder.cover_font]
    );
    const cleanMessage = useSanitizedHtml(folder.mensagem_pastoral);
    const qrs = useMemo(() => qrEntries(folder, t), [folder, t]);
    const blocks = useMemo(() => resolveBlocks(folder.blocks), [folder.blocks]);
    const blockOrder = useMemo(
      () => resolveBlockOrder(folder.block_order),
      [folder.block_order]
    );
    const cultTag = folder.service_type
      ? t.cultosPage.serviceTypes[folder.service_type] || ''
      : '';

    const ctxBase: Omit<BlockContext, 'qrs'> = {
      folder,
      church,
      t,
      locale,
      exportMode,
    };
    const ctx: BlockContext = { ...ctxBase, qrs };

    const activeKeys = useMemo(
      () =>
        blockOrder.filter(
          (key) => blocks[key] && blockHasContent(key, ctx)
        ),
      [blockOrder, blocks, folder, church, qrs, t, locale]
    );

    const [assignment, setAssignment] = useState<Record<ColumnSlot, FolderBlockKey[]>>({
      inner1: [],
      inner2: [],
      outer1: [],
      outer0: [],
    });
    const [overflow, setOverflow] = useState(false);
    const measureRefs = useRef(new Map<FolderBlockKey, HTMLDivElement | null>());
    const measureLayerRef = useRef<HTMLDivElement | null>(null);

    const measureKey = activeKeys.join('|');

    useLayoutEffect(() => {
      const heights = new Map<FolderBlockKey, number>();
      for (const key of activeKeys) {
        const el = measureRefs.current.get(key);
        heights.set(key, el ? el.offsetHeight : 0);
      }
      const next = computeAssignment(heights, activeKeys);
      setAssignment(next.assignment);
      setOverflow(next.overflow);
    }, [measureKey, folder, church, qrs, t, locale]);

    useEffect(() => {
      onOverflowChange?.(overflow);
    }, [overflow, onOverflowChange]);

    const setMeasureRef = (key: FolderBlockKey) => (el: HTMLDivElement | null) => {
      if (el) measureRefs.current.set(key, el);
      else measureRefs.current.delete(key);
    };

    const [scale, setScale] = useState(1);
    const outerRef = useRef<HTMLDivElement | null>(null);
    const setOuterRef = (el: HTMLDivElement | null) => {
      outerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    useLayoutEffect(() => {
      if (exportMode) {
        setScale(1);
        return;
      }
      const measure = () => {
        const el = outerRef.current;
        if (!el) return;
        if (previewScale) {
          setScale(Math.min(1, previewScale));
          return;
        }
        const fitWidth = el.clientWidth / SHEET_W;
        setScale(Math.max(0.15, Math.min(1, fitWidth)));
      };
      measure();
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, [exportMode, previewScale]);

    const sheets = (
      <>
        <Sheet exportMode={exportMode} sheetClass="folha-externa">
          <DynamicColumn keys={assignment.outer0} renderer={renderBlock} ctx={ctx} blocks={blocks} />
          <DynamicColumn keys={assignment.outer1} renderer={renderBlock} ctx={ctx} blocks={blocks} />
          <ColumnCapa folder={folder} church={church} cultTag={cultTag} t={t} locale={locale} />
        </Sheet>
        <Sheet exportMode={exportMode} sheetClass="folha-interna" label={t.folders.sheetB}>
          <ColumnArtigo folder={folder} cleanMessage={cleanMessage} t={t} />
          <DynamicColumn keys={assignment.inner1} renderer={renderBlock} ctx={ctx} blocks={blocks} />
          <DynamicColumn keys={assignment.inner2} renderer={renderBlock} ctx={ctx} blocks={blocks} />
        </Sheet>
      </>
    );

    return (
      <div
        ref={setOuterRef}
        style={{
          width: exportMode ? SHEET_W : '100%',
          maxWidth: 'none',
          margin: '0 auto',
        }}
      >
        <TrifoldThemeContext.Provider value={theme}>
          <div style={{ position: 'relative' }}>
            <div
              className="trifold-scale"
              style={{
                transform: exportMode ? undefined : `scale(${scale})`,
                transformOrigin: 'top left',
                width: SHEET_W,
                transition: exportMode ? 'none' : 'transform 200ms ease',
                boxShadow: exportMode ? 'none' : '0 12px 34px rgba(0,0,0,0.18)',
              }}
            >
              <style>{TRIFOLD_PROSE}</style>
              <style>{TRIFOLD_THEME_CSS}</style>
              {sheets}
            </div>
            {!exportMode && overflow && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 6,
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 99,
                  padding: '4px 10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  pointerEvents: 'none',
                }}
              >
                {t.folders.layoutOverflow}
              </div>
            )}
          </div>

          {/* Camada de medição (fora do transform, invisível, sem data-folder-sheet) */}
          <div
            ref={measureLayerRef}
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: -10000,
              top: 0,
              width: COLUMN_CONTENT_W,
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {activeKeys.map((key) => (
              <div key={key} ref={setMeasureRef(key)}>
                {renderBlock(key, ctx, blocks)}
              </div>
            ))}
          </div>
        </TrifoldThemeContext.Provider>

        {!exportMode && <div className="trifold-spacer" style={{ height: 2 * SHEET_H * scale }} aria-hidden="true" />}
      </div>
    );
  }
);

function DynamicColumn({
  keys,
  renderer,
  ctx,
  blocks,
}: {
  keys: FolderBlockKey[];
  renderer: (key: FolderBlockKey, ctx: BlockContext, blocks: FolderBlocks) => React.ReactElement | null;
  ctx: BlockContext;
  blocks: FolderBlocks;
}) {
  return <Column>{keys.map((key) => renderer(key, ctx, blocks))}</Column>;
}

function Sheet({
  exportMode,
  sheetClass,
  label,
  children,
}: {
  exportMode?: boolean;
  sheetClass: string;
  label?: string;
  children: React.ReactNode;
}) {
  const theme = useTrifoldTheme();
  const cssVars = {
    '--tf-ink': theme.ink,
    '--tf-muted': theme.muted,
    '--tf-line': theme.line,
    '--tf-accent': theme.accent,
    '--tf-heading-font': theme.headingFont,
    '--tf-body-font': theme.bodyFont,
  } as React.CSSProperties;
  return (
    <div
      data-folder-sheet
      className={sheetClass}
      style={{
        position: 'relative',
        width: SHEET_W,
        height: SHEET_H,
        background: theme.pageBg,
        overflow: 'hidden',
        fontFamily: theme.bodyFont,
        color: theme.ink,
        ...cssVars,
      }}
    >
      {label && !exportMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 10,
            zIndex: 5,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: theme.muted,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: 'flex', height: '100%' }}>{children}</div>
      {!exportMode && (
        <>
          <FoldGuide x={33.333} />
          <FoldGuide x={66.666} />
        </>
      )}
    </div>
  );
}

function FoldGuide({ x }: { x: number }) {
  return (
    <div
      data-folder-guide
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${x}%`,
        borderLeft: '2px dashed #94a3b8',
      }}
    />
  );
}

function Column({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: '33.333%',
        flexShrink: 0,
        padding: COLUMN_PAD,
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ColumnSection({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const theme = useTrifoldTheme();
  return (
    <div style={{ marginBottom: SECTION_GAP, ...style }}>
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            fontWeight: 800,
            fontSize: 11,
            color: theme.accent,
          }}
        >
          {title}
        </span>
        <div style={{ height: 2, background: `${theme.accent}33`, marginTop: 4 }} />
      </div>
      {children}
    </div>
  );
}

function ScissorsIcon({ color }: { color: string }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function DetachableBox({
  t,
  children,
}: {
  t: TranslationDict;
  children: React.ReactNode;
}) {
  const theme = useTrifoldTheme();
  return (
    <div
      style={{
        position: 'relative',
        border: `2px dashed ${theme.muted}`,
        borderRadius: 10,
        padding: '12px 14px 10px',
        marginBottom: SECTION_GAP,
        marginTop: 6,
        background: theme.surface,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 10,
          color: theme.muted,
        }}
      >
        <ScissorsIcon color={theme.muted} />
        <span
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontWeight: 700,
            color: theme.accent,
          }}
        >
          {t.folders.cutHere}
        </span>
      </div>
      {children}
    </div>
  );
}

function TrifoldQr({
  label,
  url,
  shortUrl,
  interactive,
}: {
  label: string;
  url: string;
  shortUrl: string;
  interactive?: boolean;
}) {
  const theme = useTrifoldTheme();
  const content = (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.line}`,
        borderRadius: 8,
        padding: 10,
        textAlign: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div className="qrcode-container">
        <QRCodeSVG value={url} size={90} fgColor="#111827" />
      </div>
      <div style={{ marginTop: 6, fontWeight: 700, fontSize: 11, color: theme.accent }}>{label}</div>
      <div
        style={{
          fontSize: 8.5,
          color: theme.muted,
          wordBreak: 'break-all',
          marginTop: 2,
          maxHeight: 20,
          overflow: 'hidden',
        }}
      >
        {shortUrl}
      </div>
    </div>
  );
  if (!interactive) return content;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      {content}
    </a>
  );
}

function FormLine({
  label,
  flex = 1,
}: {
  label: string;
  flex?: number;
}) {
  const theme = useTrifoldTheme();
  return (
    <div style={{ flex, minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: theme.muted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          borderBottom: `1px solid ${theme.line}`,
          height: 24,
          borderBottomStyle: 'dashed',
          borderBottomColor: `${theme.muted}66`,
        }}
      />
    </div>
  );
}

// ---- LADO A · col 3 (Pág 1 — Capa) ---------------------------------------
function ColumnCapa({
  folder,
  church,
  cultTag,
  t,
  locale,
}: {
  folder: TrifoldFolderData;
  church?: TrifoldChurch;
  cultTag: string;
  t: TranslationDict;
  locale: 'pt-br' | 'en' | 'es';
}) {
  const theme = useTrifoldTheme();
  const cov = theme.cover;
  const period = periodLabel(folder, t, locale);
  const hour = folder.rows[0]?.start_time ? fmtTime(folder.rows[0].start_time) : '';
  const title = folder.title || t.folders.defaultTitle;

  return (
    <Column
      style={{
        padding: 0,
        background: cov.background,
        color: cov.ink,
        border: cov.frame,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: cov.band ? '24px 24px 18px' : '26px 24px 6px',
          background: cov.band ? '#1A365D' : 'transparent',
        }}
      >
        <div
          style={{
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            fontSize: 11.5,
            fontWeight: 700,
            color: cov.nameInk,
            lineHeight: 1.4,
          }}
        >
          {church?.name || ''}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px 26px',
          textAlign: 'center',
        }}
      >
        {cultTag && (
          <div
            style={{
              background: cov.tagBg,
              color: cov.tagInk,
              border: `1px solid ${cov.tagBorder}`,
              borderRadius: 99,
              padding: '4px 14px',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            {cultTag}
          </div>
        )}

        {cov.titleBox ? (
          <div
            style={{
              background: cov.titleBoxBg,
              color: cov.titleBoxInk,
              borderRadius: 16,
              padding: '16px 18px',
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.25,
              fontFamily: theme.headingFont,
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {title}
          </div>
        ) : (
          <div
            style={{
              fontFamily: theme.headingFont,
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.25,
              color: cov.titleBoxInk,
            }}
          >
            {title}
          </div>
        )}

        {folder.subtitle && (
          <div style={{ fontSize: 12.5, color: cov.subInk, lineHeight: 1.45, marginTop: 10 }}>
            {folder.subtitle}
          </div>
        )}
      </div>

      <div style={{ padding: '0 26px 26px' }}>
        <div
          style={{
            background: cov.cardBg,
            border: `1px solid ${cov.cardBorder}`,
            borderRadius: 12,
            padding: '12px 14px',
            textAlign: 'center',
            color: cov.cardInk,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 700,
            }}
          >
            {period}
            {hour ? ` · ${hour}h` : ''}
          </div>
          {folder.versiculo && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                fontStyle: 'italic',
                fontFamily: theme.headingFont,
                lineHeight: 1.5,
                color: cov.subInk,
              }}
            >
              “{folder.versiculo}”
            </div>
          )}
        </div>
      </div>
    </Column>
  );
}

// ---- LADO B · col 1 (Pág 2 — Mensagem / Artigo Principal) -----------------
function ColumnArtigo({
  folder,
  cleanMessage,
  t,
}: {
  folder: TrifoldFolderData;
  cleanMessage: string;
  t: TranslationDict;
}) {
  const theme = useTrifoldTheme();
  const sectionTitle = folder.article_title?.trim() || t.folders.mensagemPastoral;
  return (
    <Column>
      <ColumnSection title={sectionTitle}>
        {cleanMessage ? (
          hasHtmlTags(cleanMessage) ? (
            <div className="tfolder-prose" dangerouslySetInnerHTML={{ __html: cleanMessage }} />
          ) : (
            <div style={{ whiteSpace: 'pre-line', fontSize: 13, lineHeight: 1.7, color: theme.ink }}>
              {cleanMessage}
            </div>
          )
        ) : (
          <div style={{ color: theme.muted, fontSize: 12 }}>—</div>
        )}
      </ColumnSection>
    </Column>
  );
}

function shortUrlDisplay(url: string): string {
  return url
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '')
    .slice(0, 40);
}

function whatsappNumber(link?: TrifoldLink): string {
  const raw = (link?.whatsapp_number || '').trim();
  if (raw) return raw;
  const match = (link?.url || '').match(/(\d{10,13})/);
  return match ? match[1] : '';
}

export function absoluteUrl(url: string | null | undefined): string {
  const value = (url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const base =
    (typeof window !== 'undefined' && window.location.origin) ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) ||
    '';
  if (!base) return value;
  return `${base.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(key: string, name: string, city: string): string {
  const merchant = tlv('00', 'br.gov.bcb.pix') + tlv('01', key.trim());
  const clean = (value: string, max: number) =>
    stripAccents(value || '').replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, max) || 'NA';
  const body =
    tlv('00', '01') +
    tlv('26', merchant) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('58', 'BR') +
    tlv('59', clean(name, 25)) +
    tlv('60', clean(city, 15)) +
    tlv('62', tlv('05', '***')) +
    '6304';
  return body + crc16(body);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return null;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

// Escurece/clareia uma cor hex simples (aceita #rrggbb ou #rgb).
function shade(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mul = (100 + percent) / 100;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * mul)));
  return `#${rgb.map(clamp).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function tint(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  const white = [255, 255, 255];
  return `#${rgb
    .map((v, i) => mix(v, white[i]))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export default FolderTrifold;
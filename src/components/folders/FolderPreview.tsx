import React, { forwardRef, useEffect, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { sanitizeHtml, hasHtmlTags } from '../../utils/sanitize';
import type {
  FolderCulto,
  FolderCultoAniversarianteItem,
  FolderCultoAnuncioItem,
  FolderCultoProgramacaoItem,
  FolderCultoQr,
  FolderCultoRow,
} from '../../types';
import type { TranslationDict } from '../../i18n';

const PALETTE = {
  ink: '#1f2937',
  muted: '#6b7280',
  line: '#d1d5db',
  white: '#ffffff',
  gold: '#b8953f',
  surface: '#fafafa',
  subtle: 'rgba(0,0,0,0.02)',
};

const DARK: typeof PALETTE = {
  ink: '#e9ecef',
  muted: '#adb5bd',
  line: '#373a40',
  white: '#1a1b1e',
  gold: '#b8953f',
  surface: '#25262b',
  subtle: 'rgba(255,255,255,0.04)',
};

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

export interface FolderPreviewChurch {
  name?: string;
  logo?: string | null;
  phone?: string;
  city?: string;
  state?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  theme_color?: string;
}

export interface FolderPreviewData {
  tipo: FolderCulto['tipo'];
  title: string;
  subtitle: string;
  cover_template: number;
  theme_color: string;
  mensagem_pastoral: string;
  reference_start: string;
  reference_end: string;
  programacao: FolderCultoProgramacaoItem[];
  anuncios: FolderCultoAnuncioItem[];
  aniversariantes: FolderCultoAniversarianteItem[];
  qr: FolderCultoQr;
  rows: FolderCultoRow[];
}

interface FolderPreviewProps {
  folder: FolderPreviewData;
  church?: FolderPreviewChurch;
  t: TranslationDict;
  locale: 'pt-br' | 'en' | 'es';
  interactive?: boolean;
  exportMode?: boolean;
}

const FOLDER_PROSE = `
.folder-prose{font:15px/1.75 Georgia,'Times New Roman',serif;color:var(--folder-ink,#1f2937);text-align:justify;}
.folder-prose p{margin:0 0 10px 0;}
.folder-prose h1,.folder-prose h2,.folder-prose h3{font-family:Georgia,serif;color:var(--folder-ink,#14284b);margin:16px 0 8px 0;line-height:1.3;}
.folder-prose h1{font-size:22px;} .folder-prose h2{font-size:19px;} .folder-prose h3{font-size:16px;}
.folder-prose ul,.folder-prose ol{margin:0 0 10px 0;padding-left:22px;}
.folder-prose li{margin-bottom:3px;}
.folder-prose blockquote{margin:0 0 10px 0;padding:1px 0 1px 12px;border-left:3px solid #c9a227;color:var(--folder-muted,#4b5563);font-style:italic;}
.folder-prose a{color:#1e3a5f;text-decoration:underline;}
.folder-prose hr{border:none;border-top:1px solid var(--folder-muted,#d1d5db);margin:14px 0;}
.folder-prose mark{background:#fde68a;padding:0 2px;}
`;

const LINED_ROW_HEIGHT = 26;

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

function periodLabel(
  folder: FolderPreviewData,
  t: TranslationDict,
  locale: 'pt-br' | 'en' | 'es'
): string {
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
  const to = new Intl.DateTimeFormat(intl(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(eY, eM - 1, eD));
  return `${from} – ${to}`;
}

function qrEntries(folder: FolderPreviewData, t: TranslationDict) {
  const qr = folder.qr;
  return [
    { key: 'visita', label: t.folders.qrVisita, ...qr.visita },
    { key: 'oracao', label: t.folders.qrOracao, ...qr.oracao },
    { key: 'agenda', label: t.folders.qrAgenda, ...qr.agenda },
    { key: 'cadastro', label: t.folders.qrCadastro, ...qr.cadastro },
  ].filter((item) => item.enabled && item.url && item.url.trim().length > 0);
}

function fmtTime(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

function fmtAnniversary(item: FolderCultoAniversarianteItem, t: TranslationDict): string {
  const date = `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}`;
  const age = item.age
    ? ` (${t.folders.ageYears.replace('{age}', String(item.age))})`
    : '';
  return `${item.name} - ${date}${age}`;
}

const FolderPreview = forwardRef<HTMLDivElement, FolderPreviewProps>(
  function FolderPreview({ folder, church, t, locale, interactive, exportMode }, ref) {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark' && !exportMode;
    const c = isDark ? DARK : PALETTE;
    const cleanMessage = useSanitizedHtml(folder.mensagem_pastoral);
    const themeColor = folder.theme_color || church?.theme_color || '#1d4ed8';
    const logo = church?.logo;

    const qrs = qrEntries(folder, t);

    const groupedRows = groupRowsByDate(folder.rows);

    const addressParts = [
      church?.street ? `${church.street}${church.number ? ', ' + church.number : ''}` : '',
      church?.neighborhood || '',
      church?.city ? `${church.city}${church.state ? '/' + church.state : ''}` : '',
    ].filter(Boolean);

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          maxWidth: exportMode ? 'none' : 480,
          margin: '0 auto',
          background: c.white,
          color: c.ink,
          fontFamily: "'Segoe UI',Arial,sans-serif",
          boxShadow: exportMode ? 'none' : '0 10px 30px rgba(0,0,0,0.12)',
          borderRadius: 6,
          overflow: 'hidden',
          ['--folder-ink' as string]: c.ink,
          ['--folder-muted' as string]: c.muted,
        }}
      >
        <style>{FOLDER_PROSE}</style>
        {renderCover(folder, church ?? {}, themeColor, t, locale)}

        <div style={{ padding: '26px 30px 30px' }}>
          {folder.programacao.length > 0 && (
            <Section title={t.folders.programacao} themeColor={themeColor}>
              {folder.programacao.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                    padding: '5px 0',
                    borderBottom: i < folder.programacao.length - 1 ? `1px solid ${c.line}` : 'none',
                  }}
                >
                  {item.time ? (
                    <span
                      style={{
                        width: 72,
                        flexShrink: 0,
                        fontWeight: 700,
                        fontSize: 13,
                        color: themeColor,
                      }}
                    >
                      {fmtTime(item.time)}
                    </span>
                  ) : (
                    <span style={{ width: 72, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 14, lineHeight: 1.5 }}>{item.label}</span>
                </div>
              ))}
            </Section>
          )}

          {cleanMessage && (
            <Section title={t.folders.mensagemPastoral} themeColor={themeColor}>
              {hasHtmlTags(cleanMessage) ? (
                <div className="folder-prose" dangerouslySetInnerHTML={{ __html: cleanMessage }} />
              ) : (
                <div style={{ whiteSpace: 'pre-line', fontSize: 15, lineHeight: 1.75 }}>{cleanMessage}</div>
              )}
            </Section>
          )}

          {Object.keys(groupedRows).length > 0 && (
            <Section title={t.folders.agenda} themeColor={themeColor}>
              {Object.entries(groupedRows).map(([dateKey, rows]) => (
                <div key={dateKey} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      fontWeight: 700,
                      fontSize: 11,
                      color: themeColor,
                      marginBottom: 6,
                    }}
                  >
                    {dateKey}
                  </div>
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 0 7px 10px',
                        borderLeft: `3px solid ${themeColor}`,
                        background: isDark ? c.subtle : 'rgba(0,0,0,0.02)',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: c.ink }}>
                          {row.title || row.service_type_display}
                        </div>
                        {row.preacher && (
                          <div style={{ fontSize: 12, color: c.muted }}>
                            {t.folders.preacher}: {row.preacher}
                          </div>
                        )}
                      </div>
                      {row.start_time && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: themeColor }}>
                          {fmtTime(row.start_time)}
                          {row.end_time ? `–${fmtTime(row.end_time)}` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </Section>
          )}

          {folder.anuncios.filter((a) => a.title || a.text).length > 0 && (
            <Section title={t.folders.anuncios} themeColor={themeColor}>
              {folder.anuncios
                .filter((a) => a.title || a.text)
                .map((a, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 10,
                      padding: '10px 12px',
                      borderRadius: 4,
                      background: a.highlight ? `${themeColor}12` : isDark ? c.surface : '#fafafa',
                      border: a.highlight ? `1px solid ${themeColor}44` : `1px solid ${c.line}`,
                    }}
                  >
                    {a.title && (
                      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{a.title}</div>
                    )}
                    {a.text && (
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: c.muted }}>{a.text}</div>
                    )}
                  </div>
                ))}
            </Section>
          )}

          {folder.aniversariantes.length > 0 && (
            <Section title={t.folders.aniversariantes} themeColor={themeColor}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 18px',
                }}
              >
                {folder.aniversariantes.map((b, i) => (
                  <div
                    key={b.id ?? i}
                    style={{
                      fontSize: 13.5,
                      padding: '4px 0',
                      borderBottom: `1px dotted ${c.line}`,
                    }}
                  >
                    {fmtAnniversary(b, t)}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <DetachableBlock t={t} c={c} exportMode={exportMode}>
            <PrayerRequestsBlock t={t} themeColor={themeColor} c={c} />
          </DetachableBlock>
          <DetachableBlock t={t} c={c} exportMode={exportMode}>
            <RegistrationFormBlock t={t} themeColor={themeColor} c={c} />
          </DetachableBlock>

          {qrs.length > 0 && (
            <div data-folder-pagebreak={exportMode ? 'true' : undefined}>
              <Section title={t.folders.qrTitle} themeColor={themeColor}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: qrs.length > 1 ? '1fr 1fr' : '1fr',
                    gap: 14,
                  }}
                >
                  {qrs.map((item) => (
                    <QrCard
                      key={item.key}
                      label={item.label}
                      url={item.url}
                      themeColor={themeColor}
                      interactive={interactive}
                    />
                  ))}
                </div>
              </Section>
            </div>
          )}

          <div
            style={{
              marginTop: 26,
              paddingTop: 14,
              borderTop: `2px solid ${themeColor}`,
              textAlign: 'center',
              fontSize: 11.5,
              color: c.muted,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: c.ink }}>
              {church?.name || ''}
            </div>
            {addressParts.length > 0 && <div>{addressParts.join(' · ')}</div>}
            {church?.phone && <div>{church.phone}</div>}
          </div>
        </div>
      </div>
    );
  }
);

function groupRowsByDate(rows: FolderCultoRow[]): Record<string, FolderCultoRow[]> {
  const grouped: Record<string, FolderCultoRow[]> = {};
  [...rows]
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time?.localeCompare(b.start_time ?? '') || 0)
    .forEach((row) => {
      grouped[row.date] = grouped[row.date] || [];
      grouped[row.date].push(row);
    });
  return grouped;
}

function Section({
  title,
  themeColor,
  children,
}: {
  title: string;
  themeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            textTransform: 'uppercase',
            letterSpacing: 2,
            fontWeight: 800,
            fontSize: 12,
            color: themeColor,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1, height: 2, background: `${themeColor}33` }} />
      </div>
      {children}
    </div>
  );
}

function ScissorsIcon({ color }: { color: string }) {
  return (
    <svg
      width={14}
      height={14}
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

function DetachableBlock({
  t,
  c,
  exportMode,
  children,
}: {
  t: TranslationDict;
  c: typeof PALETTE;
  exportMode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-folder-pagebreak={exportMode ? 'true' : undefined}
      style={{
        position: 'relative',
        border: `2px dashed ${c.muted}`,
        borderRadius: 10,
        padding: '14px 16px 4px',
        marginBottom: 26,
        marginTop: 8,
        background: c.white,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
          color: c.muted,
        }}
      >
        <ScissorsIcon color={c.muted} />
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            fontWeight: 700,
          }}
        >
          {t.folders.cutHere}
        </span>
      </div>
      {children}
    </div>
  );
}

function PrayerRequestsBlock({
  t,
  themeColor,
  c,
}: {
  t: TranslationDict;
  themeColor: string;
  c: typeof PALETTE;
}) {
  return (
    <Section title={t.folders.prayerRequestsBlockTitle} themeColor={themeColor}>
      <div style={{ borderRadius: 8, border: `1px solid ${c.line}`, padding: '2px 14px' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: LINED_ROW_HEIGHT,
              borderBottom: i < 9 ? `1px dashed ${c.line}` : 'none',
            }}
          />
        ))}
      </div>
    </Section>
  );
}

function FormLine({
  label,
  c,
  flex = 1,
}: {
  label: string;
  c: typeof PALETTE;
  flex?: number;
}) {
  return (
    <div style={{ flex, minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: c.muted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ borderBottom: `1px solid ${c.line}`, height: 20 }} />
    </div>
  );
}

function RegistrationFormBlock({
  t,
  themeColor,
  c,
}: {
  t: TranslationDict;
  themeColor: string;
  c: typeof PALETTE;
}) {
  return (
    <Section title={t.folders.registrationFormTitle} themeColor={themeColor}>
      <div style={{ borderRadius: 8, border: `1px solid ${c.line}`, padding: 14 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <FormLine label={t.folders.name} c={c} />
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <FormLine label={t.folders.phone} c={c} />
          <FormLine label={t.folders.birthDate} c={c} />
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <FormLine label={t.folders.baptismDate} c={c} />
          <FormLine label={t.folders.maritalStatus} c={c} />
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <FormLine label={t.folders.street} c={c} flex={3} />
          <FormLine label={t.folders.number} c={c} flex={1} />
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <FormLine label={t.folders.cep} c={c} />
          <FormLine label={t.folders.neighborhood} c={c} />
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <FormLine label={t.folders.complement} c={c} flex={2} />
          <FormLine label={t.folders.city} c={c} flex={2} />
          <FormLine label={t.folders.state} c={c} flex={1} />
        </div>
      </div>
    </Section>
  );
}

function QrCard({
  label,
  url,
  themeColor,
  interactive,
}: {
  label: string;
  url: string;
  themeColor: string;
  interactive?: boolean;
}) {
  const qr = (
    <QRCodeSVG value={url} size={108} fgColor="#111827" includeMargin={false} />
  );
  const content = (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 8,
        padding: 12,
        textAlign: 'center',
      }}
    >
      {qr}
      <div
        style={{
          marginTop: 8,
          fontWeight: 700,
          fontSize: 12,
          color: themeColor,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 9.5,
          color: PALETTE.muted,
          wordBreak: 'break-all',
          marginTop: 2,
          maxHeight: 22,
          overflow: 'hidden',
        }}
      >
        {url}
      </div>
    </div>
  );
  if (!interactive) return <div>{content}</div>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      {content}
    </a>
  );
}

function renderCover(
  folder: FolderPreviewData,
  church: FolderPreviewChurch,
  themeColor: string,
  t: TranslationDict,
  locale: 'pt-br' | 'en' | 'es'
) {
  const period = periodLabel(folder, t, locale);
  const common = { themeColor, church, folder, period, t };
  switch (folder.cover_template) {
    case 2:
      return <CoverModern {...common} />;
    case 3:
      return <CoverElegant {...common} />;
    default:
      return <CoverClassic {...common} />;
  }
}

function CoverBase({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={style}>{children}</div>;
}

function CoverClassic(props: {
  church: FolderPreviewChurch;
  folder: FolderPreviewData;
  themeColor: string;
  period: string;
  t: TranslationDict;
}) {
  const { church, folder, themeColor, period, t } = props;
  return (
    <CoverBase
      style={{
        background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -28)})`,
        color: '#fff',
        padding: '34px 32px 30px',
        textAlign: 'center',
      }}
    >
      {church.logo && <Logo logo={church.logo} />}
      <div
        style={{
          letterSpacing: 4,
          textTransform: 'uppercase',
          fontSize: 11,
          fontWeight: 600,
          opacity: 0.85,
        }}
      >
        {church.name}
      </div>
      <div
        style={{
          fontFamily: "Georgia,'Times New Roman',serif",
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.2,
          margin: '12px 0 6px',
        }}
      >
        {folder.title || t.folders.defaultTitle}
      </div>
      {folder.subtitle && (
        <div style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.4 }}>{folder.subtitle}</div>
      )}
      {period && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: 'uppercase',
            borderTop: '1px solid rgba(255,255,255,0.4)',
            borderBottom: '1px solid rgba(255,255,255,0.4)',
            padding: '5px 0',
            display: 'inline-block',
          }}
        >
          {period}
        </div>
      )}
    </CoverBase>
  );
}

function CoverModern(props: {
  church: FolderPreviewChurch;
  folder: FolderPreviewData;
  themeColor: string;
  period: string;
  t: TranslationDict;
}) {
  const { church, folder, themeColor, period, t } = props;
  return (
    <div
      style={{
        display: 'flex',
        background: '#ffffff',
        borderBottom: `4px solid ${themeColor}`,
      }}
    >
      <div
        style={{
          width: 84,
          background: themeColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ writingMode: 'vertical-rl', textTransform: 'uppercase', letterSpacing: 3, fontSize: 12, fontWeight: 700 }}>
          {church.name}
        </div>
      </div>
      <div style={{ flex: 1, padding: '28px 26px 24px' }}>
        {church.logo && (
          <CoverBase style={{ textAlign: 'left', marginBottom: 8 }}>
            <Logo logo={church.logo} small />
          </CoverBase>
        )}
        <div
          style={{
            fontFamily: "Georgia,'Times New Roman',serif",
            fontSize: 26,
            fontWeight: 700,
            color: '#111827',
            lineHeight: 1.2,
          }}
        >
          {folder.title || t.folders.defaultTitle}
        </div>
        {folder.subtitle && (
          <div style={{ fontSize: 13.5, color: '#6b7280', marginTop: 4 }}>{folder.subtitle}</div>
        )}
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1.5, color: themeColor, marginTop: 12 }}>
          {period}
        </div>
      </div>
    </div>
  );
}

function CoverElegant(props: {
  church: FolderPreviewChurch;
  folder: FolderPreviewData;
  themeColor: string;
  period: string;
  t: TranslationDict;
}) {
  const { church, folder, themeColor, period, t } = props;
  return (
    <CoverBase
      style={{
        background: '#ffffff',
        color: PALETTE.ink,
        textAlign: 'center',
        padding: '34px 32px 30px',
        borderTop: `6px double ${PALETTE.gold}`,
        borderBottom: `1px solid ${PALETTE.gold}`,
      }}
    >
      {church.logo && <Logo logo={church.logo} small />}
      <div
        style={{
          fontFamily: "Georgia,'Times New Roman',serif",
          color: PALETTE.gold,
          letterSpacing: 5,
          textTransform: 'uppercase',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {church.name}
      </div>
      <div
        style={{
          fontFamily: "Georgia,'Times New Roman',serif",
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.25,
          margin: '14px 0 6px',
          color: '#111827',
        }}
      >
        {folder.title || t.folders.defaultTitle}
      </div>
      {folder.subtitle && (
        <div style={{ fontSize: 13.5, color: PALETTE.muted, fontStyle: 'italic' }}>{folder.subtitle}</div>
      )}
      <div style={{ marginTop: 14, color: themeColor, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
        {period}
      </div>
      <div style={{ margin: '16px auto 0', width: 90, height: 2, background: PALETTE.gold }} />
    </CoverBase>
  );
}

function Logo({ logo, small }: { logo: string; small?: boolean }) {
  return (
    <img
      src={logo}
      alt=""
      style={{
        width: small ? 56 : 72,
        height: 'auto',
        borderRadius: 99,
        objectFit: 'cover',
        ...(small ? { margin: '0 auto 8px', display: 'block' } : { marginBottom: 10 }),
      }}
    />
  );
}

// Escurece/clareia uma cor hex simples (aceita #rrggbb ou #rgb).
function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const amount = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default FolderPreview;
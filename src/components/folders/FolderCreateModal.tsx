import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  ColorInput,
  Group,
  Grid,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  IconAddressBook,
  IconBell,
  IconCake,
  IconCalendarEvent,
  IconCalendarPlus,
  IconCash,
  IconHeart,
  IconLink,
  IconList,
  IconNotes,
  IconPlus,
  IconShare,
  IconTrash,
  IconUser,
  IconUserPlus,
  IconWand,
} from '@tabler/icons-react';
import { RichText } from '../RichText';
import SortableBlockRow from './SortableBlockRow';
import FolderTrifold, {
  absoluteUrl,
  SOCIAL_LINK_TYPES,
  type TrifoldChurch,
} from './FolderTrifold';
import type { FolderPreviewChurch } from './FolderPreview';
import { accountsApi, churchLinksApi } from '../../api/accounts';
import { boletimApi } from '../../api/boletim';
import { useLanguage } from '../../i18n';
import { useFeedback } from '../../hooks/useFeedback';
import { useIsCompactList } from '../../hooks/useListBreakpoint';
import type {
  FolderBlockKey,
  FolderBlocks,
  FolderCulto,
  FolderCultoAniversarianteItem,
  FolderCultoAnuncioItem,
  FolderCultoProgramacaoItem,
  FolderCultoQr,
  FolderCultoRow,
  FolderCultoServiceType,
  FolderCultoTipo,
} from '../../types';

interface DraftRow {
  id?: number;
  service_type: FolderCultoServiceType;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  preacher: string;
}

// Horário no padrão 24h (HH:MM). Os dígitos são digitados sem acolchoar
// (ex.: "2" → "2", "20" → "20", "20:0", "20:00").
function sanitizeTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  const hh = digits.slice(0, 2);
  const mm = digits.length > 2 ? digits.slice(2, 4) : '';
  return mm ? `${hh}:${mm}` : hh;
}

// Completa o horário parcial para HH:MM antes de enviar (ex.: "19" → "19:00").
function normalizeTime(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const hh = digits.slice(0, 2).padStart(2, '0');
  const mm = digits.slice(2, 4).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Soma minutos a um horário HH:MM, com volta de 24h.
function addMinutes(time: string, minutes: number): string {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function templateOptions(t: any): { value: number; label: string }[] {
  return [
    { value: 1, label: t.folders.templateClassic },
    { value: 2, label: t.folders.templateModern },
    { value: 3, label: t.folders.templateElegant },
    { value: 4, label: t.folders.templateMinimal },
    { value: 5, label: t.folders.templateCustom },
  ];
}

function TemplateThumb({
  template,
  themeColor,
  backgroundColor,
}: {
  template: number;
  themeColor: string;
  backgroundColor: string;
}) {
  const base: React.CSSProperties = {
    height: 58,
    borderRadius: 8,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
  if (template === 1) {
    return (
      <div style={{ ...base, background: '#F8F9FA' }}>
        <div style={{ height: 18, background: '#1A365D' }} />
        <div style={{ padding: '7px 9px' }}>
          <div style={{ height: 6, width: '72%', background: '#1A365D', borderRadius: 3, marginBottom: 5 }} />
          <div style={{ height: 4, width: '45%', background: '#b8953f', borderRadius: 3 }} />
        </div>
      </div>
    );
  }
  if (template === 2) {
    return (
      <div style={{ ...base, background: `linear-gradient(160deg, ${themeColor}22, ${themeColor}55)` }}>
        <div style={{ height: 14, width: '78%', background: themeColor, borderRadius: 7, margin: '16px auto 0' }} />
        <div style={{ height: 4, width: '50%', background: themeColor, borderRadius: 3, margin: '7px auto 0', opacity: 0.5 }} />
      </div>
    );
  }
  if (template === 3) {
    return (
      <div style={{ ...base, background: 'linear-gradient(168deg, #2D3748, #1a202c)', padding: 6 }}>
        <div style={{ height: '100%', border: '1px solid #c9a22788', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <div style={{ height: 5, width: '60%', background: '#c9a227', borderRadius: 3 }} />
          <div style={{ height: 4, width: '42%', background: '#7b2d3b', borderRadius: 3 }} />
        </div>
      </div>
    );
  }
  if (template === 4) {
    return (
      <div style={{ ...base, background: '#ffffff', border: '2px solid #111111', padding: 8 }}>
        <div style={{ height: 7, width: '72%', background: '#111111', borderRadius: 2, margin: '8px auto 5px' }} />
        <div style={{ height: 4, width: '50%', background: '#111111', borderRadius: 2, margin: '0 auto' }} />
      </div>
    );
  }
  return (
    <div style={{ ...base, background: backgroundColor || '#ffffff' }}>
      <div style={{ height: '100%', background: `linear-gradient(160deg, ${themeColor}, ${themeColor}cc)` }} />
    </div>
  );
}

export interface FolderDraft {
  tipo: FolderCultoTipo;
  referenceDate: string | null;
  title: string;
  subtitle: string;
  service_type: FolderCultoServiceType | '';
  versiculo: string;
  cover_template: number;
  theme_color: string;
  background_color: string;
  cover_font: string;
  mensagem_pastoral: string;
  article_title: string;
  programacao: FolderCultoProgramacaoItem[];
  anuncios: FolderCultoAnuncioItem[];
  aniversariantes: FolderCultoAniversarianteItem[];
  qr: FolderCultoQr;
  social: Record<string, boolean>;
  blocks: FolderBlocks;
  block_order: FolderBlockKey[];
  rows: DraftRow[];
}

interface FolderCreateModalProps {
  opened: boolean;
  onClose: () => void;
  folder?: FolderCulto | null;
  church?: FolderPreviewChurch;
  onSaved: (folder: FolderCulto) => void;
}

const SERVICE_TYPES: FolderCultoServiceType[] = [
  'CELEBRACAO',
  'DOUTRINA',
  'ORACAO',
  'VIGILIA',
  'CEIA',
  'ESCOLA_BIBLICA',
  'JOVENS',
  'OUTRO',
];

const EMPTY_QR: FolderCultoQr = {
  visita: { enabled: false, url: '' },
  oracao: { enabled: false, url: '' },
  agenda: { enabled: false, url: '' },
  cadastro: { enabled: false, url: '' },
};

const QR_KEYS: Array<keyof FolderCultoQr> = ['visita', 'oracao', 'agenda', 'cadastro'];

function normalizeQr(qr: FolderCultoQr): FolderCultoQr {
  return {
    visita: { ...qr.visita, url: absoluteUrl(qr.visita.url) },
    oracao: { ...qr.oracao, url: absoluteUrl(qr.oracao.url) },
    agenda: { ...qr.agenda, url: absoluteUrl(qr.agenda.url) },
    cadastro: { ...qr.cadastro, url: absoluteUrl(qr.cadastro.url) },
  };
}

const DEFAULT_BLOCKS: FolderBlocks = {
  programacao: true,
  agenda: true,
  avisos: true,
  aniversariantes: true,
  contatos: true,
  dizimos: true,
  links: true,
  social: true,
  oracao: true,
  ficha_visitante: true,
  cadastro: true,
  anotacoes: true,
};

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

function emptyDraft(): FolderDraft {
  return {
    tipo: 'MENSAL',
    referenceDate: toISO(new Date()),
    title: '',
    subtitle: '',
    service_type: '',
    versiculo: '',
    cover_template: 1,
    theme_color: '#1d4ed8',
    background_color: '#ffffff',
    cover_font: 'sans',
    mensagem_pastoral: '',
    article_title: '',
    programacao: [],
    anuncios: [],
    aniversariantes: [],
    qr: JSON.parse(JSON.stringify(EMPTY_QR)),
    social: {},
    blocks: { ...DEFAULT_BLOCKS },
    block_order: [...DEFAULT_BLOCK_ORDER],
    rows: [],
  };
}

function toISO(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function lastDayOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return d;
}

function draftPeriod(draft: FolderDraft): { start: string; end: string } {
  if (!draft.referenceDate) return { start: '', end: '' };
  const parts = draft.referenceDate.split('-').map(Number);
  if (!parts[0]) return { start: '', end: '' };
  const base = new Date(parts[0], parts[1] - 1, parts[2] || 1);
  if (draft.tipo === 'MENSAL') {
    return { start: toISO(new Date(parts[0], parts[1] - 1, 1)), end: toISO(lastDayOfMonth(base)) };
  }
  const weekStart = startOfWeek(base);
  return { start: toISO(weekStart), end: toISO(addDays(weekStart, 6)) };
}

// Combina as flags antigas (donations/address) e novas em FolderBlocks.
function draftBlocks(src: Partial<Record<string, boolean>> | null | undefined): FolderBlocks {
  const merged = { ...DEFAULT_BLOCKS };
  const source = src || {};
  (Object.keys(DEFAULT_BLOCKS) as FolderBlockKey[]).forEach((key) => {
    if (typeof source[key] === 'boolean') merged[key] = source[key];
  });
  const legacy: Record<string, FolderBlockKey> = { donations: 'dizimos', address: 'contatos' };
  Object.entries(legacy).forEach(([oldKey, newKey]) => {
    if (typeof source[oldKey] === 'boolean' && typeof source[newKey] !== 'boolean') {
      merged[newKey] = source[oldKey];
    }
  });
  return merged;
}

function folderToDraft(folder: FolderCulto): FolderDraft {
  return {
    tipo: folder.tipo,
    referenceDate: folder.reference_start ? folder.reference_start.slice(0, 10) : toISO(new Date()),
    title: folder.title,
    subtitle: folder.subtitle,
    service_type: (folder.service_type || '') as FolderCultoServiceType | '',
    versiculo: folder.versiculo || '',
    cover_template: folder.cover_template,
    theme_color: folder.theme_color || '#1d4ed8',
    background_color: folder.background_color || '#ffffff',
    cover_font: folder.cover_font || 'sans',
    mensagem_pastoral: folder.mensagem_pastoral,
    article_title: folder.article_title || '',
    programacao: Array.isArray(folder.programacao) ? folder.programacao : [],
    anuncios: Array.isArray(folder.anuncios) ? folder.anuncios : [],
    aniversariantes: Array.isArray(folder.aniversariantes) ? folder.aniversariantes : [],
    qr: folder.qr ? normalizeQr(folder.qr) : JSON.parse(JSON.stringify(EMPTY_QR)),
    social: folder.social && typeof folder.social === 'object' ? { ...folder.social } : {},
    blocks: draftBlocks(folder.blocks),
    block_order:
      Array.isArray(folder.block_order) && folder.block_order.length
        ? [...folder.block_order]
        : [...DEFAULT_BLOCK_ORDER],
    rows: folder.rows.map((r) => ({
      id: r.id,
      service_type: r.service_type,
      date: r.date,
      start_time: r.start_time ? r.start_time.slice(0, 5) : '',
      end_time: r.end_time ? r.end_time.slice(0, 5) : '',
      title: r.title,
      preacher: r.preacher,
    })),
  };
}

export default function FolderCreateModal({
  opened,
  onClose,
  folder,
  church,
  onSaved,
}: FolderCreateModalProps) {
  const { t, locale } = useLanguage();
  const fb = useFeedback();
  const isCompact = useIsCompactList();
  const isEdit = Boolean(folder);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FolderDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingBirthdays, setFetchingBirthdays] = useState(false);
  const [layoutOverflow, setLayoutOverflow] = useState(false);
  const seeded = useRef(false);
  const [trifoldChurch, setTrifoldChurch] = useState<TrifoldChurch | undefined>(church);

  useEffect(() => {
    if (!opened) return;
    let active = true;
    Promise.all([
      churchLinksApi.config().catch(() => null),
      churchLinksApi.list().catch(() => []),
    ]).then(([config, links]) => {
      if (!active) return;
      setTrifoldChurch({
        ...(church ?? {}),
        slug: config?.slug,
        default_pix_key: config?.default_pix_key,
        default_pix_type: config?.default_pix_type,
        links: links.filter((l) => l.is_active),
      });
    });
    return () => {
      active = false;
    };
  }, [opened, church]);

  useEffect(() => {
    if (!opened) return;
    setDraft(folder ? folderToDraft(folder) : emptyDraft());
    setStep(0);
    if (!folder) {
      seeded.current = false;
      void seedQrUrls();
    }
  }, [opened, folder]);

  async function seedQrUrls() {
    if (seeded.current) return;
    seeded.current = true;
    try {
      const next = JSON.parse(JSON.stringify(EMPTY_QR)) as FolderCultoQr;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const config = await churchLinksApi.config().catch(() => null);
      const calendarLink = await accountsApi.calendarPublicLink().catch(() => null);
      const formLink = await accountsApi.churchMemberFormLink().catch(() => null);
      if (config?.slug) next.oracao.url = `${origin}/p/${config.slug}`;
      if (calendarLink) next.agenda.url = absoluteUrl(calendarLink.url);
      if (formLink) next.cadastro.url = absoluteUrl(formLink.url);
      setDraft((d) => ({
        ...d,
        qr: {
          visita: d.qr.visita,
          oracao: { ...d.qr.oracao, url: d.qr.oracao.url || next.oracao.url },
          agenda: { ...d.qr.agenda, url: d.qr.agenda.url || next.agenda.url },
          cadastro: { ...d.qr.cadastro, url: d.qr.cadastro.url || next.cadastro.url },
        },
      }));
    } catch {
      /* defaults opcionais */
    }
  }

  const period = useMemo(() => draftPeriod(draft), [draft.tipo, draft.referenceDate]);

  const serviceTypeOptions = useMemo(
    () =>
      SERVICE_TYPES.map((value) => ({
        value,
        label: t.cultosPage.serviceTypes[value],
      })),
    [t]
  );

  const socialOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const link of trifoldChurch?.links ?? []) {
      if (SOCIAL_LINK_TYPES.includes(link.link_type) && !seen.has(link.link_type)) {
        seen.set(link.link_type, link.title);
      }
    }
    return [...seen].map(([type, title]) => ({ type, title }));
  }, [trifoldChurch]);

  const previewData = useMemo(
    () => ({
      tipo: draft.tipo,
      title: draft.title,
      subtitle: draft.subtitle,
      service_type: draft.service_type,
      versiculo: draft.versiculo,
      cover_template: draft.cover_template,
      theme_color: draft.theme_color,
      background_color: draft.background_color,
      cover_font: draft.cover_font,
      mensagem_pastoral: draft.mensagem_pastoral,
      article_title: draft.article_title,
      reference_start: period.start,
      reference_end: period.end,
      programacao: draft.programacao,
      anuncios: draft.anuncios,
      aniversariantes: draft.aniversariantes,
      qr: draft.qr,
      social: draft.social,
      blocks: draft.blocks,
      block_order: draft.block_order,
      rows: rowToPreview(draft.rows),
    }),
    [draft, period]
  );

  function canGoNext(stepIndex: number): boolean {
    if (stepIndex === 0) return Boolean(draft.referenceDate);
    return true;
  }

  async function handleSync() {
    if (!period.start || !period.end) return;
    setSyncing(true);
    try {
      if (folder) {
        const res = await boletimApi.syncEvents(folder.id);
        setDraft((d) => ({ ...d, rows: res.folder.rows.map(rowToDraft) }));
        fb.success(t.folders.syncDone.replace('{count}', String(res.created)));
      } else {
        const res = await boletimApi.previewSyncEvents(period.start, period.end);
        const mapped: DraftRow[] = res.rows.map((r) => ({
          service_type: r.service_type,
          date: r.date,
          start_time: r.start_time ? r.start_time.slice(0, 5) : '',
          end_time: r.end_time ? r.end_time.slice(0, 5) : '',
          title: r.title,
          preacher: r.preacher || '',
        }));
        const seen = new Set(draft.rows.map((r) => `${r.date}|${r.service_type}|${r.title}`));
        const added = mapped.filter((r) => !seen.has(`${r.date}|${r.service_type}|${r.title}`));
        setDraft((d) => ({ ...d, rows: [...d.rows, ...added] }));
        fb.success(t.folders.syncDone.replace('{count}', String(added.length)));
      }
    } catch (err) {
      fb.fromError(err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleFetchBirthdays() {
    if (!period.start || !period.end) return;
    setFetchingBirthdays(true);
    try {
      const found = folder
        ? await boletimApi.birthdays(folder.id)
        : await boletimApi.previewBirthdays(period.start, period.end);
      const lookup = new Set(
        draft.aniversariantes.map((b) => `${b.name}|${b.day}|${b.month}`)
      );
      const added = found.filter(
        (b) => !lookup.has(`${b.name}|${b.day}|${b.month}`)
      );
      setDraft((d) => ({ ...d, aniversariantes: [...d.aniversariantes, ...added] }));
      fb.success(t.folders.birthdaysDone.replace('{count}', String(added.length)));
    } catch (err) {
      fb.fromError(err);
    } finally {
      setFetchingBirthdays(false);
    }
  }

  async function handleSave() {
    const { start, end } = period;
    if (!start) return;
    const payload = {
      tipo: draft.tipo,
      title: draft.title || t.folders.defaultTitle,
      subtitle: draft.subtitle,
      service_type: draft.service_type,
      versiculo: draft.versiculo,
      cover_template: draft.cover_template,
      theme_color: draft.theme_color,
      background_color: draft.background_color,
      cover_font: draft.cover_font,
      mensagem_pastoral: draft.mensagem_pastoral,
      article_title: draft.article_title,
      reference_start: start,
      reference_end: end,
      programacao: draft.programacao.map((p) => ({
        time: normalizeTime(p.time),
        label: p.label,
      })),
      anuncios: draft.anuncios,
      aniversariantes: draft.aniversariantes,
      qr: normalizeQr(draft.qr),
      social: draft.social,
      blocks: draft.blocks,
      block_order: draft.block_order,
      rows: draft.rows.map((r, idx) => ({
        service_type: r.service_type,
        date: r.date,
        start_time: normalizeTime(r.start_time) || null,
        end_time: normalizeTime(r.end_time) || null,
        title: r.title,
        preacher: r.preacher,
        sort_order: idx,
      })),
    };
    setSaving(true);
    try {
      const saved = folder
        ? await boletimApi.update(folder.id, payload)
        : await boletimApi.create(payload);
      fb.savedWithName(saved.title);
      onSaved(saved);
      onClose();
    } catch (err) {
      fb.fromError(err, t.common.toast.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const content = [
    <PeriodStep
      key="period"
      t={t}
      draft={draft}
      setDraft={setDraft}
      period={period}
    />,
    <ContentStep
      key="content"
      t={t}
      draft={draft}
      setDraft={setDraft}
      serviceTypeOptions={serviceTypeOptions}
    />,
    <ScheduleStep
      key="schedule"
      t={t}
      draft={draft}
      setDraft={setDraft}
      serviceTypeOptions={serviceTypeOptions}
      syncing={syncing}
      canSync={Boolean(period.start && period.end)}
      onSync={handleSync}
    />,
    <FinalizeStep
      key="finalize"
      t={t}
      draft={draft}
      setDraft={setDraft}
      socialOptions={socialOptions}
      fetchingBirthdays={fetchingBirthdays}
      canFetchBirthdays={Boolean(period.start && period.end)}
      onFetchBirthdays={handleFetchBirthdays}
    />,
    <LayoutStep
      key="layout"
      t={t}
      draft={draft}
      setDraft={setDraft}
      overflow={layoutOverflow}
    />,
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700} size="lg">{isEdit ? t.folders.editFolder : t.folders.new}</Text>}
      size="100%"
      closeOnClickOutside={false}
      centered
      fullScreen={isCompact}
    >
      <Grid gap="sm">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="lg">
            <Stepper
              active={step}
              onStepClick={(s) => s < step && setStep(s)}
              size="sm"
              color="teal"
            >
              <Stepper.Step label={t.folders.stepPeriod} allowStepSelect>
                {content[0]}
              </Stepper.Step>
              <Stepper.Step label={t.folders.stepContent} allowStepSelect>
                {content[1]}
              </Stepper.Step>
              <Stepper.Step label={t.folders.stepSchedule} allowStepSelect>
                {content[2]}
              </Stepper.Step>
              <Stepper.Step label={t.folders.stepFinalize} allowStepSelect>
                {content[3]}
              </Stepper.Step>
              <Stepper.Step label={t.folders.stepLayout} allowStepSelect>
                {content[4]}
              </Stepper.Step>
            </Stepper>

            <Group justify="space-between" wrap="wrap">
              <Button
                variant="light"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                {t.common.back}
              </Button>
              {step < 4 ? (
                <Button onClick={() => canGoNext(step) && setStep((s) => s + 1)}>
                  {t.common.next}
                </Button>
              ) : (
                <Button loading={saving} onClick={handleSave}>
                  {isEdit ? t.folders.save : t.folders.create}
                </Button>
              )}
            </Group>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }} visibleFrom="lg">
          <Paper withBorder radius="md" p="sm" bg="white">
            <Text size="xs" fw={600} c="dimmed" mb={6}>
              {t.folders.preview}
            </Text>
            <Box style={{ maxHeight: '64vh', overflowY: 'auto' }}>
              <FolderTrifold
                folder={previewData}
                church={trifoldChurch}
                t={t}
                locale={locale}
                previewScale={0.45}
                onOverflowChange={setLayoutOverflow}
              />
            </Box>
          </Paper>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}

function PeriodStep({
  t,
  draft,
  setDraft,
  period,
}: {
  t: any;
  draft: FolderDraft;
  setDraft: React.Dispatch<React.SetStateAction<FolderDraft>>;
  period: { start: string; end: string };
}) {
  return (
    <Stack gap="md">
      <Box>
        <Text size="sm" fw={500} mb={4}>
          {t.folders.tipoLabel}
        </Text>
        <SegmentedControl
          fullWidth
          value={draft.tipo}
          onChange={(v) => setDraft((d) => ({ ...d, tipo: v as FolderCultoTipo }))}
          data={[
            { value: 'MENSAL', label: t.folders.mensal },
            { value: 'SEMANAL', label: t.folders.semanal },
          ]}
        />
      </Box>
      <DateInput
        label={t.folders.referenceDate}
        description={t.folders.referenceHint}
        valueFormat="DD/MM/YYYY"
        value={draft.referenceDate}
        onChange={(v) => setDraft((d) => ({ ...d, referenceDate: v }))}
        required
      />
      {period.start && (
        <Paper withBorder p="xs" radius="md" bg="gray.0">
          <Text size="xs" c="dimmed" fw={600}>
            {t.folders.reference}
          </Text>
          <Text size="sm" fw={500}>
            {formatPeriod(period.start, period.end)}
          </Text>
        </Paper>
      )}
    </Stack>
  );
}

function ContentStep({
  t,
  draft,
  setDraft,
  serviceTypeOptions,
}: {
  t: any;
  draft: FolderDraft;
  setDraft: React.Dispatch<React.SetStateAction<FolderDraft>>;
  serviceTypeOptions: { value: string; label: string }[];
}) {
  return (
    <Stack gap="md">
      <Select
        label={t.folders.serviceType}
        description={t.folders.serviceTypeCoverHint}
        data={[{ value: '', label: t.folders.serviceTypeNone }, ...serviceTypeOptions]}
        value={draft.service_type}
        onChange={(v) =>
          setDraft((d) => ({ ...d, service_type: (v as FolderCultoServiceType) || '' }))
        }
        allowDeselect={false}
      />
      <TextInput
        label={t.folders.titleLabel}
        placeholder={t.folders.titlePlaceholder}
        value={draft.title}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setDraft((d) => ({ ...d, title: value }));
        }}
      />
      <TextInput
        label={t.folders.subtitleLabel}
        placeholder={t.folders.subtitlePlaceholder}
        value={draft.subtitle}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setDraft((d) => ({ ...d, subtitle: value }));
        }}
      />
      <TextInput
        label={t.folders.versiculoLabel}
        placeholder={t.folders.versiculoPlaceholder}
        value={draft.versiculo}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setDraft((d) => ({ ...d, versiculo: value }));
        }}
      />
      <Box>
        <Text size="sm" fw={500} mb={6}>
          {t.folders.coverTemplate}
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
          {templateOptions(t).map((opt) => {
            const active = draft.cover_template === opt.value;
            return (
              <Card
                key={opt.value}
                withBorder
                radius="md"
                padding="xs"
                onClick={() => setDraft((d) => ({ ...d, cover_template: opt.value }))}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  borderColor: active ? 'var(--mantine-color-teal-5)' : undefined,
                  borderWidth: active ? 2 : 1,
                  background: active ? 'var(--mantine-color-teal-light)' : undefined,
                }}
              >
                <TemplateThumb
                  template={opt.value}
                  themeColor={draft.theme_color}
                  backgroundColor={draft.background_color}
                />
                <Text size="xs" fw={active ? 700 : 500} mt={6} ta="center" lineClamp={1}>
                  {opt.label}
                </Text>
                {active && (
                  <Badge
                    size="xs"
                    color="teal"
                    variant="filled"
                    style={{ position: 'absolute', top: 6, right: 6 }}
                  >
                    {t.folders.selected}
                  </Badge>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
        {draft.cover_template === 5 && (
          <Stack gap="sm" mt="sm">
            <Group grow align="flex-start">
              <ColorInput
                label={t.folders.themeColor}
                value={draft.theme_color}
                onChange={(v) => setDraft((d) => ({ ...d, theme_color: v }))}
                swatches={['#1d4ed8', '#0f766e', '#15803d', '#b45309', '#7c3aed', '#9d174d', '#111827']}
              />
              <ColorInput
                label={t.folders.backgroundColor}
                value={draft.background_color}
                onChange={(v) => setDraft((d) => ({ ...d, background_color: v }))}
                swatches={['#ffffff', '#F8F9FA', '#f1f3f5', '#fff4e6', '#e7f5ff', '#ebfbee', '#f8f0fc']}
              />
            </Group>
            <Select
              label={t.folders.fontFamily}
              value={draft.cover_font}
              onChange={(v) => setDraft((d) => ({ ...d, cover_font: v || 'sans' }))}
              data={[
                { value: 'sans', label: t.folders.fontSans },
                { value: 'serif', label: t.folders.fontSerif },
                { value: 'mono', label: t.folders.fontMono },
                { value: 'condensed', label: t.folders.fontCondensed },
              ]}
              allowDeselect={false}
            />
          </Stack>
        )}
      </Box>
      <Box>
        <Text size="sm" fw={500} mb={4}>
          {t.folders.articleSection}
        </Text>
        <TextInput
          label={t.folders.articleLabel}
          placeholder={t.folders.articlePlaceholder}
          value={draft.article_title}
          onChange={(e) => setDraft((d) => ({ ...d, article_title: e.currentTarget.value }))}
          mb="xs"
        />
        <RichText
          value={draft.mensagem_pastoral}
          onChange={(html) => setDraft((d) => ({ ...d, mensagem_pastoral: html }))}
        />
      </Box>
    </Stack>
  );
}

function ScheduleStep({
  t,
  draft,
  setDraft,
  serviceTypeOptions,
  syncing,
  canSync,
  onSync,
}: {
  t: any;
  draft: FolderDraft;
  setDraft: React.Dispatch<React.SetStateAction<FolderDraft>>;
  serviceTypeOptions: { value: string; label: string }[];
  syncing: boolean;
  canSync: boolean;
  onSync: () => void;
}) {
  const updateProgramacao = (items: FolderCultoProgramacaoItem[]) =>
    setDraft((d) => ({ ...d, programacao: items }));
  const updateRows = (rows: DraftRow[]) => setDraft((d) => ({ ...d, rows }));

  const [baseTime, setBaseTime] = useState(
    () => draft.programacao[0]?.time || draft.rows[0]?.start_time || '18:00'
  );

  const autoFillProgramacao = () => {
    const start = normalizeTime(baseTime) || '18:00';
    const offsets = [0, 15, 45, 55, 65, 110, 120];
    const labels = [
      t.folders.programInit,
      t.folders.programPraise,
      t.folders.programOffering,
      t.folders.programMissions,
      t.folders.programWord,
      t.folders.programBenediction,
      t.folders.programVisitors,
    ];
    updateProgramacao(offsets.map((off, i) => ({ time: addMinutes(start, off), label: labels[i] })));
  };

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" mb={6} wrap="nowrap">
          <Text size="sm" fw={600}>{t.folders.programacao}</Text>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={() => updateProgramacao([...draft.programacao, { time: '', label: '' }])}
          >
            {t.folders.addProgramacao}
          </Button>
        </Group>
        <Group align="flex-end" gap="xs" mb="sm" wrap="wrap">
          <TextInput
            label={t.folders.scheduleStart}
            w={140}
            placeholder="18:00"
            inputMode="numeric"
            maxLength={5}
            value={baseTime}
            onChange={(e) => setBaseTime(sanitizeTime(e.currentTarget.value))}
          />
          <Button
            variant="light"
            leftSection={<IconWand size={15} />}
            onClick={autoFillProgramacao}
          >
            {t.folders.autoFillProgram}
          </Button>
        </Group>
        {draft.programacao.length === 0 && (
          <Text size="xs" c="dimmed">{t.folders.addProgramacao}</Text>
        )}
        {draft.programacao.map((item, i) => (
          <Group key={i} align="flex-end" gap="xs" mb="xs" wrap="nowrap">
            <TextInput
              label={t.folders.time}
              w={100}
              placeholder="19:00"
              inputMode="numeric"
              maxLength={5}
              value={item.time ?? ''}
              onChange={(e) => {
                const next = [...draft.programacao];
                next[i] = { ...next[i], time: sanitizeTime(e.currentTarget.value) };
                updateProgramacao(next);
              }}
            />
            <TextInput
              label={t.folders.label}
              flex={1}
              value={item.label}
              onChange={(e) => {
                const next = [...draft.programacao];
                next[i] = { ...next[i], label: e.currentTarget.value };
                updateProgramacao(next);
              }}
            />
            <IconButtonRemove
              label={t.folders.remove}
              onClick={() => updateProgramacao(draft.programacao.filter((_, idx) => idx !== i))}
            />
          </Group>
        ))}
      </Box>

      <Box>
        <Group justify="space-between" mb={6} wrap="wrap">
          <Text size="sm" fw={600}>{t.folders.agenda}</Text>
          <Group gap={6}>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconCalendarPlus size={14} />}
              loading={syncing}
              disabled={!canSync}
              onClick={onSync}
              title={canSync ? '' : t.folders.saveRequiredHint}
            >
              {t.folders.syncFromCalendar}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                updateRows([
                  ...draft.rows,
                  {
                    service_type: 'CELEBRACAO',
                    date: new Date().toISOString().slice(0, 10),
                    start_time: '',
                    end_time: '',
                    title: '',
                    preacher: '',
                  },
                ])
              }
            >
              {t.folders.addRow}
            </Button>
          </Group>
        </Group>
        {draft.rows.length === 0 && (
          <Text size="xs" c="dimmed">{canSync ? t.folders.syncFromCalendar : t.folders.addRow}</Text>
        )}
        {draft.rows.map((row, i) => (
          <Paper key={row.id ?? i} withBorder p="xs" radius="md" mb="xs">
            <Grid gap="xs">
              <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                <DateInput
                  label={t.folders.date}
                  valueFormat="DD/MM/YYYY"
                  value={row.date || null}
                  onChange={(v) => {
                    const next = [...draft.rows];
                    next[i] = { ...next[i], date: v ?? '' };
                    updateRows(next);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 8, md: 4 }}>
                <Select
                  label={t.folders.serviceType}
                  data={serviceTypeOptions}
                  value={row.service_type}
                  onChange={(v) => {
                    const next = [...draft.rows];
                    next[i] = { ...next[i], service_type: (v as FolderCultoServiceType) || 'OUTRO' };
                    updateRows(next);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <TextInput
                  label={t.folders.startTime}
                  placeholder="19:00"
                  inputMode="numeric"
                  maxLength={5}
                  value={row.start_time}
                  onChange={(e) => {
                    const next = [...draft.rows];
                    next[i] = { ...next[i], start_time: sanitizeTime(e.currentTarget.value) };
                    updateRows(next);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
                <TextInput
                  label={t.folders.endTime}
                  placeholder="21:00"
                  inputMode="numeric"
                  maxLength={5}
                  value={row.end_time}
                  onChange={(e) => {
                    const next = [...draft.rows];
                    next[i] = { ...next[i], end_time: sanitizeTime(e.currentTarget.value) };
                    updateRows(next);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4, md: 1 }}>
                <Group justify="flex-end" align="flex-end" h="100%">
                  <IconButtonRemove
                    label={t.folders.remove}
                    onClick={() => updateRows(draft.rows.filter((_, idx) => idx !== i))}
                  />
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
                <TextInput
                  label={t.folders.titleLabel}
                  value={row.title}
                  onChange={(e) => {
                    const next = [...draft.rows];
                    next[i] = { ...next[i], title: e.currentTarget.value };
                    updateRows(next);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
                <TextInput
                  label={t.folders.preacher}
                  value={row.preacher}
                  onChange={(e) => {
                    const next = [...draft.rows];
                    next[i] = { ...next[i], preacher: e.currentTarget.value };
                    updateRows(next);
                  }}
                />
              </Grid.Col>
            </Grid>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

function LayoutStep({
  t,
  draft,
  setDraft,
  overflow,
}: {
  t: any;
  draft: FolderDraft;
  setDraft: React.Dispatch<React.SetStateAction<FolderDraft>>;
  overflow: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const blockLabels: Record<FolderBlockKey, string> = {
    programacao: t.folders.blockProgramacao,
    agenda: t.folders.blockAgenda,
    avisos: t.folders.blockAvisos,
    aniversariantes: t.folders.blockAniversariantes,
    contatos: t.folders.blockContatos,
    dizimos: t.folders.blockDizimos,
    links: t.folders.blockLinks,
    social: t.folders.blockSocial,
    oracao: t.folders.blockOracao,
    ficha_visitante: t.folders.blockFicha,
    cadastro: t.folders.blockCadastro,
    anotacoes: t.folders.blockAnotacoes,
  };

  const blockIcons: Record<FolderBlockKey, React.ReactNode> = {
    programacao: <IconList size={18} />,
    agenda: <IconCalendarEvent size={18} />,
    avisos: <IconBell size={18} />,
    aniversariantes: <IconCake size={18} />,
    contatos: <IconAddressBook size={18} />,
    dizimos: <IconCash size={18} />,
    links: <IconLink size={18} />,
    social: <IconShare size={18} />,
    oracao: <IconHeart size={18} />,
    ficha_visitante: <IconUser size={18} />,
    cadastro: <IconUserPlus size={18} />,
    anotacoes: <IconNotes size={18} />,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = draft.block_order.indexOf(active.id as FolderBlockKey);
    const to = draft.block_order.indexOf(over.id as FolderBlockKey);
    if (from < 0 || to < 0) return;
    setDraft((d) => ({
      ...d,
      block_order: arrayMove(d.block_order, from, to),
    }));
  };

  const toggleBlock = (key: FolderBlockKey, value: boolean) =>
    setDraft((d) => ({ ...d, blocks: { ...d.blocks, [key]: value } }));

  return (
    <Stack gap="md">
      <Text size="sm" fw={600}>{t.folders.stepLayout}</Text>
      <Text size="xs" c="dimmed">{t.folders.layoutHint}</Text>
      {overflow && (
        <Alert color="red" variant="light" icon={<IconBell size={16} />} title={t.folders.layoutOverflowTitle}>
          {t.folders.layoutOverflow}
        </Alert>
      )}
      <Paper withBorder p="xs" radius="md" bg="gray.0">
        <Text size="xs" fw={600}>{t.folders.anchoredInfo}</Text>
      </Paper>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={draft.block_order} strategy={verticalListSortingStrategy}>
          {draft.block_order.map((key) => (
            <SortableBlockRow
              key={key}
              id={key}
              label={blockLabels[key]}
              icon={blockIcons[key]}
              checked={draft.blocks[key]}
              onToggle={(v) => toggleBlock(key, v)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Stack>
  );
}

function FinalizeStep({
  t,
  draft,
  setDraft,
  socialOptions,
  fetchingBirthdays,
  canFetchBirthdays,
  onFetchBirthdays,
}: {
  t: any;
  draft: FolderDraft;
  setDraft: React.Dispatch<React.SetStateAction<FolderDraft>>;
  socialOptions: { type: string; title: string }[];
  fetchingBirthdays: boolean;
  canFetchBirthdays: boolean;
  onFetchBirthdays: () => void;
}) {
  const updateAnuncios = (items: FolderCultoAnuncioItem[]) => setDraft((d) => ({ ...d, anuncios: items }));
  const updateAniver = (items: FolderCultoAniversarianteItem[]) => setDraft((d) => ({ ...d, aniversariantes: items }));
  const updateQr = (key: keyof FolderCultoQr, patch: Partial<FolderCultoQr[keyof FolderCultoQr]>) =>
    setDraft((d) => ({ ...d, qr: { ...d.qr, [key]: { ...d.qr[key], ...patch } } }));
  const updateSocial = (type: string, value: boolean) =>
    setDraft((d) => ({ ...d, social: { ...d.social, [type]: value } }));

  const qrLabels: Record<keyof FolderCultoQr, string> = {
    visita: t.folders.qrVisita,
    oracao: t.folders.qrOracao,
    agenda: t.folders.qrAgenda,
    cadastro: t.folders.qrCadastro,
  };

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" mb={6} wrap="nowrap">
          <Text size="sm" fw={600}>{t.folders.anuncios}</Text>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={() => updateAnuncios([...draft.anuncios, { title: '', text: '', highlight: false }])}
          >
            {t.folders.addAnuncio}
          </Button>
        </Group>
        {draft.anuncios.map((a, i) => (
          <Paper key={i} withBorder p="xs" radius="md" mb="xs">
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <TextInput
                label={t.folders.anuncioTitle}
                flex={1}
                value={a.title}
                onChange={(e) => {
                  const next = [...draft.anuncios];
                  next[i] = { ...next[i], title: e.currentTarget.value };
                  updateAnuncios(next);
                }}
              />
              <Switch
                label={t.folders.highlight}
                checked={Boolean(a.highlight)}
                onChange={(e) => {
                  const next = [...draft.anuncios];
                  next[i] = { ...next[i], highlight: e.currentTarget.checked };
                  updateAnuncios(next);
                }}
                mb={6}
              />
              <IconButtonRemove
                label={t.folders.remove}
                onClick={() => updateAnuncios(draft.anuncios.filter((_, idx) => idx !== i))}
              />
            </Group>
            <TextInput
              label={t.folders.anuncioText}
              mt="xs"
              value={a.text}
              onChange={(e) => {
                const next = [...draft.anuncios];
                next[i] = { ...next[i], text: e.currentTarget.value };
                updateAnuncios(next);
              }}
            />
          </Paper>
        ))}
      </Box>

      <Box>
        <Group justify="space-between" mb={6} wrap="wrap">
          <Text size="sm" fw={600}>{t.folders.aniversariantes}</Text>
          <Group gap={6}>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconCake size={14} />}
              loading={fetchingBirthdays}
              disabled={!canFetchBirthdays}
              onClick={onFetchBirthdays}
              title={canFetchBirthdays ? '' : t.folders.saveRequiredHint}
            >
              {t.folders.fetchBirthdays}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                updateAniver([...draft.aniversariantes, { name: '', day: 1, month: 1, age: null }])
              }
            >
              {t.folders.addAniversariante}
            </Button>
          </Group>
        </Group>
        {draft.aniversariantes.map((b, i) => (
<Group key={i} align="flex-end" gap="xs" mb="xs" wrap="nowrap">
              <TextInput
                label={t.folders.label}
                flex={1}
                value={b.name}
                onChange={(e) => {
                  const next = [...draft.aniversariantes];
                  next[i] = { ...next[i], name: e.currentTarget.value };
                  updateAniver(next);
                }}
              />
              <NumberField
                label={t.folders.birthDay}
                w={70}
                value={String(b.day)}
                max={31}
                onChange={(v) => {
                  const next = [...draft.aniversariantes];
                  next[i] = { ...next[i], day: v };
                  updateAniver(next);
                }}
              />
              <NumberField
                label={t.folders.month}
                w={70}
                value={String(b.month)}
                max={12}
                onChange={(v) => {
                  const next = [...draft.aniversariantes];
                  next[i] = { ...next[i], month: v };
                  updateAniver(next);
                }}
              />
              <NumberField
                label={t.folders.age}
                w={80}
                value={b.age ? String(b.age) : ''}
                max={150}
                onChange={(v) => {
                  const next = [...draft.aniversariantes];
                  next[i] = { ...next[i], age: v || null };
                  updateAniver(next);
                }}
              />
              <IconButtonRemove
                label={t.folders.remove}
                onClick={() => updateAniver(draft.aniversariantes.filter((_, idx) => idx !== i))}
              />
            </Group>
        ))}
      </Box>

      <Box>
        <Text size="sm" fw={600} mb={2}>{t.folders.qrSection}</Text>
        <Text size="xs" c="dimmed" mb={8}>{t.folders.qrHint}</Text>
        <Stack gap="xs">
          {QR_KEYS.map((key) => (
            <Group key={key} align="flex-end" gap="xs" wrap="nowrap">
              <Switch
                label={qrLabels[key]}
                checked={draft.qr[key].enabled}
                onChange={(e) => updateQr(key, { enabled: e.currentTarget.checked })}
                mb={6}
                w={150}
              />
              <TextInput
                label={t.folders.qrUrl}
                flex={1}
                placeholder="https://..."
                value={draft.qr[key].url}
                disabled={!draft.qr[key].enabled}
                onChange={(e) => updateQr(key, { url: e.currentTarget.value })}
              />
            </Group>
          ))}
        </Stack>
      </Box>

      <Box>
        <Group gap={6} mb={2}>
          <IconShare size={16} />
          <Text size="sm" fw={600}>{t.folders.socialSection}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb={8}>{t.folders.socialHint}</Text>
        {socialOptions.length === 0 ? (
          <Text size="xs" c="dimmed">{t.folders.socialEmpty}</Text>
        ) : (
          <Stack gap="xs">
            {socialOptions.map((opt) => (
              <Switch
                key={opt.type}
                label={opt.title || opt.type}
                checked={draft.social[opt.type] !== false}
                onChange={(e) => updateSocial(opt.type, e.currentTarget.checked)}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function NumberField({
  label,
  w,
  value,
  max,
  onChange,
}: {
  label: string;
  w: number;
  value: string;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextInput
      label={label}
      w={w}
      value={value}
      inputMode="numeric"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const onlyDigits = e.currentTarget.value.replace(/\D/g, '').slice(0, 3);
        const num = Number(onlyDigits);
        onChange(onlyDigits === '' ? 0 : Math.min(num, max));
      }}
      placeholder="—"
    />
  );
}

function IconButtonRemove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ActionIcon color="red" variant="subtle" size="lg" mb={2} aria-label={label} onClick={onClick}>
      <IconTrash size={16} />
    </ActionIcon>
  );
}

function formatPeriod(start: string, end: string): string {
  const [sY, sM, sD] = start.split('-').map(Number);
  const [eY, eM, eD] = end.split('-').map(Number);
  if (!sY) return '';
  return `${String(sD).padStart(2, '0')}/${String(sM).padStart(2, '0')}/${sY} — ${String(eD).padStart(2, '0')}/${String(eM).padStart(2, '0')}/${eY}`;
}

function rowToDraft(row: FolderCultoRow): DraftRow {
  return {
    id: row.id,
    service_type: row.service_type,
    date: row.date,
    start_time: row.start_time ? row.start_time.slice(0, 5) : '',
    end_time: row.end_time ? row.end_time.slice(0, 5) : '',
    title: row.title,
    preacher: row.preacher,
  };
}

function rowToPreview(rows: DraftRow[]): FolderCultoRow[] {
  return rows.map(
    (r, i): FolderCultoRow => ({
      id: r.id ?? -i,
      service_type: r.service_type,
      service_type_display: r.title || r.service_type,
      date: r.date,
      start_time: r.start_time || null,
      end_time: r.end_time || null,
      title: r.title,
      preacher: r.preacher,
      sort_order: i,
    })
  );
}
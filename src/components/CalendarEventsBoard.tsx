import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Popover,
  Group,
  Text,
  Button,
  SimpleGrid,
  Badge,
  Stack,
  Box,
  Tooltip,
  Modal,
  TextInput,
  Textarea,
  Select,
  ColorInput,
  SegmentedControl,
  NumberInput,
  MultiSelect,
  ActionIcon,
  Loader,
  Center,
  Divider,
  ScrollArea,
  Code,
  ThemeIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconEdit,
  IconTrash,
  IconLink,
  IconCopy,
  IconRefresh,
  IconQrcode,
  IconClock,
  IconExternalLink,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { maskTime, toSentenceCase, toUpperCamelWords } from '../utils/format';
import {
  addDays,
  dateFromApi,
  dateToApi,
  eventOccursOn,
  isoWeekday,
} from '../utils/calendarRecurrence';
import ShareLinkModal from './ShareLinkModal';
import {
  CalendarEvent,
  CalendarEventAudience,
  CalendarEventCategory,
  CalendarPublicLink,
  Member,
} from '../types';

export interface CalendarEventsGateway {
  list: () => Promise<CalendarEvent[]>;
  create: (payload: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  update: (id: number, payload: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  delete: (id: number) => Promise<void>;
  listMembers?: () => Promise<Member[]>;
  canManageGeneral: boolean;
  canManageFinance: boolean;
  publicLink?: () => Promise<CalendarPublicLink>;
  regeneratePublicLink?: () => Promise<CalendarPublicLink>;
}

const CATEGORY_COLORS: Record<CalendarEventCategory, string> = {
  bill: 'blue',
  deadline: 'grape',
  meeting: 'green',
  event: 'violet',
  culto: 'orange',
  ensaio: 'cyan',
};

const CATEGORY_HEX: Record<CalendarEventCategory, string> = {
  bill: '#228be6',
  deadline: '#9c36b5',
  meeting: '#40c057',
  event: '#7048e8',
  culto: '#fd7e14',
  ensaio: '#15aabf',
};

const COLOR_SWATCHES = [
  ...Object.values(CATEGORY_HEX),
  '#fa5252',
  '#f767bf',
  '#12b886',
  '#ffd43b',
  '#5c7cfa',
  '#868e96',
];

function isHexColor(color: string): boolean {
  return /^#[\da-fA-F]{6}/.test(color);
}

const eventColor = (ev: CalendarEvent): string =>
  ev.color || (CATEGORY_COLORS[ev.category] ?? 'gray');

function eventCellColors(color: string): { background: string; border: string } {
  if (isHexColor(color)) {
    return {
      background: `${color}18`,
      border: `1px solid ${color}4d`,
    };
  }
  return {
    background: `var(--mantine-color-${color}-0)`,
    border: `1px solid var(--mantine-color-${color}-3)`,
  };
}

const CATEGORY_ORDER: CalendarEventCategory[] = [
  'bill',
  'deadline',
  'meeting',
  'event',
  'culto',
  'ensaio',
];

// Grupos de filtro rápido exibidos como badges clicáveis na barra superior.
// `event` não aparece em nenhum dos grupos pedidos no design, então ganha grupo
// próprio — sem ele nenhuma categoria ficaria inalcançável pelo filtro.
const CATEGORY_FILTER_GROUPS: {
  key: string;
  color: string;
  categories: CalendarEventCategory[];
  financeOnly?: boolean;
}[] = [
  { key: 'cultos', color: 'orange', categories: ['culto'] },
  { key: 'ministries', color: 'teal', categories: ['ensaio'] },
  { key: 'leadership', color: 'blue', categories: ['meeting'] },
  { key: 'events', color: 'violet', categories: ['event'] },
  { key: 'finance', color: 'gray', categories: ['bill', 'deadline'], financeOnly: true },
];

const MAX_BADGES_PER_CELL = 2;

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ISO_WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type CalendarView = 'month' | 'week' | 'day';
type RecurrenceMode = 'oneoff' | 'monthly' | 'weekly';

function timeToApi(raw: string): string | null {
  const time = raw.trim();
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
}

function formatShortDate(t: Record<string, any>, d: Date): string {
  return `${d.getDate()} ${(t.months[d.getMonth()] || '').slice(0, 3)}`;
}

interface BoardItem {
  id: number;
  key: string;
  title: string;
  color: string;
  badge: string;
  time: string | null;
  endTime: string | null;
  ev: CalendarEvent;
}

export default function CalendarEventsBoard({
  gateway,
  locale,
  readOnly = false,
  showBirthdays = true,
  onToggleBirthdays,
  belowGrid,
}: {
  gateway: CalendarEventsGateway;
  locale?: string;
  readOnly?: boolean;
  showBirthdays?: boolean;
  onToggleBirthdays?: (next: boolean) => void;
  belowGrid?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [membersOptions, setMembersOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [publicLink, setPublicLink] = useState<CalendarPublicLink | null>(null);
  const [origin, setOrigin] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<CalendarEventCategory[]>(
    []
  );
  const [overflowDay, setOverflowDay] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = t.months[month];
  const categoryLabel = (c: CalendarEventCategory) => t.calendarEvents.categories[c] || c;

  const weekStart = new Date(cursor);
  weekStart.setDate(cursor.getDate() - cursor.getDay());
  const weekEnd = addDays(weekStart, 6);

  const canCreateAny = !readOnly && (gateway.canManageGeneral || gateway.canManageFinance);
  const canChooseAudience = !readOnly && gateway.canManageGeneral && gateway.canManageFinance;
  const canEditEvent = (ev: CalendarEvent) =>
    !readOnly &&
    (ev.audience === 'FINANCE'
      ? gateway.canManageFinance
      : gateway.canManageGeneral);

  const prev = () =>
    setCursor((v) =>
      view === 'month'
        ? new Date(v.getFullYear(), v.getMonth() - 1, 1)
        : view === 'week'
          ? addDays(v, -7)
          : addDays(v, -1)
    );
  const next = () =>
    setCursor((v) =>
      view === 'month'
        ? new Date(v.getFullYear(), v.getMonth() + 1, 1)
        : view === 'week'
          ? addDays(v, 7)
          : addDays(v, 1)
    );

  const load = () => {
    setLoading(true);
    gateway
      .list()
      .catch(() => [] as CalendarEvent[])
      .then((list) => setEvents(list))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!gateway.publicLink || readOnly) return;
    gateway
      .publicLink()
      .then((link) => setPublicLink(link))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const isCategoryVisible = useCallback(
    (category: CalendarEventCategory) => !hiddenCategories.includes(category),
    [hiddenCategories]
  );

  const toggleCategory = (categories: CalendarEventCategory[]) => {
    setHiddenCategories((prev) => {
      const allHidden = categories.every((c) => prev.includes(c));
      const next = new Set(prev);
      categories.forEach((c) => (allHidden ? next.delete(c) : next.add(c)));
      return Array.from(next);
    });
  };

  const itemsForDate = useMemo(
    () => (d: Date): BoardItem[] => {
      const out: BoardItem[] = [];
      for (const ev of events) {
        if (!isCategoryVisible(ev.category)) continue;
        const hit = eventOccursOn(ev, d);
        if (hit) {
          out.push({
            id: ev.id,
            key: `f-${ev.id}`,
            title: ev.title,
            color: eventColor(ev),
            badge: `${categoryLabel(ev.category)} • ${ev.title}`,
            time: ev.start_time,
            endTime: ev.end_time,
            ev,
          });
        }
      }
      return out.sort(
        (a, b) => (a.time ?? '99:00').localeCompare(b.time ?? '99:00')
      );
    },
    [events, categoryLabel, isCategoryVisible]
  );

  const form = useForm<{
    title: string;
    category: CalendarEventCategory;
    audience: CalendarEventAudience;
    color: string;
    recurrence: RecurrenceMode;
    monthlyType: 'day' | 'nth';
    day: number | null;
    monthly_weekday: number | null;
    monthly_ordinal: number | null;
    date: Date | null;
    weekdays: string[];
    repeat_interval: number;
    anchor: Date | null;
    repeat_end_date: Date | null;
    start_time: string;
    end_time: string;
    description: string;
    members: string[];
  }>({
    initialValues: {
      title: '',
      category: 'event',
      audience: 'GENERAL',
      color: '',
      recurrence: 'oneoff',
      monthlyType: 'day',
      day: null,
      monthly_weekday: null,
      monthly_ordinal: null,
      date: new Date(),
      weekdays: [],
      repeat_interval: 1,
      anchor: null,
      repeat_end_date: null,
      start_time: '',
      end_time: '',
      description: '',
      members: [],
    },
    validate: {
      title: (v) => (v.trim().length ? null : t.calendarEvents.title),
      weekdays: (v, values) =>
        values.recurrence === 'weekly' && v.length === 0
          ? t.calendarEvents.weekdays
          : null,
      anchor: (v, values) =>
        values.recurrence === 'weekly' && values.repeat_interval === 2 && !v
          ? t.calendarEvents.startDate
          : null,
      start_time: (v) =>
        v.trim() && !/^\d{2}:\d{2}$/.test(v.trim())
          ? t.calendarEvents.timePlaceholder
          : null,
      end_time: (v) =>
        v.trim() && !/^\d{2}:\d{2}$/.test(v.trim())
          ? t.calendarEvents.timePlaceholder
          : null,
    },
  });

  const ensureMembers = () => {
    if (membersOptions.length || !gateway.listMembers) return;
    gateway
      .listMembers()
      .then((list) =>
        setMembersOptions(list.map((m) => ({ value: String(m.id), label: m.name })))
      )
      .catch(() => undefined);
  };

  const openNew = () => {
    setEditing(null);
    form.setValues({
      title: '',
      category: 'event',
      audience: gateway.canManageGeneral ? 'GENERAL' : 'FINANCE',
      color: CATEGORY_HEX['event'],
      recurrence: 'oneoff',
      day: null,
      date: new Date(year, month, 1),
      weekdays: [],
      repeat_interval: 1,
      anchor: null,
      repeat_end_date: null,
      start_time: '',
      end_time: '',
      description: '',
      members: [],
    });
    form.resetDirty();
    ensureMembers();
    setModalOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev);
    const recurrence: RecurrenceMode = ev.repeat_weekly
      ? 'weekly'
      : ev.repeat_monthly
        ? 'monthly'
        : 'oneoff';
    form.setValues({
      title: ev.title,
      category: ev.category,
      audience: ev.audience,
      color: ev.color || '',
      recurrence,
      day: ev.repeat_monthly ? ev.day : null,
      date: ev.date ? dateFromApi(ev.date) : new Date(year, month, ev.day ?? 1),
      weekdays: (ev.weekdays || []).map(String),
      repeat_interval: ev.repeat_interval || 1,
      anchor: ev.date ? dateFromApi(ev.date) : null,
      repeat_end_date: ev.repeat_end_date ? dateFromApi(ev.repeat_end_date) : null,
      start_time: ev.start_time ? ev.start_time.slice(0, 5) : '',
      end_time: ev.end_time ? ev.end_time.slice(0, 5) : '',
      description: ev.description,
      members: ev.members.map(String),
    });
    form.resetDirty();
    ensureMembers();
    setModalOpen(true);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    setSaving(true);
    const payload: Partial<CalendarEvent> = {
      title: toUpperCamelWords(values.title),
      category: values.category,
      audience: values.audience,
      color: values.color.trim(),
      description: toSentenceCase(values.description),
      start_time: timeToApi(values.start_time),
      end_time: timeToApi(values.end_time) || undefined,
      members: values.members.map(Number),
    };
    if (values.recurrence === 'weekly') {
      payload.repeat_weekly = true;
      payload.repeat_monthly = false;
      payload.weekdays = values.weekdays.map(Number);
      payload.repeat_interval = values.repeat_interval;
      payload.repeat_end_date = values.repeat_end_date
        ? dateToApi(values.repeat_end_date)
        : null;
      payload.day = null;
      payload.date = values.anchor ? dateToApi(values.anchor) : null;
    } else if (values.recurrence === 'monthly') {
      payload.repeat_monthly = true;
      payload.repeat_weekly = false;
      payload.weekdays = [];
      payload.repeat_interval = 1;
      payload.repeat_end_date = null;
      payload.date = null;
      if (values.monthlyType === 'nth') {
        payload.repeat_monthly_weekday = values.monthly_weekday;
        payload.repeat_monthly_ordinal = values.monthly_ordinal;
        payload.day = null;
      } else {
        payload.repeat_monthly_weekday = null;
        payload.repeat_monthly_ordinal = null;
        payload.day = values.day ?? today.getDate();
      }
    } else {
      payload.repeat_monthly = false;
      payload.repeat_weekly = false;
      payload.weekdays = [];
      payload.repeat_interval = 1;
      payload.repeat_end_date = null;
      payload.day = null;
      payload.date = values.date ? dateToApi(values.date) : null;
    }
    try {
      if (editing) {
        await gateway.update(editing.id, payload);
      } else {
        await gateway.create(payload);
      }
      notifications.show({ color: 'green', message: t.common.save });
      setModalOpen(false);
      load();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || 'Não foi possível salvar o evento.',
      });
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await gateway.delete(deleting.id);
      notifications.show({ color: 'green', message: t.common.delete });
      setDeleting(null);
      setDetail(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir o evento.' });
    }
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const weekdayLabel = (ev: CalendarEvent) =>
    (ev.weekdays || []).map((d) => ISO_WEEKDAYS[d] ?? d).join(', ');

  const nthLabel = (ord: number) =>
    ord === -1 ? 'last' : `${ord}${'º'}`;

  const formatDateLine = (ev: CalendarEvent) => {
    const parts: string[] = [];
    if (ev.repeat_weekly) {
      const mode =
        ev.repeat_interval > 1
          ? t.calendarEvents.recurringBiweek
          : t.calendarEvents.recurringWeek;
      parts.push(mode.replace('{days}', weekdayLabel(ev)));
      if (ev.date && !readOnly) parts.push(`${t.calendarEvents.from} ${ev.date}`);
    } else if (ev.repeat_monthly) {
      if (ev.repeat_monthly_weekday != null && ev.repeat_monthly_ordinal != null) {
        parts.push(
          t.calendarEvents.recurringNth
            .replace('{ordinal}', nthLabel(ev.repeat_monthly_ordinal))
            .replace('{weekday}', ISO_WEEKDAYS[ev.repeat_monthly_weekday] ?? String(ev.repeat_monthly_weekday))
        );
      } else {
        parts.push(t.calendarEvents.recurringDay.replace('{day}', String(ev.day)));
      }
    } else if (ev.date) {
      parts.push(ev.date);
    }
    if (ev.start_time) {
      parts.push(
        ev.end_time
          ? `${ev.start_time.slice(0, 5)} – ${ev.end_time.slice(0, 5)}`
          : ev.start_time.slice(0, 5)
      );
    }
    if (ev.audience === 'GENERAL' && ev.members_names.length) {
      parts.push(ev.members_names.map((m) => m.name).join(', '));
    }
    return parts.join(' • ');
  };

  const renderEventBadges = (items: BoardItem[]) => {
    return (
      <>
        {items.slice(0, MAX_BADGES_PER_CELL).map((b) => (
          <Badge
            key={b.key}
            size="xs"
            color={b.color}
            variant="light"
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'pointer',
            }}
            onClick={() => setDetail(b.ev)}
          >
            {b.time ? `${b.time.slice(0, 5)} ${b.title}` : b.title}
          </Badge>
        ))}
      </>
    );
  };

  const renderOverflowPopover = (day: number, items: BoardItem[]) => {
    if (items.length <= MAX_BADGES_PER_CELL) return null;
    const key = `${year}-${month}-${day}`;
    const hidden = items.slice(MAX_BADGES_PER_CELL);
    return (
      <Popover
        key={key}
        opened={overflowDay === key}
        onChange={(next) => setOverflowDay(next ? key : null)}
        width={280}
        shadow="md"
        withinPortal
      >
        <Popover.Target>
          <Badge
            size="xs"
            variant="default"
            color="gray"
            radius="xl"
            style={{ cursor: 'pointer', alignSelf: 'center' }}
            data-testid={`calendar-overflow-${day}`}
          >
            +{hidden.length}
          </Badge>
        </Popover.Target>
        <Popover.Dropdown onClick={() => setOverflowDay(null)}>
          <Text size="xs" fw={700} c="dimmed" mb={4}>
            {`${day}/${month + 1} — ${t.calendarEvents.allEvents}`}
          </Text>
          <Stack gap={6}>
            {items.map((b) => (
              <Group key={b.key} gap={6} wrap="nowrap" style={{ cursor: 'pointer' }}>
                <Badge size="xs" color={b.color} variant="filled" style={{ flexShrink: 0 }}>
                  {b.time ? b.time.slice(0, 5) : '—'}
                </Badge>
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={500} truncate>
                    {b.title}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {categoryLabel(b.ev.category)}
                  </Text>
                </Stack>
              </Group>
            ))}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  };

  const renderWeekDayColumn = (d: Date) => {
    const items = itemsForDate(d);
    const untimed = items.filter((i) => !i.time);
    const timed = items.filter((i) => i.time);
    return (
      <Stack key={d.toDateString()} gap={2} style={{ minHeight: 120 }}>
        {items.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="md">
            {t.calendarEvents.noEventsDay}
          </Text>
        ) : (
          <>
            {untimed.map((b) => (
              <Badge
                key={b.key}
                size="xs"
                color={b.color}
                variant="light"
                style={{ cursor: 'pointer' }}
                onClick={() => setDetail(b.ev)}
              >
                {b.title}
              </Badge>
            ))}
            {timed.map((b) => (
              <Badge
                key={b.key}
                size="xs"
                color={b.color}
                variant="light"
                style={{ cursor: 'pointer' }}
                onClick={() => setDetail(b.ev)}
              >
                {b.time ? `${b.time.slice(0, 5)} ${b.title}` : b.title}
              </Badge>
            ))}
          </>
        )}
      </Stack>
    );
  };

  const renderDayTimeline = (items: BoardItem[]) => {
    const untimed = items.filter((i) => !i.time);
    const timed = items.filter((i) => i.time);
    const hours: number[] = [];
    if (timed.length) {
      for (const b of timed) {
        const startH = Number((b.time || '0').slice(0, 2));
        const end = b.endTime ? Number(b.endTime.slice(0, 2)) : startH + 1;
        for (let h = startH; h < Math.min(end, 24); h += 1) {
          if (!hours.includes(h)) hours.push(h);
        }
      }
    }
    hours.sort((a, b) => a - b);
    const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

    return (
      <Stack gap="xs">
        {untimed.length > 0 && (
          <Box>
            <Text size="xs" fw={700} c="dimmed" mb={4}>
              {t.calendarEvents.noTime}
            </Text>
            <Stack gap={4}>
              {untimed.map((b) => (
                <Badge
                  key={b.key}
                  size="sm"
                  color={b.color}
                  variant="light"
                  style={{ cursor: 'pointer', alignSelf: 'flex-start' }}
                  onClick={() => setDetail(b.ev)}
                >
                  {b.title}
                </Badge>
              ))}
            </Stack>
          </Box>
        )}
        {hours.length === 0 && untimed.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            {t.calendarEvents.noEventsDay}
          </Text>
        ) : (
          hours.map((h) => {
            const atHour = timed.filter((b) => Number((b.time || '0').slice(0, 2)) === h);
            return (
              <Group key={h} gap="md" wrap="nowrap" align="stretch">
                <Text size="xs" c="dimmed" w={48} ta="right" pt={6}>
                  {hourLabel(h)}
                </Text>
                <Stack gap={4} style={{ flex: 1 }}>
                  {atHour.length === 0 ? (
                    <Divider color="gray.2" />
                  ) : (
                    atHour.map((b) => {
                      const endH = b.endTime
                        ? Number(b.endTime.slice(0, 2))
                        : h + 1;
                      const duration = Math.max(endH - h, 1);
                      const span = b.endTime
                        ? `${b.time?.slice(0, 5)} – ${b.endTime.slice(0, 5)}`
                        : b.time?.slice(0, 5);
                      return (
                        <Box
                          key={b.key}
                          style={{
                            ...eventCellColors(b.color),
                            borderRadius: 4,
                            padding: '6px 8px',
                            minHeight: duration * 28,
                            cursor: 'pointer',
                          }}
                          onClick={() => setDetail(b.ev)}
                        >
                          <Group gap={6} wrap="nowrap">
                            <Badge size="xs" color={b.color} variant="light">
                              <Group gap={4} wrap="nowrap">
                                <IconClock size={11} />
                                <span>{span}</span>
                              </Group>
                            </Badge>
                            <Text size="sm" fw={600} truncate>
                              {b.title}
                            </Text>
                          </Group>
                        </Box>
                      );
                    })
                  )}
                </Stack>
              </Group>
            );
          })
        )}
      </Stack>
    );
  };

  const viewLabel =
    view === 'month'
      ? `${monthLabel} ${year}`
      : view === 'week'
        ? `${formatShortDate(t, weekStart)} – ${formatShortDate(t, weekEnd)} ${weekEnd.getFullYear()}`
        : `${formatShortDate(t, cursor)} ${year}`;

  const onOpenDetail = (ev: CalendarEvent) => setDetail(ev);

  const visibleEvents = useMemo(
    () => events.filter((ev) => isCategoryVisible(ev.category)),
    [events, isCategoryVisible]
  );

  const canSharePublic = !readOnly && !!gateway.publicLink && gateway.canManageGeneral;

  const filterGroups = CATEGORY_FILTER_GROUPS.filter(
    (g) => !g.financeOnly || gateway.canManageFinance
  );

  const renderFilterBar = () => (
    <Group gap={6} wrap="wrap" data-testid="calendar-category-filters">
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mr={4}>
        {t.calendarEvents.filtersTitle}
      </Text>
      {filterGroups.map((group) => {
        const visible = group.categories.every(isCategoryVisible);
        return (
          <Badge
            key={group.key}
            size="lg"
            radius="xl"
            color={group.color}
            variant={visible ? 'filled' : 'light'}
            style={{ cursor: 'pointer' }}
            onClick={() => toggleCategory(group.categories)}
            data-testid={`calendar-filter-${group.key}`}
          >
            {group.key === 'cultos'
              ? t.calendarEvents.filterCultos
              : group.key === 'ministries'
                ? t.calendarEvents.filterMinistries
                : group.key === 'leadership'
                  ? t.calendarEvents.filterLeadership
                  : group.key === 'events'
                    ? t.calendarEvents.filterEvents
                    : t.calendarEvents.filterFinance}
          </Badge>
        );
      })}
      {onToggleBirthdays ? (
        <Badge
          size="lg"
          radius="xl"
          color="pink"
          variant={showBirthdays ? 'filled' : 'light'}
          style={{ cursor: 'pointer' }}
          onClick={() => onToggleBirthdays(!showBirthdays)}
          data-testid="calendar-filter-birthdays"
        >
          {t.calendarEvents.filterBirthdays}
        </Badge>
      ) : null}
    </Group>
  );

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group wrap="wrap">
          <Group gap="xs">
            <Button variant="default" data-testid="calendar-prev-month" leftSection={<IconChevronLeft size={16} />} onClick={prev} />
            <Text fw={700} w={200} ta="center">
              {viewLabel}
            </Text>
            <Button variant="default" data-testid="calendar-next-month" rightSection={<IconChevronRight size={16} />} onClick={next} />
          </Group>
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as CalendarView)}
            data={[
              { value: 'month', label: t.calendarEvents.viewMonth },
              { value: 'week', label: t.calendarEvents.viewWeek },
              { value: 'day', label: t.calendarEvents.viewDay },
            ]}
          />
        </Group>
        {canSharePublic ? (
          <Group gap="xs">
            <Button
              variant="light"
              color="grape"
              data-testid="public-calendar-share"
              leftSection={<IconLink size={16} />}
              onClick={() => setQrOpen(true)}
            >
              {t.calendarEvents.sharePublic}
            </Button>
            {canCreateAny && (
              <Button data-testid="calendar-new" leftSection={<IconPlus size={16} />} onClick={openNew}>
                {t.calendarEvents.new}
              </Button>
            )}
          </Group>
        ) : canCreateAny ? (
          <Button data-testid="calendar-new" leftSection={<IconPlus size={16} />} onClick={openNew}>
            {t.calendarEvents.new}
          </Button>
        ) : null}
      </Group>

      {filterGroups.length > 0 || onToggleBirthdays ? (
        <Box mb="md">{renderFilterBar()}</Box>
      ) : null}

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : view === 'month' ? (
          <SimpleGrid cols={7} spacing={4}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} size="xs" fw={700} c="dimmed" ta="center" tt="uppercase">
                {d}
              </Text>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <Box key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const items = itemsForDate(new Date(year, month, day));
              const todayCell = isToday(day);
              return (
                <Tooltip
                  key={day}
                  label={
                    items.length
                      ? items.map((b) => b.badge).join('\n')
                      : t.calendarEvents.noEventsDay
                  }
                  withArrow
                  disabled={!items.length || items.length > MAX_BADGES_PER_CELL}
                  multiline
                >
                  <Paper
                    withBorder
                    p={4}
                    style={{
                      minHeight: 70,
                      background: todayCell
                        ? 'var(--mantine-color-blue-1)'
                        : undefined,
                      borderColor: todayCell
                        ? 'var(--mantine-color-blue-6)'
                        : undefined,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap" gap={2}>
                      <Text size="sm" fw={todayCell ? 800 : 600} ta="center">
                        {day}
                      </Text>
                      {renderOverflowPopover(day, items)}
                    </Group>
                    <Stack gap={2} px={2}>
                      {renderEventBadges(items)}
                    </Stack>
                  </Paper>
                </Tooltip>
              );
            })}
          </SimpleGrid>
        ) : view === 'week' ? (
          <SimpleGrid cols={7} spacing={8}>
            {WEEKDAYS.map((d, i) => {
              const date = addDays(weekStart, i);
              return (
                <Box key={i}>
                  <Text size="xs" fw={700} c="dimmed" ta="center" tt="uppercase" mb={4}>
                    {d} {date.getDate()}
                  </Text>
                  {renderWeekDayColumn(date)}
                </Box>
              );
            })}
          </SimpleGrid>
        ) : (
          renderDayTimeline(itemsForDate(cursor))
        )}
      </Paper>

      {belowGrid ? <Box mt="md">{belowGrid}</Box> : null}


      <Paper withBorder radius="md" p="md" mt="md">
        <Group justify="space-between" mb="xs" gap="xs" wrap="wrap">
          <Text size="sm" fw={700}>
            {t.calendarEvents.allEvents}
          </Text>
          <Text size="xs" c="dimmed">
            {t.calendarEvents.visibleCount
              .replace('{shown}', String(visibleEvents.length))
              .replace('{total}', String(events.length))}
          </Text>
        </Group>
        {visibleEvents.length === 0 ? (
          <Text size="sm" c="dimmed">
            {readOnly ? t.publicCalendar.empty : t.calendarEvents.noEvents}
          </Text>
        ) : (
          <ScrollArea.Autosize mah={400} scrollbars="y">
            <Stack gap={6}>
              {visibleEvents.map((ev) => (
                <Group key={ev.id} gap="sm" justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, cursor: 'pointer' }} onClick={() => onOpenDetail(ev)}>
                    <Group gap="sm" wrap="nowrap">
                      <Badge size="sm" variant="light" color={eventColor(ev)}>
                        {categoryLabel(ev.category)}
                      </Badge>
                      <Text size="sm" fw={500} truncate>
                        {ev.title}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" ml={70}>
                      {formatDateLine(ev)}
                    </Text>
                    {ev.description && (
                      <Text size="xs" c="dimmed" ml={70} lineClamp={2}>
                        {ev.description}
                      </Text>
                    )}
                  </Box>
                  {canEditEvent(ev) && (
                    <Group gap={4} wrap="nowrap">
                      <Tooltip label={t.calendarEvents.edit}>
                        <ActionIcon size="sm" variant="subtle" onClick={() => openEdit(ev)}>
                          <IconEdit size={15} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t.calendarEvents.deleteTitle}>
                        <ActionIcon size="sm" color="red" variant="subtle" onClick={() => setDeleting(ev)}>
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t.calendarEvents.edit : t.calendarEvents.new}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              data-testid="event-title"
              label={t.calendarEvents.title}
              required
              {...form.getInputProps('title')}
            />
            {canChooseAudience && (
              <Select
                data-testid="event-audience"
                label={t.calendarEvents.audience}
                data={[
                  { value: 'GENERAL', label: t.calendarEvents.audienceGeneral },
                  { value: 'FINANCE', label: t.calendarEvents.audienceFinance },
                ]}
                {...form.getInputProps('audience')}
              />
            )}
            <Select
              data-testid="event-category"
              label={t.calendarEvents.category}
              data={CATEGORY_ORDER.map((c) => ({ value: c, label: categoryLabel(c) }))}
              {...form.getInputProps('category')}
            />
            <ColorInput
              data-testid="event-color"
              label={t.calendarEvents.color}
              placeholder={t.calendarEvents.colorPlaceholder}
              swatches={COLOR_SWATCHES}
              {...form.getInputProps('color')}
            />
            <Select
              data-testid="event-recurrence"
              label={t.calendarEvents.recurrence}
              data={[
                { value: 'oneoff', label: t.calendarEvents.recurrenceNone },
                { value: 'monthly', label: t.calendarEvents.recurrenceMonthly },
                { value: 'weekly', label: t.calendarEvents.recurrenceWeekly },
              ]}
              {...form.getInputProps('recurrence')}
            />
            {form.values.recurrence === 'monthly' && (
              <>
                <SegmentedControl
                  data-testid="event-monthly-type"
                  fullWidth
                  data={[
                    { value: 'day', label: t.calendarEvents.dayOfMonth },
                    { value: 'nth', label: t.calendarEvents.recurringNth },
                  ]}
                  value={form.values.monthlyType}
                  onChange={(v) => form.setFieldValue('monthlyType', v as 'day' | 'nth')}
                />
                {form.values.monthlyType === 'nth' ? (
                  <Group grow>
                    <Select
                      data-testid="event-monthly-weekday"
                      label={t.calendarEvents.weekdays}
                      data={ISO_WEEKDAYS.map((l, i) => ({ value: String(i), label: l }))}
                      value={
                        form.values.monthly_weekday != null ? String(form.values.monthly_weekday) : null
                      }
                      onChange={(v) =>
                        form.setFieldValue('monthly_weekday', v != null ? Number(v) : null)
                      }
                    />
                    <Select
                      data-testid="event-monthly-ordinal"
                      label={t.calendarEvents.monthlyOrdinal}
                      data={[
                        { value: '1', label: '1ª' },
                        { value: '2', label: '2ª' },
                        { value: '3', label: '3ª' },
                        { value: '4', label: '4ª' },
                        { value: '5', label: '5ª' },
                        { value: '-1', label: t.calendarEvents.ordinalLast },
                      ]}
                      value={
                        form.values.monthly_ordinal != null ? String(form.values.monthly_ordinal) : null
                      }
                      onChange={(v) =>
                        form.setFieldValue('monthly_ordinal', v != null ? Number(v) : null)
                      }
                    />
                  </Group>
                ) : (
                  <NumberInput
                    data-testid="event-day"
                    label={t.calendarEvents.dayOfMonth}
                  min={1}
                  max={31}
                  value={form.values.day ?? 1}
                  onChange={(v) => form.setFieldValue('day', typeof v === 'number' ? v : Number(v) || null)}
                />
              )}
              </>
            )}
            {form.values.recurrence === 'weekly' && (
              <>
                <MultiSelect
                  data-testid="event-weekdays"
                  label={t.calendarEvents.weekdays}
                  data={ISO_WEEKDAYS.map((l, i) => ({ value: String(i), label: l }))}
                  value={form.values.weekdays}
                  onChange={(v) => form.setFieldValue('weekdays', v)}
                />
                <Select
                  data-testid="event-interval"
                  label={t.calendarEvents.weeklyFrequency}
                  data={[
                    { value: '1', label: t.calendarEvents.weeklyEveryWeek },
                    { value: '2', label: t.calendarEvents.weeklyBiweekly },
                  ]}
                  value={String(form.values.repeat_interval)}
                  onChange={(v) =>
                    form.setFieldValue('repeat_interval', v === '2' ? 2 : 1)
                  }
                />
                <DateInput
                  data-testid="event-anchor"
                  label={t.calendarEvents.startDate}
                  value={form.values.anchor}
                  onChange={(v) =>
                    form.setFieldValue('anchor', v ? (typeof v === 'string' ? dateFromApi(v) : v) : null)
                  }
                  locale={locale}
                />
                <DateInput
                  data-testid="event-repeat-end"
                  label={t.calendarEvents.repeatUntil}
                  clearable
                  value={form.values.repeat_end_date}
                  onChange={(v) =>
                    form.setFieldValue(
                      'repeat_end_date',
                      v ? (typeof v === 'string' ? dateFromApi(v) : v) : null
                    )
                  }
                  locale={locale}
                />
              </>
            )}
            {form.values.recurrence !== 'weekly' && (
              <DateInput
                data-testid="event-date"
                label={t.calendarEvents.date}
                required
                value={form.values.date}
                onChange={(v) =>
                  form.setFieldValue('date', v ? (typeof v === 'string' ? dateFromApi(v) : v) : null)
                }
                locale={locale}
              />
            )}
            <TextInput
              data-testid="event-time"
              label={t.calendarEvents.time}
              placeholder={t.calendarEvents.timePlaceholder}
              maxLength={5}
              value={maskTime(form.values.start_time)}
              onChange={(e) => form.setFieldValue('start_time', maskTime(e.currentTarget.value))}
              error={form.errors.start_time}
            />
            {form.values.recurrence === 'weekly' && (
              <TextInput
                data-testid="event-end-time"
                label={t.calendarEvents.endTime}
                placeholder={t.calendarEvents.timePlaceholder}
                maxLength={5}
                value={maskTime(form.values.end_time)}
                onChange={(e) => form.setFieldValue('end_time', maskTime(e.currentTarget.value))}
                error={form.errors.end_time}
              />
            )}
            <Textarea
              data-testid="event-description"
              label={t.calendarEvents.description}
              autosize
              minRows={2}
              {...form.getInputProps('description')}
            />
            <MultiSelect
              data-testid="event-members"
              label={t.calendarEvents.members}
              placeholder={t.calendarEvents.membersPlaceholder}
              data={membersOptions}
              value={form.values.members}
              onChange={(v) => form.setFieldValue('members', v)}
              searchable
              clearable
            />
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button data-testid="event-save" type="submit" loading={saving}>
                {t.common.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title}
        centered
      >
        {detail && (
          <Stack gap="md">
            <Group gap="xs" wrap="wrap">
              <Badge size="sm" variant="light" color={eventColor(detail)}>
                {categoryLabel(detail.category)}
              </Badge>
              <Badge size="sm" variant="default">
                {detail.audience === 'FINANCE'
                  ? t.calendarEvents.audienceFinance
                  : t.calendarEvents.audienceGeneral}
              </Badge>
            </Group>
            <Text size="sm">
              {formatDateLine(detail)}
            </Text>
            {detail.description && (
              <Text size="sm" c="dimmed">
                {detail.description}
              </Text>
            )}
            {detail.audience === 'GENERAL' && detail.members_names.length > 0 && (
              <Stack gap={4}>
                <Text size="xs" fw={700} c="dimmed">
                  {t.calendarEvents.members}
                </Text>
                <Group gap={4}>
                  {detail.members_names.map((m) => (
                    <Badge key={m.id} size="xs" variant="light" color="gray">
                      {m.name}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}
            {detail.created_by_name && (
              <Text size="xs" c="dimmed">
                {t.calendarEvents.createdBy.replace('{user}', detail.created_by_name)}
              </Text>
            )}
            {canEditEvent(detail) && (
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => {
                    const ev = detail;
                    setDetail(null);
                    openEdit(ev);
                  }}
                >
                  {t.common.edit}
                </Button>
                <Button
                  color="red"
                  variant="subtle"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => {
                    setDeleting(detail);
                    setDetail(null);
                  }}
                >
                  {t.common.delete}
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>

      <Modal
        opened={!!deleting}
        onClose={() => setDeleting(null)}
        title={t.calendarEvents.deleteTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {t.calendarEvents.deleteBody.replace('{title}', deleting?.title ?? '')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </Button>
            <Button color="red" onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ShareLinkModal
        opened={qrOpen}
        onClose={() => setQrOpen(false)}
        title={t.qrShare.calendarTitle}
        subtitle={t.qrShare.subtitle}
        getUrl={() => Promise.resolve(`${origin}${publicLink?.url ?? ''}`)}
        regenerate={
          gateway.regeneratePublicLink && gateway.canManageGeneral
            ? () =>
                gateway.regeneratePublicLink!().then((link) => {
                  setPublicLink(link);
                  return `${origin}${link.url}`;
                })
            : undefined
        }
      />
    </>
  );
}

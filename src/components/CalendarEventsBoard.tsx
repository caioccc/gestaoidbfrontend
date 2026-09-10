import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper,
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
  Switch,
  NumberInput,
  MultiSelect,
  ActionIcon,
  Loader,
  Center,
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
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
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

const CATEGORY_ORDER: CalendarEventCategory[] = [
  'bill',
  'deadline',
  'meeting',
  'event',
  'culto',
  'ensaio',
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Converte "YYYY-MM-DD" em um Date no horário LOCAL (evita deslocamento de fuso).
function dateFromApi(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Formata um Date local como "YYYY-MM-DD" (evita toISOString/UTC).
function dateToApi(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToApi(raw: string): string | null {
  const time = raw.trim();
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
}

export default function CalendarEventsBoard({
  gateway,
  locale,
  readOnly = false,
}: {
  gateway: CalendarEventsGateway;
  locale?: string;
  readOnly?: boolean;
}) {
  const { t } = useLanguage();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [membersOptions, setMembersOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [publicLink, setPublicLink] = useState<CalendarPublicLink | null>(null);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = t.months[month];
  const categoryLabel = (c: CalendarEventCategory) => t.calendarEvents.categories[c] || c;

  const canCreateAny = !readOnly && (gateway.canManageGeneral || gateway.canManageFinance);
  const canChooseAudience = !readOnly && gateway.canManageGeneral && gateway.canManageFinance;
  const canEditEvent = (ev: CalendarEvent) =>
    !readOnly &&
    (ev.audience === 'FINANCE'
      ? gateway.canManageFinance
      : gateway.canManageGeneral);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

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

  interface BoardItem {
    id: number;
    key: string;
    title: string;
    color: string;
    badge: string;
  }

  const itemsForDay = useMemo(
    () => (day: number): BoardItem[] => {
      const out: BoardItem[] = [];
      for (const ev of events) {
        if (ev.repeat_monthly) {
          if (ev.day === day) {
            out.push({
              id: ev.id,
              key: `f-${ev.id}`,
              title: ev.title,
              color: CATEGORY_COLORS[ev.category] ?? 'gray',
              badge: `${categoryLabel(ev.category)} • ${ev.title}`,
            });
          }
        } else if (ev.date) {
          const d = dateFromApi(ev.date);
          if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
            out.push({
              id: ev.id,
              key: `f-${ev.id}`,
              title: ev.title,
              color: CATEGORY_COLORS[ev.category] ?? 'gray',
              badge: `${categoryLabel(ev.category)} • ${ev.title}`,
            });
          }
        }
      }
      return out.sort((a, b) => a.title.localeCompare(b.title));
    },
    [events, year, month, categoryLabel]
  );

  const form = useForm<{
    title: string;
    category: CalendarEventCategory;
    audience: CalendarEventAudience;
    repeat_monthly: boolean;
    day: number | null;
    date: Date | null;
    start_time: string;
    description: string;
    members: string[];
  }>({
    initialValues: {
      title: '',
      category: 'event',
      audience: 'GENERAL',
      repeat_monthly: false,
      day: null,
      date: new Date(),
      start_time: '',
      description: '',
      members: [],
    },
    validate: {
      title: (v) => (v.trim().length ? null : t.calendarEvents.title),
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
      repeat_monthly: false,
      day: null,
      date: new Date(year, month, 1),
      start_time: '',
      description: '',
      members: [],
    });
    form.resetDirty();
    ensureMembers();
    setModalOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev);
    form.setValues({
      title: ev.title,
      category: ev.category,
      audience: ev.audience,
      repeat_monthly: ev.repeat_monthly,
      day: ev.repeat_monthly ? ev.day : null,
      date: ev.date ? dateFromApi(ev.date) : new Date(year, month, ev.day ?? 1),
      start_time: ev.start_time ? ev.start_time.slice(0, 5) : '',
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
      title: values.title.trim(),
      category: values.category,
      audience: values.audience,
      description: values.description.trim(),
      start_time: timeToApi(values.start_time),
      repeat_monthly: values.repeat_monthly,
      members: values.members.map(Number),
    };
    if (values.repeat_monthly) {
      payload.day = values.day ?? today.getDate();
      payload.date = null;
    } else {
      payload.date = values.date ? dateToApi(values.date) : null;
      payload.day = null;
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
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao excluir o evento.' });
    }
  };

  const copyPublicLink = async () => {
    if (!publicLink) return;
    const href = `${origin}${publicLink.url}`;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        color: 'red',
        message: 'Não foi possível copiar o link.',
      });
    }
  };

  const handleRegenerate = async () => {
    if (!gateway.regeneratePublicLink) return;
    setRegenerating(true);
    try {
      const link = await gateway.regeneratePublicLink();
      setPublicLink(link);
      setConfirmRegenerate(false);
      notifications.show({ color: 'green', message: t.common.save });
    } catch {
      notifications.show({
        color: 'red',
        message: 'Não foi possível gerar um novo link.',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const formatDateLine = (ev: CalendarEvent) => {
    const parts: string[] = [];
    if (ev.repeat_monthly) {
      parts.push(t.calendarEvents.recurringDay.replace('{day}', String(ev.day)));
    } else if (ev.date) {
      parts.push(ev.date);
    }
    if (ev.start_time) parts.push(ev.start_time.slice(0, 5));
    if (ev.audience === 'GENERAL' && ev.members_names.length) {
      parts.push(ev.members_names.map((m) => m.name).join(', '));
    }
    return parts.join(' • ');
  };

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group>
          <Button variant="default" data-testid="calendar-prev-month" leftSection={<IconChevronLeft size={16} />} onClick={prevMonth} />
          <Text fw={700} w={180} ta="center">
            {monthLabel} {year}
          </Text>
          <Button variant="default" data-testid="calendar-next-month" rightSection={<IconChevronRight size={16} />} onClick={nextMonth} />
        </Group>
        {canCreateAny && (
          <Button data-testid="calendar-new" leftSection={<IconPlus size={16} />} onClick={openNew}>
            {t.calendarEvents.new}
          </Button>
        )}
      </Group>

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
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
              const items = itemsForDay(day);
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
                  disabled={!items.length}
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
                      {items.length > 2 && (
                        <Text size="xs" c="dimmed">
                          +{items.length - 2}
                        </Text>
                      )}
                    </Group>
                    <Stack gap={2} px={2}>
                      {items.slice(0, 2).map((b) => (
                        <Badge
                          key={b.key}
                          size="xs"
                          color={b.color}
                          variant="light"
                          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {b.title}
                        </Badge>
                      ))}
                    </Stack>
                  </Paper>
                </Tooltip>
              );
            })}
          </SimpleGrid>
        )}
      </Paper>

      {canCreateAny && gateway.publicLink && gateway.canManageGeneral && publicLink && (
        <Paper withBorder radius="md" p="md" mt="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={2}>
              <Group gap="xs">
                <IconLink size={18} />
                <Text size="sm" fw={700}>
                  {t.calendarEvents.publicLink.title}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {t.calendarEvents.publicLink.hint}
              </Text>
              <Text size="sm" data-testid="public-calendar-link">
                {origin}
                {publicLink.url}
              </Text>
            </Stack>
            <Group wrap="nowrap">
              <Button
                size="xs"
                variant="default"
                data-testid="public-calendar-qr"
                leftSection={<IconQrcode size={14} />}
                onClick={() => setQrOpen(true)}
              >
                {t.qrShare.qr}
              </Button>
              <Button
                size="xs"
                variant="light"
                data-testid="public-calendar-copy"
                leftSection={<IconCopy size={14} />}
                onClick={copyPublicLink}
              >
                {copied ? t.calendarEvents.publicLink.copied : t.calendarEvents.publicLink.copy}
              </Button>
              <Button
                size="xs"
                variant="default"
                data-testid="public-calendar-regenerate"
                leftSection={<IconRefresh size={14} />}
                onClick={() => setConfirmRegenerate(true)}
              >
                {t.calendarEvents.publicLink.regenerate}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Paper withBorder radius="md" p="md" mt="md">
        <Text size="sm" fw={700} mb="xs">
          {t.calendarEvents.allEvents}
        </Text>
        {events.length === 0 ? (
          <Text size="sm" c="dimmed">
            {readOnly ? t.publicCalendar.empty : t.calendarEvents.noEvents}
          </Text>
        ) : (
          <Stack gap={6}>
            {events.map((ev) => (
              <Group key={ev.id} gap="sm" justify="space-between" wrap="nowrap">
                <Box>
                  <Group gap="sm" wrap="nowrap">
                    <Badge size="sm" variant="light" color={CATEGORY_COLORS[ev.category] ?? 'gray'}>
                      {categoryLabel(ev.category)}
                    </Badge>
                    <Text size="sm" fw={500}>
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
                    <Tooltip label={t.common.delete}>
                      <ActionIcon size="sm" color="red" variant="subtle" onClick={() => setDeleting(ev)}>
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Group>
            ))}
          </Stack>
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
            <Switch
              data-testid="event-recurring"
              label={t.calendarEvents.recurring}
              checked={form.values.repeat_monthly}
              onChange={(e) => form.setFieldValue('repeat_monthly', e.currentTarget.checked)}
            />
            {form.values.repeat_monthly ? (
              <NumberInput
                data-testid="event-day"
                label={t.calendarEvents.dayOfMonth}
                min={1}
                max={31}
                value={form.values.day ?? 1}
                onChange={(v) => form.setFieldValue('day', typeof v === 'number' ? v : Number(v) || null)}
              />
            ) : (
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
              {...form.getInputProps('start_time')}
            />
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

      <Modal
        opened={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        title={t.calendarEvents.publicLink.regenerate}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.calendarEvents.publicLink.regenerateBody}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmRegenerate(false)}>
              {t.common.cancel}
            </Button>
            <Button color="red" onClick={handleRegenerate} loading={regenerating}>
              {t.calendarEvents.publicLink.regenerate}
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
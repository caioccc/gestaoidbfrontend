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
  Select,
  Switch,
  NumberInput,
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
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { CalendarEvent, CalendarEventCategory } from '../types';

export interface CalendarEventsGateway {
  list: () => Promise<CalendarEvent[]>;
  create: (payload: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  update: (id: number, payload: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  delete: (id: number) => Promise<void>;
}

const CATEGORY_COLORS: Record<CalendarEventCategory, string> = {
  bill: 'blue',
  deadline: 'grape',
  meeting: 'green',
  event: 'violet',
};

const CATEGORY_ORDER: CalendarEventCategory[] = ['bill', 'deadline', 'meeting', 'event'];

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

export default function CalendarEventsBoard({ gateway, locale }: { gateway: CalendarEventsGateway; locale?: string }) {
  const { t } = useLanguage();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = t.months[month];

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  const load = () => {
    setLoading(true);
    gateway
      .list()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const eventsForDay = useMemo(
    () => (day: number): CalendarEvent[] => {
      const list: CalendarEvent[] = [];
      for (const ev of events) {
        if (ev.repeat_monthly) {
          if (ev.day === day) list.push(ev);
        } else if (ev.date) {
          const d = dateFromApi(ev.date);
          if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
            list.push(ev);
          }
        }
      }
      return list;
    },
    [events, year, month]
  );

  const categoryLabel = (c: CalendarEventCategory) => t.calendarEvents.categories[c] || c;

  const form = useForm<{
    title: string;
    category: CalendarEventCategory;
    repeat_monthly: boolean;
    day: number | null;
    date: Date | null;
  }>({
    initialValues: { title: '', category: 'event', repeat_monthly: false, day: null, date: new Date() },
    validate: {
      title: (v) => (v.trim().length ? null : t.calendarEvents.title),
    },
  });

  const openNew = () => {
    setEditing(null);
    form.setValues({ title: '', category: 'event', repeat_monthly: false, day: null, date: new Date() });
    form.resetDirty();
    setModalOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev);
    form.setValues({
      title: ev.title,
      category: ev.category,
      repeat_monthly: ev.repeat_monthly,
      day: ev.repeat_monthly ? ev.day : null,
      date: ev.date ? dateFromApi(ev.date) : new Date(year, month, ev.day ?? 1),
    });
    form.resetDirty();
    setModalOpen(true);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    setSaving(true);
    const payload: Partial<CalendarEvent> = {
      title: values.title.trim(),
      category: values.category,
      repeat_monthly: values.repeat_monthly,
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

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
        <Button data-testid="calendar-new" leftSection={<IconPlus size={16} />} onClick={openNew}>
          {t.calendarEvents.new}
        </Button>
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
              const items = eventsForDay(day);
              const todayCell = isToday(day);
              return (
                <Tooltip
                  key={day}
                  label={
                    items.length
                      ? items.map((b) => `${b.title}`).join('\n')
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
                          key={b.id}
                          size="xs"
                          color={CATEGORY_COLORS[b.category] ?? 'gray'}
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

      <Paper withBorder radius="md" p="md" mt="md">
        <Text size="sm" fw={700} mb="xs">
          {t.calendarEvents.allEvents}
        </Text>
        {events.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t.calendarEvents.noEvents}
          </Text>
        ) : (
          <Stack gap={6}>
            {events.map((ev) => (
              <Group key={ev.id} gap="sm" justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <Badge size="sm" variant="light" color={CATEGORY_COLORS[ev.category] ?? 'gray'}>
                    {categoryLabel(ev.category)}
                  </Badge>
                  <Text size="sm" fw={500}>
                    {ev.title}
                  </Text>
                  {ev.repeat_monthly ? (
                    <Text size="xs" c="dimmed">
                      {t.calendarEvents.recurringDay.replace('{day}', String(ev.day))}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      {ev.date}
                    </Text>
                  )}
                </Group>
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
              placeholder={t.calendarEvents.category}
              {...form.getInputProps('title')}
            />
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
                value={form.values.date}
                onChange={(v) =>
                  form.setFieldValue('date', v ? (typeof v === 'string' ? dateFromApi(v) : v) : null)
                }
                locale={locale}
              />
            )}
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
    </>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { QRCodeSVG } from 'qrcode.react';
import {
  IconClipboardList,
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconPlus,
  IconQrcode,
  IconRefresh,
  IconShare,
  IconTrash,
} from '@tabler/icons-react';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { MonthYearPicker } from '../components/MonthYearPicker';
import { eventCheckinApi } from '../api/checkin';
import { calendarEventsApi } from '../api/finance';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { formatCheckinDate, parseCheckinDateInput } from '../utils/eventCheckin';
import { maskTime } from '../utils/format';
import type {
  CalendarEvent,
  Event,
  EventShareLink,
  EventSource,
} from '../types';

const EVENT_ROLES = ['PASTOR', 'SECRETARIA', 'TESOUREIRO', 'ADMIN'];
const PAGE_SIZE = 20;

interface EventFormValues {
  source: EventSource;
  calendar_event: string | null;
  title: string;
  date: string | null;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  is_active: boolean;
  registration_token_is_active: boolean;
}

const EMPTY_FORM: EventFormValues = {
  source: 'STANDALONE',
  calendar_event: null,
  title: '',
  date: null,
  start_time: '',
  end_time: '',
  location: '',
  description: '',
  is_active: true,
  registration_token_is_active: true,
};

export default function EventsPage() {
  const { t, locale } = useLanguage();
  const fb = useFeedback();
  const router = useRouter();

  const now = new Date();
  const [events, setEvents] = useState<Event[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [share, setShare] = useState<EventShareLink | null>(null);
  const [shareEventId, setShareEventId] = useState<number | null>(null);

  const form = useForm<EventFormValues>({ initialValues: EMPTY_FORM });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, calendars] = await Promise.all([
        eventCheckinApi.listEvents({
          search: search.trim() || undefined,
          source: (source as EventSource) || undefined,
          month,
          year,
          page,
          pageSize: PAGE_SIZE,
        }),
        calendarEventsApi.list(),
      ]);
      setEvents(list.results);
      setTotal(list.count);
      setCalendarEvents(calendars);
    } catch (err) {
      fb.fromError(err, t.common.toast.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [fb, month, page, search, source, t.common.toast.loadFailed, year]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setSearch('');
    setSource(null);
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setPage(1);
  };

  const calendarQuery = router.query.calendar;
  useEffect(() => {
    if (!router.isReady) return;
    const calendarId = Array.isArray(calendarQuery) ? calendarQuery[0] : calendarQuery;
    if (!calendarId || !/^\d+$/.test(calendarId)) return;
    const calendarEvent = calendarEvents.find((item) => item.id === Number(calendarId));
    setEditing(null);
    form.setValues({
      ...EMPTY_FORM,
      source: 'CALENDAR',
      calendar_event: calendarId,
      title: calendarEvent?.title ?? '',
      date: calendarEvent?.date ?? null,
      start_time: calendarEvent?.start_time?.slice(0, 5) ?? '',
      end_time: calendarEvent?.end_time?.slice(0, 5) ?? '',
      location: '',
    });
    setModalOpen(true);
  }, [router.isReady, calendarQuery, calendarEvents]);

  const openCreate = () => {
    setEditing(null);
    form.setValues(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditing(event);
    form.setValues({
      source: event.source,
      calendar_event: event.calendar_event ? String(event.calendar_event) : null,
      title: event.title,
      date: event.date,
      start_time: event.start_time?.slice(0, 5) ?? '',
      end_time: event.end_time?.slice(0, 5) ?? '',
      location: event.location,
      description: event.description,
      is_active: event.is_active,
      registration_token_is_active: event.registration_token_is_active,
    });
    setModalOpen(true);
  };

  const chooseCalendarEvent = (value: string | null) => {
    const selected = calendarEvents.find((item) => item.id === Number(value));
    form.setValues((current) => ({
      ...current,
      calendar_event: value,
      title: selected?.title ?? current.title,
      date: selected?.date ?? current.date,
      start_time: selected?.start_time?.slice(0, 5) ?? current.start_time,
      end_time: selected?.end_time?.slice(0, 5) ?? current.end_time,
    }));
  };

  const save = async () => {
    const values = form.getValues();
    if (!values.title.trim()) {
      form.setFieldError('title', t.events.form.titleField);
      return;
    }
    if (values.source === 'CALENDAR' && !values.calendar_event) {
      form.setFieldError('calendar_event', t.events.form.calendarEvent);
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Event> = {
        source: values.source,
        calendar_event:
          values.source === 'CALENDAR' && values.calendar_event
            ? Number(values.calendar_event)
            : null,
        title: values.title.trim(),
        date: values.date,
        start_time: values.start_time ? `${values.start_time}:00` : null,
        end_time: values.end_time ? `${values.end_time}:00` : null,
        location: values.location,
        description: values.description,
        is_active: values.is_active,
        registration_token_is_active: values.registration_token_is_active,
      };
      if (editing) {
        await eventCheckinApi.updateEvent(editing.id, payload);
        fb.success(t.common.toast.saved);
      } else {
        await eventCheckinApi.createEvent(payload);
        fb.success(t.common.toast.created);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      fb.fromError(err, t.common.toast.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event: Event) => {
    if (!window.confirm(t.events.deleteConfirm)) return;
    try {
      await eventCheckinApi.deleteEvent(event.id);
      fb.success(t.common.toast.deleted);
      await load();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const openShare = async (event: Event) => {
    try {
      setShareEventId(event.id);
      setShare(await eventCheckinApi.shareRegistration(event.id));
    } catch (err) {
      fb.fromError(err, t.common.toast.loadFailed);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      fb.success(t.events.copied);
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const regenerateToken = async () => {
    if (!shareEventId || !window.confirm(t.events.regenerateConfirm)) return;
    try {
      const result = await eventCheckinApi.regenerateEventToken(shareEventId);
      fb.success(t.common.toast.updatedWithName.replace('{name}', t.events.registrationLink));
      setShare((current) => (current ? { ...current, ...result } : current));
      await load();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const sourceLabel = (event: Event) =>
    event.source === 'CALENDAR' ? t.events.sourceCalendar : t.events.sourceStandalone;

  return (
    <AuthGuard roles={EVENT_ROLES}>
      <>
        <Head>
          <title>{t.events.title}</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <PageHeader title={t.events.title} description={t.events.subtitle}>
          <Button leftSection={<IconPlus size={14} />} onClick={openCreate}>
            {t.events.newEvent}
          </Button>
        </PageHeader>

        <Paper withBorder p="md" radius="md" mb="md">
          <Stack gap="md">
            <Group align="flex-end" wrap="wrap">
              <TextInput
                label={t.events.search}
                placeholder={t.common.search}
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setPage(1);
                }}
                maw={300}
              />
              <Select
                label={t.events.form.source}
                placeholder={t.events.allSources}
                clearable
                data={[
                  { value: 'CALENDAR', label: t.events.sourceCalendar },
                  { value: 'STANDALONE', label: t.events.sourceStandalone },
                ]}
                value={source}
                onChange={(value) => { setSource(value); setPage(1); }}
                w={190}
              />
              <MonthYearPicker
                data-testid="events-period"
                label={`${t.common.month}/${t.common.year}`}
                year={year}
                month={month}
                onChange={(nextYear, nextMonth) => {
                  setYear(nextYear);
                  setMonth(nextMonth);
                  setPage(1);
                }}
                w={180}
              />
              <Tooltip label={t.common.refresh}>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label={t.common.refresh}
                  onClick={load}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
              <Button variant="subtle" onClick={resetFilters}>
                {t.common.clear}
              </Button>
            </Group>
          </Stack>
        </Paper>

        {loading ? (
          <Center h="40vh"><Loader /></Center>
        ) : events.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">{t.events.empty}</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="sm">
            {events.map((event) => (
              <Paper key={event.id} withBorder p="md" radius="md" data-testid={`event-${event.id}`}>
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Text fw={700} truncate>{event.title}</Text>
                      <Text size="xs" c="dimmed">
                        {event.date ? formatCheckinDate(event.date, locale) : '—'}
                        {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ''}
                      </Text>
                    </Stack>
                    <Badge variant="light" color={event.is_active ? 'green' : 'gray'}>
                      {event.is_active ? t.events.active : t.events.inactive}
                    </Badge>
                  </Group>

                  <Group gap="xs">
                    <Badge size="sm" variant="default">{sourceLabel(event)}</Badge>
                    {event.location ? (
                      <Text size="xs" c="dimmed" truncate>{event.location}</Text>
                    ) : null}
                  </Group>

                  <Group gap="lg">
                    <Text size="xs" c="dimmed">
                      {t.events.registrationCount}: {event.registration_count}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t.events.checkedCount}: {event.checked_count}
                    </Text>
                  </Group>

                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t.events.checkin}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t.events.checkin}
                        onClick={() => router.push(`/admin/events/${event.id}/check-in`)}
                      >
                        <IconQrcode size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t.events.registrations}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t.events.registrations}
                        onClick={() => router.push({
                          pathname: '/admin/events/[eventId]/check-in',
                          query: { eventId: event.id, tab: 'registrations' },
                        })}
                      >
                        <IconClipboardList size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t.events.share}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t.events.share}
                        onClick={() => openShare(event)}
                      >
                        <IconShare size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t.events.edit}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t.events.edit}
                        onClick={() => openEdit(event)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t.events.delete}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={t.events.delete}
                        onClick={() => remove(event)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        )}

        {total > PAGE_SIZE ? (
          <Group justify="center" mt="md">
            <Pagination
              value={page}
              onChange={setPage}
              total={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              size="sm"
              data-testid="events-pagination"
            />
          </Group>
        ) : null}

        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? t.events.edit : t.events.newEvent}
          size="lg"
        >
          <Stack gap="md">
            <Select
              label={t.events.form.source}
              data={[
                { value: 'STANDALONE', label: t.events.sourceStandalone },
                { value: 'CALENDAR', label: t.events.sourceCalendar },
              ]}
              value={form.values.source}
              onChange={(value) => form.setFieldValue('source', (value as EventSource) ?? 'STANDALONE')}
              allowDeselect={false}
            />
            {form.values.source === 'CALENDAR' ? (
              <Select
                label={t.events.form.calendarEvent}
                data={calendarEvents.map((item) => ({ value: String(item.id), label: item.title }))}
                value={form.values.calendar_event}
                onChange={chooseCalendarEvent}
                searchable
                error={form.errors.calendar_event}
              />
            ) : null}
            <TextInput
              label={t.events.form.titleField}
              {...form.getInputProps('title')}
            />
            <Group grow align="flex-start" wrap="wrap">
              <DateInput
                label={t.events.form.date}
                value={form.values.date}
                onChange={(value) => form.setFieldValue('date', value ? parseCheckinDateInput(value) : null)}
                locale={locale}
                valueFormat="DD/MM/YYYY"
                clearable
              />
              <TextInput
                label={t.events.form.start}
                placeholder={t.calendarEvents.timePlaceholder}
                maxLength={5}
                value={maskTime(form.values.start_time)}
                onChange={(event) => form.setFieldValue(
                  'start_time',
                  maskTime(event.currentTarget.value)
                )}
              />
              <TextInput
                label={t.events.form.end}
                placeholder={t.calendarEvents.timePlaceholder}
                maxLength={5}
                value={maskTime(form.values.end_time)}
                onChange={(event) => form.setFieldValue(
                  'end_time',
                  maskTime(event.currentTarget.value)
                )}
              />
            </Group>
            <TextInput label={t.events.form.location} {...form.getInputProps('location')} />
            <Textarea
              label={t.events.form.description}
              autosize
              minRows={2}
              {...form.getInputProps('description')}
            />
            <Group gap="xl">
              <Checkbox
                label={t.events.form.isActive}
                checked={form.values.is_active}
                onChange={(event) => form.setFieldValue('is_active', event.currentTarget.checked)}
              />
              <Checkbox
                label={t.events.form.linkActive}
                checked={form.values.registration_token_is_active}
                onChange={(event) => form.setFieldValue(
                  'registration_token_is_active',
                  event.currentTarget.checked
                )}
              />
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalOpen(false)}>
                {t.events.form.cancel}
              </Button>
              <Button loading={saving} onClick={save}>
                {editing ? t.events.form.save : t.events.form.create}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!share}
          onClose={() => setShare(null)}
          title={t.events.registrationPanel.shareTitle}
          size="sm"
        >
          {share ? (
            <Stack gap="md" align="center">
              <QRCodeSVG value={share.url} size={180} includeMargin />
              <Text size="sm" ta="center" c="dimmed">
                {t.events.registrationPanel.shareHint}
              </Text>
              <Paper withBorder p="xs" radius="sm" w="100%">
                <Text size="xs" style={{ wordBreak: 'break-all' }}>{share.url}</Text>
              </Paper>
              <Group justify="center" wrap="wrap">
                <Button
                  variant="default"
                  leftSection={<IconCopy size={14} />}
                  onClick={() => copyLink(share.url)}
                >
                  {t.events.copy}
                </Button>
                <Button
                  variant="default"
                  component="a"
                  href={`https://wa.me/?text=${encodeURIComponent(share.url)}`}
                  target="_blank"
                  rel="noreferrer"
                  leftSection={<IconExternalLink size={14} />}
                >
                  {t.events.registrationPanel.whatsapp}
                </Button>
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={14} />}
                  onClick={regenerateToken}
                >
                  {t.events.regenerateToken}
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Modal>
      </>
    </AuthGuard>
  );
}

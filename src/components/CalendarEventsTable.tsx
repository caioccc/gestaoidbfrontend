import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { IconEdit, IconQrcode, IconTrash } from '@tabler/icons-react';
import MobileItemCard from './MobileItemCard';
import { eventCheckinApi } from '../api/checkin';
import { ListPagination, useServerPagination } from './ListPagination';
import { useLanguage } from '../i18n';
import { formatDate } from '../utils/format';
import {
  dateFromApi,
  dateToApi,
  expandEvents,
} from '../utils/calendarRecurrence';
import {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventOccurrenceRow,
  CalendarEventTableParams,
  Paginated,
} from '../types';
import type { CalendarEventsGateway } from './CalendarEventsBoard';

const CATEGORY_OPTIONS: CalendarEventCategory[] = [
  'bill', 'deadline', 'meeting', 'event', 'culto', 'ensaio',
];

const CATEGORY_COLORS: Record<CalendarEventCategory, string> = {
  bill: 'blue',
  deadline: 'grape',
  meeting: 'green',
  event: 'violet',
  culto: 'orange',
  ensaio: 'cyan',
};

type PeriodMode = 'month' | 'all';

function localRecurrenceLabel(ev: CalendarEvent): string {
  if (ev.repeat_monthly) return 'Mensal';
  if (ev.repeat_weekly) return ev.repeat_interval > 1 ? 'Quinzenal' : 'Semanal';
  return 'Pontual';
}

function localWindow(period: PeriodMode, year: number, month: number, events: CalendarEvent[]) {
  if (period === 'month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, days: Math.round((end.getTime() - start.getTime()) / 86400000) };
  }

  const today = new Date();
  const horizon = new Date(today.getFullYear() + 5, 11, 31);
  const anchors = events
    .map((ev) => (ev.date ? dateFromApi(ev.date) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
  const repeatEnds = events
    .map((ev) => (ev.repeat_end_date ? dateFromApi(ev.repeat_end_date) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
  const openEnded = events.some(
    (ev) => (ev.repeat_monthly || ev.repeat_weekly) && !ev.repeat_end_date
  );
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  if (anchors.length) start = new Date(Math.min(...anchors.map((d) => d.getTime()), start.getTime()));
  let end = openEnded || !repeatEnds.length
    ? horizon
    : new Date(Math.max(...repeatEnds.map((d) => d.getTime())));
  if (end > horizon) end = horizon;
  if (anchors.length) {
    const lastAnchor = new Date(Math.max(...anchors.map((d) => d.getTime())));
    if (lastAnchor > end) end = lastAnchor;
  }
  return {
    start,
    days: Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)),
  };
}

function localResult(
  params: CalendarEventTableParams,
  period: PeriodMode,
  year: number,
  month: number,
  events: CalendarEvent[]
): Paginated<CalendarEventOccurrenceRow> {
  const { start, days } = localWindow(period, year, month, events);
  const expanded = expandEvents(events, start, days);
  const search = (params.search || '').trim().toLowerCase();
  const category = params.category || '';
  const matching = expanded.filter(({ date, event }) => {
    if (category && event.category !== category) return false;
    if (
      event.repeat_end_date
      && (event.repeat_monthly || event.repeat_weekly)
      && (dateToApi(date) || '') > event.repeat_end_date
    ) return false;
    if (!search) return true;
    return (
      event.title.toLowerCase().includes(search)
      || event.description.toLowerCase().includes(search)
      || event.created_by_name.toLowerCase().includes(search)
    );
  });
  matching.sort((a, b) => {
    const keyA = `${dateToApi(a.date) ?? ''}:${a.event.id}`;
    const keyB = `${dateToApi(b.date) ?? ''}:${b.event.id}`;
    return keyA.localeCompare(keyB);
  });
  const page = params.page || 1;
  const pageSize = params.page_size || 20;
  const rows = matching.slice((page - 1) * pageSize, page * pageSize).map(({ date, event }) => ({
    row_key: `${dateToApi(date)}:${event.id}`,
    occurrence_date: dateToApi(date) || '',
    event_id: event.id,
    title: event.title,
    category: event.category,
    category_display: event.category_display,
    audience: event.audience,
    audience_display: event.audience_display,
    color: event.color,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    created_by_name: event.created_by_name,
    members_names: event.members_names,
    recurrence_display: localRecurrenceLabel(event),
  }));
  return {
    count: matching.length,
    next: page * pageSize < matching.length ? 'next' : null,
    previous: page > 1 ? 'previous' : null,
    results: rows,
  };
}

interface CalendarEventsTableProps {
  gateway: CalendarEventsGateway;
  events: CalendarEvent[];
  refreshKey: number;
  onOpenDetail: (ev: CalendarEvent) => void;
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (ev: CalendarEvent) => void;
  canEditEvent: (ev: CalendarEvent) => boolean;
}

export default function CalendarEventsTable({
  gateway,
  events,
  refreshKey,
  onOpenDetail,
  onEdit,
  onDelete,
  canEditEvent,
}: CalendarEventsTableProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const today = new Date();
  const [period, setPeriod] = useState<PeriodMode>('month');
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CalendarEventOccurrenceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pagination = useServerPagination();

  const eventById = useMemo(
    () => new Map(events.map((ev) => [ev.id, ev])),
    [events]
  );

  useEffect(() => {
    let active = true;
    const params: CalendarEventTableParams = {
      ...(period === 'all'
        ? { all: true }
        : { year, month }),
      ...(category ? { category: category as CalendarEventCategory } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ordering: 'occurrence_date',
      page: pagination.page,
      page_size: pagination.pageSize,
    };
    setLoading(true);
    setError(false);
    const request = gateway.listTable
      ? gateway.listTable(params)
      : Promise.resolve(localResult(params, period, year, month, events));
    request
      .then((result) => {
        if (!active) return;
        setRows(result.results);
        pagination.setTotal(result.count);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        pagination.setTotal(0);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    gateway.listTable,
    period,
    year,
    month,
    category,
    search,
    pagination.page,
    pagination.pageSize,
    pagination.setTotal,
    refreshKey,
  ]);

  const categoryLabel = (c: CalendarEventCategory) => t.calendarEvents.categories[c] || c;

  const openCheckin = async (ev: CalendarEvent) => {
    try {
      const result = await eventCheckinApi.listEvents({ calendarEvent: ev.id });
      router.push(
        result.results[0]
          ? `/admin/events/${result.results[0].id}/check-in`
          : `/events?calendar=${ev.id}`
      );
    } catch {
      router.push(`/events?calendar=${ev.id}`);
    }
  };

  const actionsFor = (row: CalendarEventOccurrenceRow) => {
    const ev = eventById.get(row.event_id);
    if (!ev || !canEditEvent(ev)) return null;
    return (
      <Group gap={4} wrap="nowrap">
        <Tooltip label={t.eventCheckin.title}>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label={t.eventCheckin.title}
            onClick={(event) => {
              event.stopPropagation();
              openCheckin(ev);
            }}
          >
            <IconQrcode size={15} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t.calendarEvents.edit}>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label={t.calendarEvents.edit}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(ev);
            }}
          >
            <IconEdit size={15} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t.calendarEvents.deleteTitle}>
          <ActionIcon
            size="sm"
            color="red"
            variant="subtle"
            aria-label={t.calendarEvents.deleteTitle}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(ev);
            }}
          >
            <IconTrash size={15} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  };

  const openRow = (row: CalendarEventOccurrenceRow) => {
    const ev = eventById.get(row.event_id);
    if (ev) onOpenDetail(ev);
  };

  const columns: DataTableColumn<CalendarEventOccurrenceRow>[] = [
    {
      accessor: 'occurrence_date',
      title: t.calendarEvents.tableOccurrence,
      render: (row) => <Text size="sm" fw={500}>{formatDate(row.occurrence_date)}</Text>,
    },
    {
      accessor: 'title',
      title: t.calendarEvents.title,
      render: (row) => (
        <Stack gap={0}>
          <Text size="sm" fw={500} lineClamp={1}>{row.title}</Text>
          {row.description ? (
            <Text size="xs" c="dimmed" lineClamp={1}>{row.description}</Text>
          ) : null}
        </Stack>
      ),
    },
    {
      accessor: 'category_display',
      title: t.calendarEvents.category,
      render: (row) => (
        <Badge size="sm" variant="light" color={row.color || CATEGORY_COLORS[row.category]}>
          {row.category_display || categoryLabel(row.category)}
        </Badge>
      ),
    },
    {
      accessor: 'audience_display',
      title: t.calendarEvents.audience,
      render: (row) => <Text size="sm">{row.audience_display}</Text>,
    },
    {
      accessor: 'recurrence_display',
      title: t.calendarEvents.recurrence,
      render: (row) => <Text size="sm">{row.recurrence_display}</Text>,
    },
    {
      accessor: 'start_time',
      title: t.calendarEvents.time,
      render: (row) => <Text size="sm">{row.start_time?.slice(0, 5) || '—'}</Text>,
    },
    {
      accessor: 'members_names',
      title: t.calendarEvents.members,
      render: (row) => (
        <Text size="sm" lineClamp={1}>
          {row.members_names.map((m) => m.name).join(', ') || '—'}
        </Text>
      ),
    },
    {
      accessor: 'actions',
      title: t.common.actions,
      render: actionsFor,
    },
  ];

  return (
    <Paper withBorder radius="md" p="md" mt="md" data-testid="calendar-events-table-panel">
      <Stack gap="sm">
        <Group justify="space-between" gap="xs" wrap="wrap">
          <Text size="sm" fw={700}>{t.calendarEvents.allEvents}</Text>
          <Text size="xs" c="dimmed">
            {t.calendarEvents.visibleCount
              .replace('{shown}', String(rows.length))
              .replace('{total}', String(pagination.total))}
          </Text>
        </Group>

        <Group gap="sm" align="end" wrap="wrap">
          <SegmentedControl
            data-testid="calendar-events-table-period-mode"
            value={period}
            onChange={(value) => {
              setPeriod(value as PeriodMode);
              pagination.setPage(1);
            }}
            data={[
              { value: 'month', label: t.common.month },
              { value: 'all', label: t.calendarEvents.tableAllPeriod },
            ]}
          />
          {period === 'month' ? (
            <>
              <NumberInput
                data-testid="calendar-events-table-year"
                label={t.common.year}
                min={2000}
                max={2100}
                allowDecimal={false}
                allowNegative={false}
                value={year}
                onChange={(value) => {
                  setYear(Number(value) || today.getFullYear());
                  pagination.setPage(1);
                }}
                w={110}
              />
              <Select
                data-testid="calendar-events-table-month"
                label={t.common.month}
                allowDeselect={false}
                data={t.months.map((label, index) => ({
                  value: String(index + 1),
                  label,
                }))}
                value={String(month)}
                onChange={(value) => {
                  setMonth(Number(value) || 1);
                  pagination.setPage(1);
                }}
                w={150}
              />
            </>
          ) : null}
          <Select
            data-testid="calendar-events-table-category"
            label={t.calendarEvents.category}
            placeholder={t.common.all}
            clearable
            data={CATEGORY_OPTIONS.map((c) => ({ value: c, label: categoryLabel(c) }))}
            value={category}
            onChange={(value) => {
              setCategory(value);
              pagination.setPage(1);
            }}
            w={180}
          />
          <TextInput
            data-testid="calendar-events-table-search"
            label={t.common.search}
            placeholder={t.common.search}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              pagination.setPage(1);
            }}
            maw={260}
          />
        </Group>

        {error ? (
          <Text size="sm" c="red">{t.common.toast.loadFailed}</Text>
        ) : null}

        <Box visibleFrom="sm" data-testid="calendar-events-table">
          <DataTable<CalendarEventOccurrenceRow>
            withTableBorder
            highlightOnHover
            striped
            fetching={loading}
            minHeight={200}
            columns={columns}
            records={rows}
            noRecordsText={t.common.noData}
            idAccessor="row_key"
            onRowClick={({ record }) => openRow(record)}
          />
        </Box>

        <Stack hiddenFrom="sm" gap="xs">
          {rows.map((row) => (
            <MobileItemCard
              key={row.row_key}
              testId={`calendar-events-table-card-${row.row_key}`}
              onClick={() => openRow(row)}
              actions={actionsFor(row)}
            >
              <Stack gap={4}>
                <Group gap={6} wrap="nowrap">
                  <Text fw={600} size="sm" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(row.occurrence_date)}
                  </Text>
                  <Badge size="sm" variant="light" color={row.color || CATEGORY_COLORS[row.category]}>
                    {row.category_display || categoryLabel(row.category)}
                  </Badge>
                </Group>
                <Text size="sm" fw={500} truncate>{row.title}</Text>
                <Text size="xs" c="dimmed" truncate>
                  {row.audience_display} · {row.recurrence_display}
                </Text>
              </Stack>
            </MobileItemCard>
          ))}
          {!loading && rows.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">{t.common.noData}</Text>
          ) : null}
        </Stack>

        <ListPagination
          testId="calendar-events-table-pagination"
          page={pagination.page}
          onPageChange={pagination.setPage}
          pageSize={pagination.pageSize}
          onPageSizeChange={pagination.changePageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
        />
      </Stack>
    </Paper>
  );
}

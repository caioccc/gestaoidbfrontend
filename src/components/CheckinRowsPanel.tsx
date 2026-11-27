import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { IconTrash, IconUserPlus } from '@tabler/icons-react';
import { eventCheckinApi } from '../api/checkin';
import CheckinMemberPicker from './CheckinMemberPicker';
import MobileItemCard from './MobileItemCard';
import { ListPagination, useServerPagination } from './ListPagination';
import { SkeletonResponsiveTable } from './LoadingSkeleton';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { formatCheckinDate, formatCheckinDateTime } from '../utils/eventCheckin';
import type {
  EventCheckinListParams,
  EventCheckinRow,
  EventCheckinSession,
  EventCheckinTeamMember,
} from '../types';

interface CheckinRowsPanelProps {
  sessions: EventCheckinSession[];
  team: EventCheckinTeamMember[];
  defaultSession?: number;
  onChanged: () => void;
}

export default function CheckinRowsPanel({ sessions, team, defaultSession, onChanged }: CheckinRowsPanelProps) {
  const { t, locale } = useLanguage();
  const fb = useFeedback();
  const pagination = useServerPagination({ pageSize: 20 });
  const [rows, setRows] = useState<EventCheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [session, setSession] = useState<string | null>(defaultSession ? String(defaultSession) : null);
  const [status, setStatus] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [roster, setRoster] = useState<string | null>(null);
  const [ordering, setOrdering] = useState('-checked_at');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMember, setManualMember] = useState<number | null>(null);
  const [manualOperator, setManualOperator] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      pagination.reset();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (defaultSession && !session) setSession(String(defaultSession));
  }, [defaultSession, session]);

  const params = useMemo<EventCheckinListParams>(() => ({
    page: pagination.page,
    page_size: pagination.pageSize,
    search: search || undefined,
    session: session ? Number(session) : undefined,
    status: (status as EventCheckinListParams['status']) || undefined,
    source: (source as EventCheckinListParams['source']) || undefined,
    in_roster: roster === 'in' ? true : roster === 'out' ? false : undefined,
    ordering,
  }), [
    pagination.page,
    pagination.pageSize,
    search,
    session,
    status,
    source,
    roster,
    ordering,
  ]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    eventCheckinApi.listCheckins(params)
      .then((result) => {
        if (!active) return;
        setRows(result.results);
        pagination.setTotal(result.count);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [params, pagination.setTotal]);

  useEffect(load, [load]);

  const cancel = async (row: EventCheckinRow) => {
    if (!window.confirm(t.eventCheckin.checkins.cancelConfirm)) return;
    try {
      await eventCheckinApi.cancel(row.id);
      fb.success(t.common.toast.saved);
      load();
      onChanged();
    } catch (err) {
      fb.fromError(err, t.common.toast.operationFailed);
    }
  };

  const manual = async () => {
    const sessionId = session ? Number(session) : sessions[0]?.id;
    if (!manualMember || !sessionId) return;
    setSaving(true);
    try {
      await eventCheckinApi.manual({
        session: sessionId,
        member: manualMember,
        operator: manualOperator ? Number(manualOperator) : null,
      });
      fb.success(t.eventCheckin.public.success);
      setManualOpen(false);
      setManualMember(null);
      load();
      onChanged();
    } catch (err) {
      fb.fromError(err, t.eventCheckin.public.error);
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<EventCheckinRow>[] = [
    {
      accessor: 'occurrence_date',
      title: t.eventCheckin.checkins.date,
      render: (row) => <Text size="sm">{formatCheckinDate(row.occurrence_date, locale)}</Text>,
    },
    {
      accessor: 'person.name',
      title: t.eventCheckin.checkins.member,
      render: (row) => (
        <Stack gap={0}>
          <Text size="sm" fw={600}>{row.person?.name ?? row.member?.name ?? '—'}</Text>
          <Group gap={4}>
            {row.person?.card_number ? (
              <Text size="xs" c="dimmed">{row.person.card_number}</Text>
            ) : null}
            {row.registration_kind ? (
              <Badge size="xs" variant="default">{row.registration_kind}</Badge>
            ) : null}
          </Group>
        </Stack>
      ),
    },
    {
      accessor: 'in_roster',
      title: t.eventCheckin.checkins.roster,
      render: (row) => (
        <Badge size="sm" variant="light" color={row.in_roster ? 'green' : 'orange'}>
          {row.in_roster ? t.eventCheckin.checkins.inRoster : t.eventCheckin.checkins.outsideRoster}
        </Badge>
      ),
    },
    {
      accessor: 'source_display',
      title: t.eventCheckin.checkins.source,
      render: (row) => (
        <Badge size="sm" variant="default">
          {row.source_display || (row.source === 'SCAN' ? t.eventCheckin.checkins.scan : t.eventCheckin.checkins.manual)}
        </Badge>
      ),
    },
    {
      accessor: 'operator_name',
      title: t.eventCheckin.checkins.operator,
      render: (row) => (
        <Stack gap={0}>
          <Text size="sm">{row.operator_name || '—'}</Text>
          {row.role_name ? <Text size="xs" c="dimmed">{row.role_name}</Text> : null}
        </Stack>
      ),
    },
    {
      accessor: 'checked_at',
      title: t.eventCheckin.checkins.checkedAt,
      render: (row) => <Text size="sm">{formatCheckinDateTime(row.checked_at, locale)}</Text>,
    },
    {
      accessor: 'status_display',
      title: t.eventCheckin.checkins.status,
      render: (row) => (
        <Badge size="sm" variant="light" color={row.status === 'CHECKED_IN' ? 'green' : 'gray'}>
          {row.status_display || (row.status === 'CHECKED_IN' ? t.eventCheckin.checkins.checkedIn : t.eventCheckin.checkins.cancelled)}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: t.eventCheckin.checkins.actions,
      render: (row) => (
        <Tooltip label={t.eventCheckin.checkins.cancel}>
          <ActionIcon
            size="sm"
            color="red"
            variant="subtle"
            aria-label={t.eventCheckin.checkins.cancel}
            disabled={row.status !== 'CHECKED_IN'}
            onClick={() => cancel(row)}
          >
            <IconTrash size={15} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ];

  return (
    <Stack gap="md" data-testid="checkin-rows-panel">
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Text fw={700}>{t.eventCheckin.checkins.title}</Text>
            <Button
              size="sm"
              variant="default"
              leftSection={<IconUserPlus size={14} />}
              data-testid="checkin-manual-open"
              onClick={() => setManualOpen(true)}
            >
              {t.eventCheckin.checkins.addManual}
            </Button>
          </Group>
          <Group align="flex-end" wrap="wrap">
            <TextInput
              data-testid="checkin-rows-search"
              label={t.eventCheckin.checkins.search}
              placeholder={t.common.search}
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              maw={260}
            />
            <Select
              data-testid="checkin-rows-session"
              label={t.eventCheckin.sessions.title}
              placeholder={t.common.all}
              clearable
              data={sessions.map((item) => ({
                value: String(item.id),
                label: `${formatCheckinDate(item.occurrence_date, locale)} · ${item.event_title}`,
              }))}
              value={session}
              onChange={setSession}
              w={240}
            />
            <Select
              data-testid="checkin-rows-status"
              label={t.eventCheckin.checkins.status}
              placeholder={t.eventCheckin.checkins.allStatuses}
              clearable
              data={[
                { value: 'CHECKED_IN', label: t.eventCheckin.checkins.checkedIn },
                { value: 'CANCELLED', label: t.eventCheckin.checkins.cancelled },
              ]}
              value={status}
              onChange={(value) => { setStatus(value); pagination.reset(); }}
              w={180}
            />
            <Select
              data-testid="checkin-rows-source"
              label={t.eventCheckin.checkins.source}
              placeholder={t.eventCheckin.checkins.allSources}
              clearable
              data={[
                { value: 'SCAN', label: t.eventCheckin.checkins.scan },
                { value: 'MANUAL', label: t.eventCheckin.checkins.manual },
              ]}
              value={source}
              onChange={(value) => { setSource(value); pagination.reset(); }}
              w={180}
            />
            <Select
              data-testid="checkin-rows-roster"
              label={t.eventCheckin.checkins.roster}
              placeholder={t.eventCheckin.checkins.allRoster}
              clearable
              data={[
                { value: 'in', label: t.eventCheckin.checkins.inRoster },
                { value: 'out', label: t.eventCheckin.checkins.outsideRoster },
              ]}
              value={roster}
              onChange={(value) => { setRoster(value); pagination.reset(); }}
              w={200}
            />
            <Select
              data-testid="checkin-rows-ordering"
              label={t.common.filter}
              data={[
                { value: '-checked_at', label: t.eventCheckin.checkins.checkedAt },
                { value: 'checked_at', label: t.eventCheckin.checkins.checkedAt },
                { value: 'member_name', label: t.eventCheckin.checkins.member },
                { value: '-member_name', label: t.eventCheckin.checkins.member },
              ]}
              value={ordering}
              onChange={(value) => { setOrdering(value ?? '-checked_at'); pagination.reset(); }}
              allowDeselect={false}
              w={180}
            />
          </Group>
        </Stack>
      </Paper>

      {loading ? (
        <SkeletonResponsiveTable rows={5} columns={7} />
      ) : rows.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">{t.eventCheckin.checkins.empty}</Text>
      ) : (
        <>
          <Box visibleFrom="sm">
            <DataTable<EventCheckinRow>
              withTableBorder
              highlightOnHover
              striped
              columns={columns}
              records={rows}
              minHeight={200}
              idAccessor="id"
            />
          </Box>
          <Stack hiddenFrom="sm" gap="xs">
            {rows.map((row) => (
              <MobileItemCard key={row.id} testId={`checkin-row-${row.id}`}>
                <Stack gap={4}>
                  <Group gap={6} wrap="nowrap" justify="space-between">
                    <Text size="sm" fw={600} truncate>{row.person?.name ?? row.member?.name ?? '—'}</Text>
                    <Badge size="sm" color={row.status === 'CHECKED_IN' ? 'green' : 'gray'} variant="light">
                      {row.status === 'CHECKED_IN' ? t.eventCheckin.checkins.checkedIn : t.eventCheckin.checkins.cancelled}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {formatCheckinDate(row.occurrence_date, locale)} · {formatCheckinDateTime(row.checked_at, locale)}
                  </Text>
                  <Group gap={6}>
                    <Badge size="xs" variant="light" color={row.in_roster ? 'green' : 'orange'}>
                      {row.in_roster ? t.eventCheckin.checkins.inRoster : t.eventCheckin.checkins.outsideRoster}
                    </Badge>
                    <Text size="xs" c="dimmed">{row.operator_name || '—'}</Text>
                  </Group>
                  <Group justify="flex-end">
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      disabled={row.status !== 'CHECKED_IN'}
                      onClick={() => cancel(row)}
                    >
                      {t.eventCheckin.checkins.cancel}
                    </Button>
                  </Group>
                </Stack>
              </MobileItemCard>
            ))}
          </Stack>
          <ListPagination
            testId="checkin-rows-pagination"
            page={pagination.page}
            onPageChange={pagination.setPage}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.changePageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
          />
        </>
      )}

      <Modal
        opened={manualOpen}
        onClose={() => setManualOpen(false)}
        title={t.eventCheckin.checkins.manualTitle}
        centered
      >
        <Stack gap="md">
          <Select
            data-testid="checkin-manual-session"
            label={t.eventCheckin.sessions.title}
            data={sessions.map((item) => ({
              value: String(item.id),
              label: `${formatCheckinDate(item.occurrence_date, locale)} · ${item.event_title}`,
            }))}
            value={session ?? (sessions[0] ? String(sessions[0].id) : null)}
            onChange={setSession}
            allowDeselect={false}
          />
          <CheckinMemberPicker
            label={t.eventCheckin.checkins.memberSearch}
            value={manualMember}
            onChange={setManualMember}
            testId="checkin-manual-member"
          />
          <Select
            data-testid="checkin-manual-operator"
            label={t.eventCheckin.checkins.operator}
            placeholder={t.common.all}
            clearable
            data={team.map((item) => ({
              value: String(item.member),
              label: item.member_name,
            }))}
            value={manualOperator}
            onChange={setManualOperator}
          />
          <Group justify="flex-end">
            <Button
              data-testid="checkin-manual-submit"
              loading={saving}
              disabled={!manualMember || (!session && !sessions.length)}
              onClick={manual}
            >
              {t.eventCheckin.checkins.submit}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

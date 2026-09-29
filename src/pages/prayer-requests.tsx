import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Indicator,
  Loader,
  Menu,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArchive,
  IconEraser,
  IconBrandWhatsapp,
  IconCalendarCheck,
  IconCalendarPlus,
  IconChevronRight,
  IconClock,
  IconHeartHandshake,
  IconLayoutKanban,
  IconLayoutList,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconTrash,
  IconUser,
  IconUserCheck,
} from '@tabler/icons-react';
import AuthGuard from '../components/AuthGuard';
import CreatePrayerRequestModal from '../components/CreatePrayerRequestModal';
import FilterDrawer from '../components/FilterDrawer';
import { ListPagination } from '../components/ListPagination';
import MobileListToolbar from '../components/MobileListToolbar';
import PageHeader from '../components/PageHeader';
import { useIsCompactList } from '../hooks/useListBreakpoint';
import { accountsApi } from '../api/accounts';
import { saveBlob } from '../api/finance';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import type {
  PrayerRequest,
  PrayerRequestAssignee,
  PrayerRequestCategory,
  PrayerRequestPreferredPeriod,
  PrayerRequestStatus,
} from '../types';
import { toSentenceCase, formatDateTime } from '../utils/format';
import styles from '../styles/attention.module.css';

const STATUS_COLOR: Record<PrayerRequestStatus, string> = {
  PENDING: 'orange',
  PRAYING: 'blue',
  VISIT_SCHEDULED: 'violet',
  ANSWERED: 'teal',
  ARCHIVED: 'gray',
};

const STATUS_OPTIONS: PrayerRequestStatus[] = [
  'PENDING',
  'PRAYING',
  'VISIT_SCHEDULED',
  'ANSWERED',
  'ARCHIVED',
];

const CATEGORY_COLOR: Record<PrayerRequestCategory, string> = {
  HEALTH: 'red',
  FAMILY: 'pink',
  SPIRITUAL: 'violet',
  FINANCIAL: 'green',
  GRIEF: 'gray',
  THANKSGIVING: 'teal',
  OTHER: 'blue',
};

const KANBAN_STATUSES = ['PENDING', 'PRAYING', 'VISIT_SCHEDULED', 'ANSWERED'] as const;

const NEXT_STATUS: Partial<Record<PrayerRequestStatus, PrayerRequestStatus>> = {
  PENDING: 'PRAYING',
  PRAYING: 'VISIT_SCHEDULED',
  VISIT_SCHEDULED: 'ANSWERED',
};

const AVATAR_COLORS = ['blue', 'teal', 'violet', 'pink', 'orange', 'cyan', 'grape'];

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const avatarColor = (id: number) => AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];

const displayName = (r: PrayerRequest) =>
  r.is_anonymous ? 'Anônimo (Sigilo)' : r.requester_name || 'Sem nome';

const whatsappName = (r: PrayerRequest) =>
  r.is_anonymous ? 'irmão(ã)' : r.requester_name || 'irmão(ã)';

const buildWhatsAppLink = (phone: string, name: string): string | null => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  if (normalized.length < 12) return null;
  const msg = encodeURIComponent(
    `A paz do Senhor, ${name}! Recebemos seu pedido de oração no ministério da Igreja de Deus no Brasil. Estamos intercedendo por você e sua família. Como podemos te apoiar melhor?`
  );
  return `https://wa.me/${normalized}?text=${msg}`;
};

export default function PrayerRequestsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isCompact = useIsCompactList();
  const { colorScheme } = useMantineColorScheme();

  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [wantsVisitOnly, setWantsVisitOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [drawerRequest, setDrawerRequest] = useState<PrayerRequest | null>(null);
  const [drawerNotesDraft, setDrawerNotesDraft] = useState('');
  const [savingDrawerNotes, setSavingDrawerNotes] = useState(false);
  const [intercessors, setIntercessors] = useState<PrayerRequestAssignee[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<PrayerRequest | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrayerRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulking, setBulking] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // "Novo / Aguardando" é o que precisa de atenção: ganha borda colorida e
  // pulso para não passar despercebido na triagem.
  const isPendingAttention = (r: PrayerRequest) => r.status === 'PENDING';
  const pendingCardClass = (r: PrayerRequest) =>
    isPendingAttention(r)
      ? `${styles.attentionCard} ${colorScheme === 'dark' ? styles.attentionCardDark : ''}`
      : undefined;
  const newDotClass = () =>
    `${styles.attentionDot} ${colorScheme === 'dark' ? styles.attentionDotDark : ''}`;

  const load = () => {
    setLoading(true);
    accountsApi
      .prayerRequestsPage({
        q: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as PrayerRequestStatus),
        category: categoryFilter === 'ALL' ? undefined : (categoryFilter as PrayerRequestCategory),
        preferred_period:
          periodFilter === 'ALL' ? undefined : (periodFilter as PrayerRequestPreferredPeriod),
        wants_visit: wantsVisitOnly ? true : undefined,
        page,
        page_size: pageSize,
      })
      .then((data) => {
        setRequests(data.results);
        setTotal(data.count);
      })
      .catch(() => {
        notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.genericError });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user?.church?.id) return;
    accountsApi
      .prayerRequestAssignees()
      .then(setIntercessors)
      .catch(() => setIntercessors([]));
  }, [user]);

  useEffect(() => {
    const delay = window.setTimeout(load, 300);
    return () => window.clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, periodFilter, wantsVisitOnly, search, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, periodFilter, wantsVisitOnly, search]);

  const stats = useMemo(() => {
    const count = (s: PrayerRequestStatus) => requests.filter((r) => r.status === s).length;
    return [
      { key: 'pending', label: t.prayerRequestsPage.pending, value: count('PENDING'), color: 'orange' },
      { key: 'praying', label: t.prayerRequestsPage.praying, value: count('PRAYING'), color: 'blue' },
      { key: 'scheduled', label: t.prayerRequestsPage.scheduledVisits, value: count('VISIT_SCHEDULED'), color: 'violet' },
      { key: 'answered', label: t.prayerRequestsPage.answered, value: count('ANSWERED'), color: 'teal' },
      { key: 'visit', label: t.prayerRequestsPage.needsVisit, value: requests.filter((r) => r.wants_visit).length, color: 'red' },
    ];
  }, [requests, t]);

  const answeredCount = useMemo(
    () => requests.filter((r) => r.status === 'ANSWERED').length,
    [requests]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filterCount = [
    statusFilter !== 'ALL',
    categoryFilter !== 'ALL',
    periodFilter !== 'ALL',
    wantsVisitOnly,
  ].filter(Boolean).length;

  const intercessorOptions = useMemo(
    () => intercessors.map((m) => ({ value: String(m.id), label: m.name })),
    [intercessors]
  );

  const assigneeOptions = useMemo(() => {
    if (!drawerRequest?.assigned_to || !drawerRequest.assigned_to_name) {
      return intercessorOptions;
    }
    const known = intercessorOptions.some(
      (o) => o.value === String(drawerRequest.assigned_to)
    );
    return known
      ? intercessorOptions
      : [
          ...intercessorOptions,
          { value: String(drawerRequest.assigned_to), label: drawerRequest.assigned_to_name },
        ];
  }, [intercessorOptions, drawerRequest?.assigned_to, drawerRequest?.assigned_to_name]);

  const applyUpdated = (updated: PrayerRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDrawerRequest((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const changeStatus = async (id: number, status: PrayerRequestStatus) => {
    try {
      const updated = await accountsApi.updatePrayerRequest(id, { status });
      applyUpdated(updated);
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    }
  };

  const openDrawer = (r: PrayerRequest) => {
    setDrawerRequest(r);
    setDrawerNotesDraft(r.pastoral_notes ?? '');
  };

  const closeDrawer = () => {
    setDrawerRequest(null);
    setDrawerNotesDraft('');
  };

  const assignIntercessor = async (id: number, assignedTo: number | null) => {
    try {
      const updated = await accountsApi.updatePrayerRequest(id, { assigned_to: assignedTo });
      applyUpdated(updated);
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    }
  };

  const changeWantsVisit = async (id: number, wantsVisit: boolean) => {
    try {
      const updated = await accountsApi.updatePrayerRequest(id, { wants_visit: wantsVisit });
      applyUpdated(updated);
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    }
  };

  const saveDrawerNotes = async () => {
    if (!drawerRequest) return;
    setSavingDrawerNotes(true);
    try {
      const updated = await accountsApi.updatePrayerRequest(drawerRequest.id, {
        pastoral_notes: toSentenceCase(drawerNotesDraft),
      });
      applyUpdated(updated);
      notifications.show({ color: 'green', message: t.prayerRequestsPage.drawer.notesSaved });
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    } finally {
      setSavingDrawerNotes(false);
    }
  };

  const scheduleVisit = (id: number) => {
    router.push(`/visitation?fromPrayer=${id}`);
  };

  const printSheet = async () => {
    try {
      const blob = await accountsApi.printPrayerSheet();
      saveBlob(blob, `caderno-oracao-${new Date().toISOString().slice(0, 10)}.pdf`);
      notifications.show({ color: 'green', message: t.prayerRequestsPage.actions.printSheetDone });
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.genericError });
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const updated = await accountsApi.updatePrayerRequest(archiveTarget.id, {
        status: 'ARCHIVED',
      });
      setRequests((prev) => prev.filter((r) => r.id !== updated.id));
      setTotal((value) => Math.max(0, value - 1));
      setArchiveTarget(null);
      closeDrawer();
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    } finally {
      setArchiving(false);
    }
  };

  const bulkClearAnswered = async () => {
    const targets = requests.filter((r) => r.status === 'ANSWERED');
    if (targets.length === 0) return;
    setBulking(true);
    try {
      await Promise.all(
        targets.map((r) => accountsApi.updatePrayerRequest(r.id, { status: 'ARCHIVED' }))
      );
      setBulkOpen(false);
      closeDrawer();
      setRequests((prev) =>
        prev.filter((r) => r.status !== 'ANSWERED')
      );
      setTotal((value) => Math.max(0, value - targets.length));
      notifications.show({
        color: 'green',
        message: t.prayerRequestsPage.actions.clearAnsweredDone,
      });
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.genericError });
    } finally {
      setBulking(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await accountsApi.deletePrayerRequest(deleteTarget.id);
      setRequests((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setTotal((value) => Math.max(0, value - 1));
      setDeleteTarget(null);
      closeDrawer();
      notifications.show({ color: 'green', message: t.prayerRequestsPage.actions.deleteDone });
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.genericError });
    } finally {
      setDeleting(false);
    }
  };

  const categoryOptions = [
    { value: 'ALL', label: t.prayerRequestsPage.allCategories },
    ...Object.entries(t.prayerRequestsPage.categoryLabel).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  const statusOptions = [
    { value: 'ALL', label: t.prayerRequestsPage.allStatus },
    ...STATUS_OPTIONS.map((s) => ({
      value: s,
      label: t.prayerRequestsPage.statusLabel[s],
    })),
  ];

  const statusSelectData = STATUS_OPTIONS.map((s) => ({
    value: s,
    label: t.prayerRequestsPage.statusLabel[s],
  }));

  const periodOptions = [
    { value: 'ALL', label: t.prayerRequestsPage.allPeriods },
    ...Object.entries(t.prayerRequestsPage.periodLabel).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  const viewToggleControl = (
    <SegmentedControl
      value={viewMode}
      onChange={(v) => setViewMode(v as 'list' | 'kanban')}
      data={[
        {
          value: 'list',
          label: (
            <Group gap={6} wrap="nowrap">
              <IconLayoutList size={15} />
              <Text size="sm">{t.prayerRequestsPage.viewToggle.list}</Text>
            </Group>
          ),
        },
        {
          value: 'kanban',
          label: (
            <Group gap={6} wrap="nowrap">
              <IconLayoutKanban size={15} />
              <Text size="sm">{t.prayerRequestsPage.viewToggle.kanban}</Text>
            </Group>
          ),
        },
      ]}
    />
  );

  const compactViewToggle = (
    <SegmentedControl
      size="xs"
      fullWidth
      value={viewMode}
      onChange={(v) => setViewMode(v as 'list' | 'kanban')}
      data={[
        {
          value: 'list',
          label: (
            <Group gap={6} wrap="nowrap">
              <IconLayoutList size={15} />
              <Text size="sm">{t.prayerRequestsPage.viewToggle.list}</Text>
            </Group>
          ),
        },
        {
          value: 'kanban',
          label: (
            <Group gap={6} wrap="nowrap">
              <IconLayoutKanban size={15} />
              <Text size="sm">{t.prayerRequestsPage.viewToggle.kanban}</Text>
            </Group>
          ),
        },
      ]}
    />
  );

  return (
    <AuthGuard roles={['INTERCESSAO', 'PASTOR', 'SECRETARIA']}>
      <>
        <PageHeader title={t.prayerRequestsPage.title} description={t.prayerRequestsPage.subtitle}>
          {isCompact ? (
            <MobileListToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={t.prayerRequestsPage.searchPlaceholder}
              filtersLabel={t.prayerRequestsPage.filterTitle}
              onOpenFilters={() => setFiltersOpen(true)}
              filterCount={filterCount}
              primary={
                <Button
                  size="sm"
                  px="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t.prayerRequestsPage.createNew}
                </Button>
              }
              menuChildren={
                <>
                  <Menu.Item leftSection={<IconPrinter size={15} />} onClick={printSheet}>
                    {t.prayerRequestsPage.actions.printSheet}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconEraser size={15} />}
                    color={answeredCount > 0 ? 'red' : 'dimmed'}
                    disabled={answeredCount === 0}
                    onClick={() => setBulkOpen(true)}
                  >
                    {t.prayerRequestsPage.actions.clearAnswered}
                  </Menu.Item>
                </>
              }
              menuLabel={t.prayerRequestsPage.title}
              testId="prayer-toolbar"
            />
          ) : (
            <Group gap="sm">
              <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
                {t.prayerRequestsPage.createNew}
              </Button>
              <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={printSheet}>
                {t.prayerRequestsPage.actions.printSheet}
              </Button>
            </Group>
          )}
        </PageHeader>

        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm" mb="md">
          {stats.map((s) => (
            <Paper
              key={s.key}
              withBorder
              p="xs"
              radius="md"
              style={{ textAlign: 'center' }}
            >
              <Text fw={700} size="xl" c={s.color}>
                {s.value}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {s.label}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>

        {isCompact ? (
          <Box mb="md">{compactViewToggle}</Box>
        ) : (
          <Paper withBorder p="sm" radius="md" mb="md">
            <Group gap="sm" align="flex-end" wrap="wrap">
              <TextInput
                leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder={t.prayerRequestsPage.searchPlaceholder}
              style={{ flex: 1, minWidth: 220 }}
            />
            <Select
              data={statusOptions}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v ?? 'ALL')}
              allowDeselect={false}
              w={200}
              aria-label="Status"
            />
            <Select
              data={categoryOptions}
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v ?? 'ALL')}
              allowDeselect={false}
              w={200}
              aria-label="Category"
            />
            <Switch
              label={t.prayerRequestsPage.wantsVisitOnly}
              checked={wantsVisitOnly}
              onChange={(e) => setWantsVisitOnly(e.currentTarget.checked)}
            />
            <Box style={{ flexShrink: 0 }}>
              {viewToggleControl}
            </Box>
          </Group>
          {statusFilter === 'ALL' ? (
            <Text size="xs" c="dimmed" mt={6}>
              {t.prayerRequestsPage.archivedHiddenHint}
            </Text>
          ) : null}
          </Paper>
        )}

        {loading ? (
          <Loader mt="xl" />
        ) : requests.length === 0 ? (
          <Stack align="center" gap="xs" mt="xl">
            <Text fw={600}>{t.prayerRequestsPage.empty}</Text>
            <Text size="sm" c="dimmed">
              {t.prayerRequestsPage.emptyHint}
            </Text>
            {filterCount > 0 ? (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                  setPeriodFilter('ALL');
                  setWantsVisitOnly(false);
                }}
              >
                {t.common.clearFilters}
              </Button>
            ) : null}
          </Stack>
        ) : viewMode === 'list' ? (
          <Stack gap="sm" maw={960}>
            {requests.map((r) => {
              const wa = buildWhatsAppLink(r.requester_phone, whatsappName(r));
              return (
                <Paper
                  key={r.id}
                  withBorder
                  p="md"
                  radius="md"
                  mb="sm"
                  shadow="xs"
                  className={pendingCardClass(r)}
                  data-testid={`prayer-card-${r.id}`}
                  data-pending={isPendingAttention(r) ? 'true' : undefined}
                >
                  <Stack gap={8}>
                    <Group
                      justify="space-between"
                      align="flex-start"
                      mb="xs"
                      wrap="nowrap"
                      gap="xs"
                    >
                      <Group gap="xs" wrap="wrap" style={{ minWidth: 0, flex: 1 }}>
                        {isPendingAttention(r) ? (
                          <span className={newDotClass()} aria-hidden />
                        ) : null}
                        <Text fw={600} size="sm">
                          {displayName(r)}
                        </Text>
                        {isPendingAttention(r) ? (
                          <Badge color="orange" variant="filled" size="xs">
                            {t.prayerRequestsPage.needsAttention}
                          </Badge>
                        ) : null}
                        <Text size="xs" c="dimmed">
                          {t.prayerRequestsPage.createdSince.replace(
                            '{days}',
                            String(r.elapsed_days)
                          )}
                        </Text>
                        <Badge variant="light" color={CATEGORY_COLOR[r.category]} size="xs">
                          {r.category_display}
                        </Badge>
                        {r.wants_visit ? (
                          <Badge
                            variant="light"
                            color="pink"
                            size="xs"
                            leftSection={<IconHeartHandshake size={10} />}
                          >
                            {t.prayerRequestsPage.requestsVisit}
                          </Badge>
                        ) : null}
                      </Group>
                      <Badge
                        variant="dot"
                        size="sm"
                        color={STATUS_COLOR[r.status]}
                        style={{ flexShrink: 0 }}
                      >
                        {r.status_display}
                      </Badge>
                    </Group>

                    <Text
                      size="sm"
                      mb={0}
                      lineClamp={expandedIds.has(r.id) ? undefined : 3}
                      style={{
                        whiteSpace: 'pre-wrap',
                        color: 'var(--mantine-color-gray-7)',
                        cursor: 'pointer',
                      }}
                      onClick={() => openDrawer(r)}
                    >
                      {r.description}
                    </Text>
                    {r.description.length > 140 ? (
                      <Button
                        size="xs"
                        variant="subtle"
                        px={0}
                        onClick={() =>
                          setExpandedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) {
                              next.delete(r.id);
                            } else {
                              next.add(r.id);
                            }
                            return next;
                          })
                        }
                      >
                        {expandedIds.has(r.id) ? t.common.readLess : t.common.readMore}
                      </Button>
                    ) : null}
                    <Group gap="xs" wrap="wrap">
                      {r.status === 'PENDING' ? (
                        <Button
                          size="xs"
                          radius="xl"
                          variant="filled"
                          color="blue"
                          onClick={() => changeStatus(r.id, 'PRAYING')}
                          data-testid={`prayer-pill-${r.id}`}
                        >
                          {t.prayerRequestsPage.actions.quickPray}
                        </Button>
                      ) : r.status === 'PRAYING' ? (
                        <Button
                          size="xs"
                          radius="xl"
                          variant="filled"
                          color="teal"
                          onClick={() => changeStatus(r.id, 'ANSWERED')}
                          data-testid={`prayer-pill-${r.id}`}
                        >
                          {t.prayerRequestsPage.actions.quickAnswer}
                        </Button>
                      ) : null}
                    </Group>

                    <Group justify="space-between" wrap="wrap" gap="xs">
                      <Group gap="xs" wrap="wrap">
                        {r.requester_phone ? (
                          <Group gap={4}>
                            <IconPhone
                              size={13}
                              style={{ color: 'var(--mantine-color-gray-5)' }}
                            />
                            <Text size="xs">{r.requester_phone}</Text>
                          </Group>
                        ) : null}
                        {r.neighborhood ? (
                          <Group gap={4}>
                            <IconMapPin
                              size={13}
                              style={{ color: 'var(--mantine-color-gray-5)' }}
                            />
                            <Text size="xs">{r.neighborhood}</Text>
                          </Group>
                        ) : null}
                      </Group>

                      <Group gap="xs" wrap="nowrap">
                        <Tooltip
                          label={
                            wa
                              ? t.prayerRequestsPage.actions.whatsapp
                              : t.prayerRequestsPage.drawer.noPhone
                          }
                          disabled={!!wa}
                        >
                          <Box component="span" style={{ display: 'inline-flex' }}>
                            <ActionIcon
                              variant="light"
                              color="teal"
                              size="sm"
                              disabled={!wa}
                              onClick={() =>
                                wa && window.open(wa, '_blank', 'noopener,noreferrer')
                              }
                            >
                              <IconBrandWhatsapp size={16} />
                            </ActionIcon>
                          </Box>
                        </Tooltip>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconUserCheck size={14} />}
                          onClick={() => openDrawer(r)}
                        >
                          {t.prayerRequestsPage.drawer.details}
                        </Button>
                      </Group>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
            {KANBAN_STATUSES.map((st) => {
              const items = requests.filter((r) => r.status === st);
              const color = STATUS_COLOR[st];
              return (
                <Stack key={st} gap="xs">
                  <Paper
                    p="xs"
                    withBorder
                    style={{ borderTop: `3px solid var(--mantine-color-${color}-6)` }}
                  >
                    <Group justify="space-between">
                      <Group gap={6}>
                        <Box
                          w={10}
                          h={10}
                          style={{
                            borderRadius: 9999,
                            background: `var(--mantine-color-${color}-6)`,
                          }}
                        />
                        <Text size="sm" fw={600}>
                          {t.prayerRequestsPage.statusGroup[st]}
                        </Text>
                      </Group>
                      <Badge variant="light" color={color} size="sm">
                        {items.length}
                      </Badge>
                    </Group>
                  </Paper>
                  {items.length === 0 ? (
                    <Paper p="md" withBorder style={{ borderStyle: 'dashed' }} ta="center">
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    </Paper>
                  ) : (
                    <Stack gap="xs">
                      {items.map((r) => {
                        const wa = buildWhatsAppLink(r.requester_phone, whatsappName(r));
                        return (
                          <Card
                            key={r.id}
                            withBorder
                            radius="md"
                            p="xs"
                            className={pendingCardClass(r)}
                            style={{ cursor: 'pointer' }}
                            onClick={() => openDrawer(r)}
                            data-testid={`prayer-kanban-card-${r.id}`}
                            data-pending={isPendingAttention(r) ? 'true' : undefined}
                          >
                            <Stack gap={6}>
                              <Group gap="xs" wrap="nowrap" align="flex-start">
                                {isPendingAttention(r) ? (
                                  <span
                                    className={newDotClass()}
                                    style={{ marginTop: 8 }}
                                    aria-hidden
                                  />
                                ) : null}
                                <Avatar size={26} radius="xl" color={avatarColor(r.id)}>
                                  {getInitials(displayName(r))}
                                </Avatar>
                                <Text
                                  size="sm"
                                  fw={600}
                                  lineClamp={1}
                                  style={{ flex: 1, minWidth: 0 }}
                                >
                                  {displayName(r)}
                                </Text>
                                {wa ? (
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="green"
                                    component="a"
                                    href={wa}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  >
                                    <IconBrandWhatsapp size={15} />
                                  </ActionIcon>
                                ) : null}
                                <Tooltip label={t.prayerRequestsPage.drawer.advanceStatus}>
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color={color}
                                    disabled={!NEXT_STATUS[r.status]}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const next = NEXT_STATUS[r.status];
                                      if (next) changeStatus(r.id, next);
                                    }}
                                  >
                                    <IconChevronRight size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                              <Group gap={4}>
                                <Badge variant="light" color="gray" size="xs">
                                  {r.category_display}
                                </Badge>
                                {r.wants_visit ? (
                                  <Badge variant="light" color="red" size="xs">
                                    {t.prayerRequestsPage.requestsVisit}
                                  </Badge>
                                ) : null}
                              </Group>
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {r.description}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {t.prayerRequestsPage.createdSince.replace(
                                  '{days}',
                                  String(r.elapsed_days)
                                )}
                              </Text>
                            </Stack>
                          </Card>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              );
            })}
          </SimpleGrid>
        )}

        <ListPagination
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          total={total}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          testId="prayer-pagination"
        />

        <FilterDrawer
          opened={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t.prayerRequestsPage.filterTitle}
          clearLabel={t.common.clearFilters}
          clearDisabled={filterCount === 0}
          onClear={() => {
            setStatusFilter('ALL');
            setCategoryFilter('ALL');
            setPeriodFilter('ALL');
            setWantsVisitOnly(false);
          }}
          testId="prayer-filters"
        >
          <Select
            label={t.prayerRequestsPage.allStatus}
            data={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v ?? 'ALL')}
            allowDeselect={false}
          />
          <Select
            label={t.prayerRequestsPage.allCategories}
            data={categoryOptions}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v ?? 'ALL')}
            allowDeselect={false}
          />
          <Select
            label={t.prayerRequestsPage.allPeriods}
            data={periodOptions}
            value={periodFilter}
            onChange={(v) => setPeriodFilter(v ?? 'ALL')}
            allowDeselect={false}
          />
          <Switch
            label={t.prayerRequestsPage.wantsVisitOnly}
            checked={wantsVisitOnly}
            onChange={(e) => setWantsVisitOnly(e.currentTarget.checked)}
          />
        </FilterDrawer>

        <Drawer
          opened={!!drawerRequest}
          onClose={closeDrawer}
          position={isCompact ? 'bottom' : 'right'}
          size={isCompact ? '100%' : 'lg'}
          title={drawerRequest ? displayName(drawerRequest) : ''}
          padding="md"
          styles={{ body: { paddingBottom: 24 } }}
        >
          {drawerRequest ? (
            <Stack gap="md">
              <Group gap="xs" wrap="wrap">
                <Badge variant="light" color={STATUS_COLOR[drawerRequest.status]} size="sm">
                  {drawerRequest.status_display}
                </Badge>
                <Badge variant="outline" size="sm">
                  {drawerRequest.category_display}
                </Badge>
                {drawerRequest.wants_visit ? (
                  <Badge color="red" size="sm" leftSection={<IconHeartHandshake size={11} />}>
                    {t.prayerRequestsPage.requestsVisit}
                  </Badge>
                ) : null}
              </Group>

              <Group gap={4}>
                <IconCalendarCheck size={13} style={{ color: 'var(--mantine-color-gray-5)' }} />
                <Text size="xs" c="dimmed">
                  {formatDateTime(drawerRequest.created_at, locale)}
                </Text>
                <Text size="xs" c="dimmed">
                  ·
                </Text>
                <Text size="xs" c="dimmed">
                  {t.prayerRequestsPage.createdSince.replace(
                    '{days}',
                    String(drawerRequest.elapsed_days)
                  )}
                </Text>
              </Group>

              <Paper withBorder p="sm">
                <Stack gap={8}>
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                    {t.prayerRequestsPage.drawer.contactInfo}
                  </Text>
                  <Group gap={8} wrap="wrap" align="center">
                    <IconPhone size={15} style={{ color: 'var(--mantine-color-gray-5)' }} />
                    {drawerRequest.requester_phone ? (
                      <Group gap={6} wrap="nowrap">
                        <Text
                          component="a"
                          href={`tel:${drawerRequest.requester_phone.replace(/\D/g, '')}`}
                          size="sm"
                        >
                          {drawerRequest.requester_phone}
                        </Text>
                        {buildWhatsAppLink(
                          drawerRequest.requester_phone,
                          whatsappName(drawerRequest)
                        ) ? (
                          <Button
                            size="xs"
                            variant="filled"
                            color="green"
                            px={8}
                            component="a"
                            href={buildWhatsAppLink(
                              drawerRequest.requester_phone,
                              whatsappName(drawerRequest)
                            ) as string}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <IconBrandWhatsapp size={15} />
                          </Button>
                        ) : null}
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t.prayerRequestsPage.drawer.noPhone}
                      </Text>
                    )}
                  </Group>
                  <Group gap={8} wrap="wrap">
                    <IconMapPin size={15} style={{ color: 'var(--mantine-color-gray-5)' }} />
                    <Text size="sm">
                      {[
                        [drawerRequest.street, drawerRequest.number].filter(Boolean).join(', '),
                        drawerRequest.complement,
                        [drawerRequest.neighborhood, drawerRequest.city]
                          .filter(Boolean)
                          .join(' — '),
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                  </Group>
                  <Group gap={8} wrap="wrap">
                    <IconClock size={15} style={{ color: 'var(--mantine-color-gray-5)' }} />
                    <Text size="sm">{drawerRequest.preferred_period_display}</Text>
                  </Group>
                  <Switch
                    size="sm"
                    label={t.prayerRequestsPage.drawer.wantsVisitToggle}
                    checked={drawerRequest.wants_visit}
                    onChange={(e) =>
                      changeWantsVisit(drawerRequest.id, e.currentTarget.checked)
                    }
                  />
                </Stack>
              </Paper>

              <Paper
                p="sm"
                style={{
                  background:
                    colorScheme === 'dark'
                      ? 'var(--mantine-color-dark-6)'
                      : 'var(--mantine-color-blue-0)',
                  borderLeft: '3px solid var(--mantine-color-blue-4)',
                }}
              >
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>
                  {t.prayerRequestsPage.drawer.fullRequest}
                </Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {drawerRequest.description}
                </Text>
              </Paper>

              <Group align="flex-end" gap="xs" wrap="wrap">
                <Select
                  label={t.prayerRequestsPage.drawer.assignIntercessor}
                  placeholder={t.prayerRequestsPage.drawer.assignIntercessor}
                  data={assigneeOptions}
                  value={drawerRequest.assigned_to != null ? String(drawerRequest.assigned_to) : null}
                  onChange={(v) =>
                    assignIntercessor(drawerRequest.id, v ? Number(v) : null)
                  }
                  clearable
                  leftSection={<IconUser size={15} />}
                  style={{ flex: 1, minWidth: 190 }}
                />
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={!user?.id}
                  onClick={() => user?.id && assignIntercessor(drawerRequest.id, user.id)}
                >
                  {t.prayerRequestsPage.assignedToSelf}
                </Button>
              </Group>

              <Select
                label={t.prayerRequestsPage.drawer.changeStatus}
                data={statusSelectData}
                value={drawerRequest.status}
                onChange={(v) => v && changeStatus(drawerRequest.id, v as PrayerRequestStatus)}
                allowDeselect={false}
              />

              <Button
                fullWidth
                variant="light"
                color="violet"
                leftSection={<IconCalendarPlus size={16} />}
                onClick={() => scheduleVisit(drawerRequest.id)}
              >
                {t.prayerRequestsPage.drawer.scheduleVisit}
              </Button>

              <Divider my={2} />

              <Stack gap={6}>
                <Text size="sm" fw={600}>
                  {t.prayerRequestsPage.notesPlaceholder}
                </Text>
                <Textarea
                  value={drawerNotesDraft}
                  onChange={(e) => setDrawerNotesDraft(e.currentTarget.value)}
                  minRows={4}
                  maxRows={8}
                  maxLength={1000}
                  autosize
                />
                <Group justify="flex-end" wrap="wrap">
                  <Button size="xs" loading={savingDrawerNotes} onClick={saveDrawerNotes}>
                    {t.prayerRequestsPage.drawer.saveNotes}
                  </Button>
                </Group>
              </Stack>

              <Divider my={2} />

              <Group justify="space-between" gap="xs" wrap="wrap">
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconArchive size={16} />}
                  onClick={() => setArchiveTarget(drawerRequest)}
                >
                  {t.prayerRequestsPage.actions.archive}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setDeleteTarget(drawerRequest)}
                  data-testid="prayer-delete"
                >
                  {t.prayerRequestsPage.actions.delete}
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Drawer>

        <Modal
          opened={!!archiveTarget}
          onClose={() => setArchiveTarget(null)}
          title={t.prayerRequestsPage.actions.archive}
          centered
        >
          <Stack>
            <Text size="sm">{t.prayerRequestsPage.actions.archiveConfirm}</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setArchiveTarget(null)}>
                {t.common.cancel}
              </Button>
              <Button color="red" loading={archiving} onClick={confirmArchive}>
                {t.prayerRequestsPage.actions.archive}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={t.prayerRequestsPage.actions.delete}
          centered
        >
          <Stack>
            <Text size="sm">{t.prayerRequestsPage.actions.deleteConfirm}</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDeleteTarget(null)}>
                {t.common.cancel}
              </Button>
              <Button
                color="red"
                loading={deleting}
                onClick={confirmDelete}
                leftSection={<IconTrash size={16} />}
                data-testid="prayer-delete-confirm"
              >
                {t.prayerRequestsPage.actions.delete}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <CreatePrayerRequestModal
          opened={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />

        <Modal
          opened={bulkOpen}
          onClose={() => setBulkOpen(false)}
          title={t.prayerRequestsPage.actions.clearAnswered}
          centered
        >
          <Stack>
            <Text size="sm">{t.prayerRequestsPage.actions.clearAnsweredConfirm}</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setBulkOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                color="red"
                loading={bulking}
                leftSection={<IconEraser size={16} />}
                onClick={bulkClearAnswered}
                data-testid="prayer-bulk-clear"
              >
                {t.prayerRequestsPage.actions.clearAnswered}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </>
    </AuthGuard>
  );
}
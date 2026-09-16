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
  Loader,
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
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArchive,
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
  IconPrinter,
  IconSearch,
  IconUser,
  IconUserCheck,
} from '@tabler/icons-react';
import AuthGuard from '../components/AuthGuard';
import PageHeader from '../components/PageHeader';
import { accountsApi } from '../api/accounts';
import { saveBlob } from '../api/finance';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import type {
  ChurchMembership,
  PrayerRequest,
  PrayerRequestCategory,
  PrayerRequestStatus,
} from '../types';

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

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
};

export default function PrayerRequestsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { colorScheme } = useMantineColorScheme();

  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [wantsVisitOnly, setWantsVisitOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [drawerRequest, setDrawerRequest] = useState<PrayerRequest | null>(null);
  const [drawerNotesDraft, setDrawerNotesDraft] = useState('');
  const [savingDrawerNotes, setSavingDrawerNotes] = useState(false);
  const [intercessors, setIntercessors] = useState<ChurchMembership[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<PrayerRequest | null>(null);
  const [archiving, setArchiving] = useState(false);

  const load = () => {
    setLoading(true);
    accountsApi
      .prayerRequests({
        q: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as PrayerRequestStatus),
        category: categoryFilter === 'ALL' ? undefined : (categoryFilter as PrayerRequestCategory),
        wants_visit: wantsVisitOnly ? true : undefined,
      })
      .then(setRequests)
      .catch(() => {
        notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.genericError });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user?.church?.id) return;
    accountsApi
      .churchUsers(user.church.id)
      .then(setIntercessors)
      .catch(() => setIntercessors([]));
  }, [user]);

  useEffect(() => {
    const delay = window.setTimeout(load, 300);
    return () => window.clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, wantsVisitOnly, search]);

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

  const intercessorOptions = useMemo(
    () =>
      intercessors
        .filter((m) => ['INTERCESSAO', 'PASTOR', 'SECRETARIA'].includes(m.role))
        .map((m) => ({ value: String(m.user_id), label: m.user_name || m.user_email })),
    [intercessors]
  );

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
        pastoral_notes: drawerNotesDraft,
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
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setArchiveTarget(null);
      closeDrawer();
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    } finally {
      setArchiving(false);
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

  return (
    <AuthGuard roles={['INTERCESSAO', 'PASTOR', 'SECRETARIA']}>
      <>
        <PageHeader title={t.prayerRequestsPage.title} description={t.prayerRequestsPage.subtitle}>
          <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={printSheet}>
            {t.prayerRequestsPage.actions.printSheet}
          </Button>
        </PageHeader>

        <Group gap="xs" wrap="wrap" mb="md">
          {stats.map((s) => (
            <Box
              key={s.key}
              px="md"
              py="xs"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-md)',
                background: 'var(--mantine-color-default)',
              }}
            >
              <Stack gap={0} align="center">
                <Text fw={700} size="xl" c={s.color}>
                  {s.value}
                </Text>
                <Text size="xs" c="dimmed">
                  {s.label}
                </Text>
              </Stack>
            </Box>
          ))}
        </Group>

        <Group gap="sm" mb="md" align="flex-end" wrap="wrap">
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
          </Box>
        </Group>

        {loading ? (
          <Loader mt="xl" />
        ) : requests.length === 0 ? (
          <Stack align="center" gap="xs" mt="xl">
            <Text fw={600}>{t.prayerRequestsPage.empty}</Text>
            <Text size="sm" c="dimmed">
              {t.prayerRequestsPage.emptyHint}
            </Text>
          </Stack>
        ) : viewMode === 'list' ? (
          <Stack gap="sm">
            {requests.map((r) => {
              const wa = buildWhatsAppLink(r.requester_phone, whatsappName(r));
              return (
                <Card key={r.id} withBorder radius="md" p="sm">
                  <Stack gap={6}>
                    <Group justify="space-between" wrap="nowrap" align="center">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                        <Avatar size={30} radius="xl" color={avatarColor(r.id)}>
                          {getInitials(displayName(r))}
                        </Avatar>
                        <Text fw={600} size="sm" truncate style={{ minWidth: 0 }}>
                          {displayName(r)}
                        </Text>
                      </Group>
                      <Group gap={6} wrap="wrap" justify="flex-end">
                        <Badge variant="light" color="gray" size="sm">
                          {r.category_display}
                        </Badge>
                        {r.wants_visit ? (
                          <Badge
                            variant="light"
                            color="red"
                            size="sm"
                            leftSection={<IconHeartHandshake size={10} />}
                          >
                            {t.prayerRequestsPage.requestsVisit}
                          </Badge>
                        ) : null}
                        <Text size="xs" c="dimmed">
                          {t.prayerRequestsPage.createdSince.replace('{days}', String(r.elapsed_days))}
                        </Text>
                      </Group>
                    </Group>

                    <Text
                      size="sm"
                      lineClamp={2}
                      pl={10}
                      style={{
                        borderLeft: '3px solid var(--mantine-color-gray-3)',
                        color: 'var(--mantine-color-gray-7)',
                        cursor: 'pointer',
                      }}
                      onClick={() => openDrawer(r)}
                    >
                      {r.description}
                    </Text>

                    <Group gap="sm" wrap="wrap">
                      {r.requester_phone ? (
                        <Group gap={4}>
                          <IconPhone size={13} style={{ color: 'var(--mantine-color-gray-5)' }} />
                          <Text size="xs">{r.requester_phone}</Text>
                        </Group>
                      ) : null}
                      {r.neighborhood ? (
                        <Group gap={4}>
                          <IconMapPin size={13} style={{ color: 'var(--mantine-color-gray-5)' }} />
                          <Text size="xs">{r.neighborhood}</Text>
                        </Group>
                      ) : null}
                      <Group gap={4}>
                        <IconClock size={13} style={{ color: 'var(--mantine-color-gray-5)' }} />
                        <Text size="xs">{r.preferred_period_display}</Text>
                      </Group>
                    </Group>

                    <Divider my={2} />

                    <Group justify="space-between" wrap="wrap">
                      <Group gap="xs" wrap="wrap">
                        <Select
                          value={r.status}
                          onChange={(v) => v && changeStatus(r.id, v as PrayerRequestStatus)}
                          data={statusSelectData}
                          size="xs"
                          w={180}
                          allowDeselect={false}
                          aria-label="Status"
                        />
                        {r.assigned_to_name ? (
                          <Group gap={6}>
                            <Avatar
                              size={20}
                              radius="xl"
                              color={avatarColor(r.assigned_to ?? r.id)}
                              styles={{ placeholder: { fontSize: 8 } }}
                            >
                              {getInitials(r.assigned_to_name)}
                            </Avatar>
                            <Text size="xs" c="dimmed" lineClamp={1} maw={120}>
                              {r.assigned_to_name}
                            </Text>
                          </Group>
                        ) : (
                          <Group gap={6}>
                            <Avatar size={20} radius="xl" color="gray">
                              <IconUser size={12} />
                            </Avatar>
                            <Text size="xs" c="dimmed">
                              —
                            </Text>
                          </Group>
                        )}
                      </Group>

                      <Group gap={6}>
                        <Tooltip
                          label={
                            wa
                              ? t.prayerRequestsPage.actions.whatsapp
                              : t.prayerRequestsPage.drawer.noPhone
                          }
                          disabled={!!wa}
                        >
                          <Box component="span" style={{ display: 'inline-flex' }}>
                            <Button
                              size="xs"
                              color="green"
                              variant="filled"
                              px={8}
                              disabled={!wa}
                              onClick={() =>
                                wa && window.open(wa, '_blank', 'noopener,noreferrer')
                              }
                            >
                              <IconBrandWhatsapp size={15} />
                            </Button>
                          </Box>
                        </Tooltip>
                        <Button
                          size="xs"
                          variant="filled"
                          leftSection={<IconUserCheck size={14} />}
                          onClick={() => openDrawer(r)}
                        >
                          {t.prayerRequestsPage.drawer.details}
                        </Button>
                      </Group>
                    </Group>
                  </Stack>
                </Card>
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
                            style={{ cursor: 'pointer' }}
                            onClick={() => openDrawer(r)}
                          >
                            <Stack gap={6}>
                              <Group gap="xs" wrap="nowrap" align="flex-start">
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

        <Drawer
          opened={!!drawerRequest}
          onClose={closeDrawer}
          position={isMobile ? 'bottom' : 'right'}
          size={isMobile ? '100%' : 'lg'}
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
                  {formatDateTime(drawerRequest.created_at)}
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
                      {[drawerRequest.neighborhood, drawerRequest.city]
                        .filter(Boolean)
                        .join(' — ') || '—'}
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
                  data={intercessorOptions}
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

              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconArchive size={16} />}
                onClick={() => setArchiveTarget(drawerRequest)}
              >
                {t.prayerRequestsPage.actions.archive}
              </Button>
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
      </>
    </AuthGuard>
  );
}
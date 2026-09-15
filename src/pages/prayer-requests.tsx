import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArchive,
  IconBrandWhatsapp,
  IconCalendarCheck,
  IconHeartHandshake,
  IconMapPin,
  IconPhone,
  IconPrinter,
  IconSearch,
  IconUserCheck,
} from '@tabler/icons-react';
import AuthGuard from '../components/AuthGuard';
import PageHeader from '../components/PageHeader';
import { accountsApi } from '../api/accounts';
import { saveBlob } from '../api/finance';
import { useLanguage } from '../i18n';
import type {
  PrayerRequest,
  PrayerRequestCategory,
  PrayerRequestStatus,
} from '../types';

const STATUS_COLOR: Record<PrayerRequestStatus, string> = {
  PENDING: 'yellow',
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

export default function PrayerRequestsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [wantsVisitOnly, setWantsVisitOnly] = useState(false);

  const [notesDrafts, setNotesDrafts] = useState<Record<number, string>>({});
  const [savingNotesId, setSavingNotesId] = useState<number | null>(null);
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
    const delay = window.setTimeout(load, 300);
    return () => window.clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, wantsVisitOnly, search]);

  const stats = useMemo(() => {
    const count = (s: PrayerRequestStatus) => requests.filter((r) => r.status === s).length;
    return [
      { key: 'total', label: t.prayerRequestsPage.total, value: requests.length, color: 'blue' },
      { key: 'pending', label: t.prayerRequestsPage.pending, value: count('PENDING'), color: 'yellow' },
      { key: 'praying', label: t.prayerRequestsPage.praying, value: count('PRAYING'), color: 'blue' },
      { key: 'scheduled', label: t.prayerRequestsPage.scheduledVisits, value: count('VISIT_SCHEDULED'), color: 'violet' },
      { key: 'answered', label: t.prayerRequestsPage.answered, value: count('ANSWERED'), color: 'teal' },
      { key: 'visit', label: t.prayerRequestsPage.needsVisit, value: requests.filter((r) => r.wants_visit).length, color: 'red' },
    ];
  }, [requests, t]);

  const changeStatus = async (id: number, status: PrayerRequestStatus) => {
    try {
      const updated = await accountsApi.updatePrayerRequest(id, { status });
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    }
  };

  const saveNotes = async (id: number) => {
    setSavingNotesId(id);
    try {
      const updated = await accountsApi.updatePrayerRequest(id, {
        pastoral_notes: notesDrafts[id] ?? '',
      });
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      notifications.show({ color: 'green', message: t.prayerRequestsPage.actions.saveNotesDone });
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    } finally {
      setSavingNotesId(null);
    }
  };

  const assignToSelf = async (id: number) => {
    try {
      const { user } = await accountsApi.me();
      const updated = await accountsApi.updatePrayerRequest(id, { assigned_to: user.id });
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      notifications.show({ color: 'red', message: t.prayerRequestsPage.actions.statusError });
    }
  };

  const openWhatsApp = async (id: number) => {
    try {
      const { url } = await accountsApi.preparePrayerWhatsApp(id);
      window.open(url, '_blank', 'noopener,noreferrer');
      notifications.show({ color: 'green', message: t.prayerRequestsPage.actions.whatsappDone });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg =
        detail === 'Solicitação sem telefone cadastrado.'
          ? t.prayerRequestsPage.actions.whatsappMissingPhone
          : t.prayerRequestsPage.actions.whatsappInvalid;
      notifications.show({ color: 'red', message: msg });
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
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 'var(--mantine-radius-md)',
                background: 'var(--mantine-color-white)',
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
          />
          <Select
            data={categoryOptions}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v ?? 'ALL')}
            allowDeselect={false}
            w={200}
          />
          <Switch
            label={t.prayerRequestsPage.wantsVisitOnly}
            checked={wantsVisitOnly}
            onChange={(e) => setWantsVisitOnly(e.currentTarget.checked)}
          />
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
        ) : (
          <Stack gap="sm">
            {requests.map((r) => (
              <Card key={r.id} withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="wrap" align="flex-start">
                    <Group gap="xs" wrap="wrap">
                      <Badge variant="light" color={STATUS_COLOR[r.status]}>
                        {r.status_display}
                      </Badge>
                      <Badge variant="outline">{r.category_display}</Badge>
                      {r.wants_visit ? (
                        <Badge color="red" leftSection={<IconHeartHandshake size={12} />}>
                          {t.prayerRequestsPage.requestsVisit}
                        </Badge>
                      ) : null}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {t.prayerRequestsPage.createdSince.replace('{days}', String(r.elapsed_days))}
                    </Text>
                  </Group>

                  <Text fw={600}>{r.is_anonymous ? 'Anônimo (Sigilo)' : r.requester_name}</Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {r.description}
                  </Text>

                  <Group gap="md" wrap="wrap">
                    {r.requester_phone ? (
                      <Group gap={4}>
                        <IconPhone size={14} color="dimmed" />
                        <Text size="xs" c="dimmed">
                          {r.requester_phone}
                        </Text>
                      </Group>
                    ) : null}
                    {r.neighborhood ? (
                      <Group gap={4}>
                        <IconMapPin size={14} color="dimmed" />
                        <Text size="xs" c="dimmed">
                          {r.neighborhood}
                        </Text>
                      </Group>
                    ) : null}
                    <Text size="xs" c="dimmed">
                      {r.preferred_period_display}
                    </Text>
                    {r.assigned_to_name ? (
                      <Group gap={4}>
                        <IconUserCheck size={14} color="dimmed" />
                        <Text size="xs" c="dimmed">
                          {t.prayerRequestsPage.assignedTo}: {r.assigned_to_name}
                        </Text>
                      </Group>
                    ) : null}
                  </Group>

                  <Select
                    value={r.status}
                    onChange={(v) => v && changeStatus(r.id, v as PrayerRequestStatus)}
                    data={STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: t.prayerRequestsPage.statusLabel[s],
                    }))}
                    size="xs"
                    w={220}
                  />

                  <Text size="sm" fw={500}>
                    {t.prayerRequestsPage.notesPlaceholder}
                  </Text>
                  <Textarea
                    value={notesDrafts[r.id] ?? r.pastoral_notes}
                    onChange={(e) =>
                      setNotesDrafts((prev) => ({ ...prev, [r.id]: e.currentTarget.value }))
                    }
                    minRows={2}
                    maxRows={4}
                    maxLength={1000}
                  />
                  <Group justify="space-between" wrap="wrap">
                    <Group gap="xs" wrap="wrap">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconUserCheck size={14} />}
                        disabled={!!r.assigned_to_name}
                        onClick={() => assignToSelf(r.id)}
                      >
                        {t.prayerRequestsPage.assignedToSelf}
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        leftSection={<IconBrandWhatsapp size={14} />}
                        disabled={!r.whatsapp_url}
                        onClick={() => openWhatsApp(r.id)}
                      >
                        {t.prayerRequestsPage.actions.whatsapp}
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="violet"
                        leftSection={<IconCalendarCheck size={14} />}
                        onClick={() => scheduleVisit(r.id)}
                      >
                        {t.prayerRequestsPage.actions.scheduleVisit}
                      </Button>
                    </Group>
                    <Group gap="xs" wrap="wrap">
                      <Button
                        size="xs"
                        variant="default"
                        loading={savingNotesId === r.id}
                        onClick={() => saveNotes(r.id)}
                      >
                        {t.prayerRequestsPage.actions.saveNotes}
                      </Button>
                      {r.status !== 'ARCHIVED' ? (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="gray"
                          leftSection={<IconArchive size={14} />}
                          onClick={() => setArchiveTarget(r)}
                        >
                          {t.prayerRequestsPage.actions.archive}
                        </Button>
                      ) : null}
                    </Group>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

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
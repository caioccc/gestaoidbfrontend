import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  SimpleGrid,
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  Skeleton,
  ThemeIcon,
  Modal,
  Divider,
  Grid,
  ActionIcon,
  Tooltip,
  Title,
  TextInput,
  Select,
  MultiSelect,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBuilding,
  IconMapPin,
  IconUser,
  IconPhone,
  IconRefresh,
  IconArrowRight,
  IconEye,
  IconCheck,
  IconX,
  IconSearch,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import AuthGuard from '../../../components/AuthGuard';
import Layout from '../../../components/Layout';
import { useLanguage } from '../../../i18n';
import { accountsApi } from '../../../api/accounts';
import { PendingChurch } from '../../../types';

const STATUS_META = {
  PENDING: { color: 'yellow', tKey: 'statusPending' as const },
  ACTIVE: { color: 'green', tKey: 'statusActive' as const },
  REJECTED: { color: 'red', tKey: 'statusRejected' as const },
};

export default function AdminChurchesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [churches, setChurches] = useState<PendingChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingChurch | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .allChurches()
      .then(setChurches)
      .catch(() => setChurches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stateOptions = useMemo(
    () =>
      Array.from(new Set(churches.map((c) => c.state).filter(Boolean))).sort().map((s) => ({
        value: s,
        label: s,
      })),
    [churches]
  );

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(churches.map((c) => c.city).filter(Boolean))).sort().map((c) => ({
        value: c,
        label: c,
      })),
    [churches]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return churches.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (stateFilter.length > 0 && !stateFilter.includes(c.state)) return false;
      if (cityFilter && c.city !== cityFilter) return false;
      if (q) {
        const fields = [
          c.pastor_name,
          c.phone,
          c.user?.name,
          c.user?.email,
          c.name,
        ];
        const hit = fields.some((f) => f && f.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [churches, statusFilter, stateFilter, cityFilter, search]);

  const openChurch = (church: PendingChurch) => {
    if (church.status === 'ACTIVE') {
      router.push(`/admin/churches/${church.id}/dashboard`);
    } else {
      setSelected(church);
    }
  };

  const runAction = async (type: 'approve' | 'reject', id: number) => {
    setBusyId(id);
    try {
      if (type === 'approve') {
        await accountsApi.approveChurch(id);
        notifications.show({ color: 'green', message: t.approvalsPage.approvedMsg });
      } else {
        await accountsApi.rejectChurch(id);
        notifications.show({ color: 'red', message: t.approvalsPage.rejectedMsg });
      }
      setSelected(null);
      load();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao executar a ação.' });
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (status: string) => {
    const meta = STATUS_META[status as keyof typeof STATUS_META] || {
      color: 'gray',
      tKey: 'statusPending' as const,
    };
    return (
      <Badge color={meta.color} variant="light">
        {t.adminChurches[meta.tKey]}
      </Badge>
    );
  };

  return (
    <AuthGuard adminOnly>
      <Layout>
        <PageHeader title={t.adminChurches.title} description={t.adminChurches.subtitle}>
          <Button
            variant="default"
            data-testid="admin-churches-refresh"
            leftSection={<IconRefresh size={16} />}
            onClick={load}
          >
            {t.common.filter}
          </Button>
        </PageHeader>

        <Card withBorder shadow="sm" p="md" mb="md">
          <Grid gap="md" align="flex-end">
            <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 4 }}>
              <TextInput
                label={t.adminChurches.filterSearchPlaceholder}
                placeholder={t.adminChurches.filterSearchPlaceholder}
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                data-testid="admin-churches-search"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3, lg: 2 }}>
              <Select
                label={t.adminChurches.filterStatus}
                placeholder={t.adminChurches.filterAll}
                clearable
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'PENDING', label: t.adminChurches.statusPending },
                  { value: 'ACTIVE', label: t.adminChurches.statusActive },
                  { value: 'REJECTED', label: t.adminChurches.statusRejected },
                ]}
                data-testid="admin-churches-filter-status"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3, lg: 3 }}>
              <MultiSelect
                label={t.adminChurches.filterState}
                placeholder={t.adminChurches.filterAll}
                clearable
                searchable
                value={stateFilter}
                onChange={setStateFilter}
                data={stateOptions}
                data-testid="admin-churches-filter-state"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 2, lg: 3 }}>
              <Select
                label={t.adminChurches.filterCity}
                placeholder={t.adminChurches.filterAll}
                clearable
                searchable
                value={cityFilter}
                onChange={setCityFilter}
                data={cityOptions}
                data-testid="admin-churches-filter-city"
              />
            </Grid.Col>
          </Grid>
        </Card>

        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={150} />
            ))}
          </SimpleGrid>
        ) : filtered.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconBuilding size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.adminChurches.noChurches}</Text>
            {(statusFilter || stateFilter.length > 0 || cityFilter || search) && (
              <Text size="sm" c="dimmed">
                {t.adminChurches.filterNoResults}
              </Text>
            )}
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {filtered.map((c) => (
              <Card
                key={c.id}
                withBorder
                shadow="sm"
                padding="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => openChurch(c)}
                data-testid={`admin-church-card-${c.id}`}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon color="blue" variant="light" size="lg">
                      <IconBuilding size={20} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={700} lineClamp={1}>
                        {c.name}
                      </Text>
                      <Group gap={4}>
                        <IconMapPin size={13} />
                        <Text size="xs" c="dimmed">
                          {c.city}/{c.state}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>
                  {statusBadge(c.status)}
                </Group>

                <Divider my="sm" />

                <Stack gap={6}>
                  <Group gap={6}>
                    <IconUser size={14} />
                    <Text size="sm">
                      {c.pastor_name || t.adminChurches.noPastor}
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <IconPhone size={14} />
                    <Text size="sm">{c.phone || '—'}</Text>
                  </Group>
                </Stack>

                <Group justify="flex-end" mt="md">
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconEye size={14} />}
                    data-testid={`admin-church-details-${c.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(c);
                    }}
                  >
                    {t.adminChurches.viewDetails}
                  </Button>
                  {c.status === 'ACTIVE' && (
                    <Button
                      size="xs"
                      variant="light"
                      rightSection={<IconArrowRight size={14} />}
                      data-testid={`admin-church-open-${c.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openChurch(c);
                      }}
                    >
                      {t.adminChurches.open}
                    </Button>
                  )}
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}

        <Modal
          opened={!!selected}
          onClose={() => setSelected(null)}
          title={t.adminChurches.registrationData}
          centered
          size="lg"
        >
          {selected && (
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon color="blue" variant="light" size="lg">
                    <IconBuilding size={20} />
                  </ThemeIcon>
                  <Text fw={700}>{selected.name}</Text>
                </Group>
                {statusBadge(selected.status)}
              </Group>

              <Title order={6} tt="uppercase" c="dimmed">
                {t.settingsPage.churchData}
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.pastor}</Text>
                  <Text size="sm">{selected.pastor_name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.treasurer}</Text>
                  <Text size="sm">{selected.treasurer_name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.phone}</Text>
                  <Text size="sm">{selected.phone || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.status}</Text>
                  <Text size="sm">{statusBadge(selected.status)}</Text>
                </Grid.Col>
              </Grid>

              <Title order={6} tt="uppercase" c="dimmed">
                {t.settingsPage.address}
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.cep}</Text>
                  <Text size="sm">{selected.cep || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.street}</Text>
                  <Text size="sm">
                    {selected.street || '—'}
                    {selected.number ? `, ${selected.number}` : ''}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.neighborhood}</Text>
                  <Text size="sm">{selected.neighborhood || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.registerPage.city}</Text>
                  <Text size="sm">
                    {selected.city || '—'}/{selected.state || '—'}
                  </Text>
                </Grid.Col>
              </Grid>

              <Title order={6} tt="uppercase" c="dimmed">
                {t.adminChurches.responsible}
              </Title>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.name}</Text>
                  <Text size="sm">{selected.user?.name || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.email}</Text>
                  <Text size="sm">{selected.user?.email || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">{t.common.status}</Text>
                  <Badge
                    color={selected.user?.is_active ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {selected.user?.is_active
                      ? t.adminChurches.active
                      : t.adminChurches.inactive}
                  </Badge>
                </Grid.Col>
              </Grid>

              <Group justify="flex-end" mt="xs">
                {selected.status === 'PENDING' && (
                  <>
                    <Button
                      variant="default"
                      data-testid={`admin-church-reject-${selected.id}`}
                      leftSection={<IconX size={16} />}
                      loading={busyId === selected.id}
                      onClick={() => runAction('reject', selected.id)}
                    >
                      {t.reject}
                    </Button>
                    <Button
                      color="green"
                      data-testid={`admin-church-approve-${selected.id}`}
                      leftSection={<IconCheck size={16} />}
                      loading={busyId === selected.id}
                      onClick={() => runAction('approve', selected.id)}
                    >
                      {t.approve}
                    </Button>
                  </>
                )}
                {selected.status === 'ACTIVE' && (
                  <Button
                    rightSection={<IconArrowRight size={16} />}
                    onClick={() => router.push(`/admin/churches/${selected.id}/dashboard`)}
                  >
                    {t.adminChurches.open}
                  </Button>
                )}
              </Group>
            </Stack>
          )}
        </Modal>
      </Layout>
    </AuthGuard>
  );
}

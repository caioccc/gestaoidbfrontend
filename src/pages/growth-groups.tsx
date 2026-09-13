import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconHomeHeart,
  IconLink,
  IconMapPin,
  IconPlus,
  IconUsersGroup,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import GrowthGroupsMap, { type SimulationPoint } from '../components/GrowthGroupsMap';
import GrowthGroupsTable from '../components/GrowthGroupsTable';
import GrowthGroupFormModal from '../components/GrowthGroupFormModal';
import { accountsApi, churchLinksApi, growthGroupsApi } from '../api/accounts';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { absoluteUrl, copyToClipboard } from '../utils/share';
import { nearestGroup, haversineMeters } from '../utils/geo';
import type {
  GrowthGroup,
  GrowthGroupPayload,
  GrowthGroupStats,
  GrowthGroupWeekday,
  Member,
} from '../types';

const WEEKDAY_LABELS: Record<GrowthGroupWeekday, 'monday' | 'tuesday' | 'wednesday' | 'friday'> = {
  0: 'monday',
  1: 'tuesday',
  2: 'wednesday',
  4: 'friday',
};

interface SimResult {
  covered: number[];
  nearestId: number | null;
}

function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card withBorder>
      <Group gap="md" wrap="nowrap">
        <ThemeIcon size={44} radius="md" variant="light">
          {icon}
        </ThemeIcon>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="xs" tt="uppercase" c="dimmed" fw={600} lineClamp={1}>
            {label}
          </Text>
          <Text fw={700} size="xl" lineClamp={1}>
            {value}
          </Text>
          {hint && (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
  );
}

export default function GrowthGroupsPage() {
  const { user } = useAuth();
  const { hasRole } = useRoleHelpers(user);
  const { t } = useLanguage();

  const canEdit = hasRole('PASTOR', 'SECRETARIA', 'TESOUREIRO');
  const canDelete = hasRole('PASTOR', 'SECRETARIA');

  const [groups, setGroups] = useState<GrowthGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<GrowthGroupStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [weekdayFilter, setWeekdayFilter] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GrowthGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<GrowthGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [simulation, setSimulation] = useState<SimulationPoint | null>(null);
  const [simResult, setSimResult] = useState<SimResult>({ covered: [], nearestId: null });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      growthGroupsApi.list(),
      growthGroupsApi.stats(),
      accountsApi.members(),
    ])
      .then(([g, s, m]) => {
        setGroups(g);
        setStats(s);
        setMembers(m);
      })
      .catch(() => {
        notifications.show({ message: t.growthGroups.loadError, color: 'red' });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (g: GrowthGroup) => {
    setEditing(g);
    setFormOpen(true);
  };

  const viewOnMap = (g: GrowthGroup) => {
    setFocusedId(g.id);
  };

  const handleCoverage = useCallback((covered: number[], nearestId: number | null) => {
    setSimResult({ covered, nearestId });
  }, []);

  const handleSaved = (payload: GrowthGroupPayload) => {
    setSaving(true);
    const request = editing
      ? growthGroupsApi.update(editing.id, payload)
      : growthGroupsApi.create(payload);
    request
      .then(() => {
        notifications.show({ message: t.growthGroups.saved, color: 'green' });
        setFormOpen(false);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.growthGroups.saveError, color: 'red' });
      })
      .finally(() => setSaving(false));
  };

  const copyPublicLink = async () => {
    let path = '/gc';
    try {
      const config = await churchLinksApi.config();
      if (config.slug) path = `/gc/${config.slug}`;
    } catch {
      // slug indisponível: copia o caminho relativo
    }
    await copyToClipboard(absoluteUrl(path));
    notifications.show({ color: 'green', message: t.growthGroups.publicLinkCopied });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    growthGroupsApi
      .remove(toDelete.id)
      .then(() => {
        notifications.show({ message: t.growthGroups.deleteDone, color: 'green' });
        setToDelete(null);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.growthGroups.saveError, color: 'red' });
      })
      .finally(() => setDeleting(false));
  };

  const weekdayName = (w: GrowthGroupWeekday | number | null) => {
    if (w == null) return '—';
    return t.growthGroups[WEEKDAY_LABELS[w as GrowthGroupWeekday]];
  };

  const filtered = groups.filter((g) => {
    if (weekdayFilter && String(g.weekday) !== weekdayFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.leader_name.toLowerCase().includes(q) ||
      (g.host_name || '').toLowerCase().includes(q) ||
      g.address.toLowerCase().includes(q)
    );
  });

  const overlapCount = stats?.overlap_count ?? 0;
  const nearest = simulation
    ? nearestGroup(groups, simulation)
    : null;
  const nearestDist =
    nearest != null &&
    nearest.latitude != null &&
    nearest.longitude != null &&
    simulation
      ? Math.round(haversineMeters(nearest.latitude, nearest.longitude, simulation.lat, simulation.lng))
      : null;
  const coveredCount = simResult.covered.length;

  return (
    <AuthGuard>
      <Layout>
        <PageHeader
          title={t.growthGroups.title}
          description={t.growthGroups.subtitle}
        >
          {canEdit && (
            <Group gap="sm">
              <Button
                variant="default"
                leftSection={<IconLink size={18} />}
                onClick={copyPublicLink}
                data-testid="gc-copy-public-link"
              >
                {t.growthGroups.copyPublicLink}
              </Button>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={openCreate}
                data-testid="add-gc"
              >
                {t.growthGroups.newGroup}
              </Button>
            </Group>
          )}
        </PageHeader>

        {loading ? (
          <Center h="40vh">
            <Loader />
          </Center>
        ) : (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
              <KpiCard
                label={t.growthGroups.kpiActive}
                value={String(stats?.total_active ?? 0)}
                icon={<IconHomeHeart size={22} />}
              />
              <KpiCard
                label={t.growthGroups.kpiLeaders}
                value={String(stats?.total_leaders ?? 0)}
                icon={<IconUsersGroup size={22} />}
              />
              <KpiCard
                label={t.growthGroups.kpiDay}
                value={weekdayName(stats?.most_frequent_day ?? null)}
                icon={<IconCalendarEvent size={22} />}
              />
              <KpiCard
                label={t.growthGroups.kpiCoverage}
                value={`${stats?.coverage ?? 0}/${stats?.total_active ?? 0}`}
                icon={<IconHomeHeart size={22} />}
                hint={t.growthGroups.kpiCoverageValue.replace(
                  '{count}',
                  String(stats?.coverage ?? 0)
                )}
              />
            </SimpleGrid>

            {overlapCount > 0 && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {t.growthGroups.overlapAlert.replace('{count}', String(overlapCount))}
              </Alert>
            )}

            <Tabs defaultValue="dashboard" keepMounted={false}>
              <Tabs.List>
                <Tabs.Tab value="dashboard">
                  {t.growthGroups.dashboardTab}
                </Tabs.Tab>
                <Tabs.Tab value="table">{t.growthGroups.tableTab}</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="dashboard" pt="md">
                <Stack gap="sm">
                  <GrowthGroupsMap
                    groups={groups}
                    focusedId={focusedId}
                    overlapIds={stats?.overlap_ids ?? []}
                    simulation={simulation}
                    onSimulationChange={setSimulation}
                    onCoverageChange={handleCoverage}
                  />
                  {simulation && (
                    <Paper withBorder p="md">
                      <Stack gap="xs">
                        {coveredCount > 0 ? (
                          <>
                            <Text size="sm" fw={600}>
                              {t.growthGroups.simulationCovered.replace(
                                '{count}',
                                String(coveredCount)
                              )}
                            </Text>
                            <Group gap={6}>
                              {simResult.covered
                                .map((id) => groups.find((g) => g.id === id))
                                .filter((g): g is GrowthGroup => g != null)
                                .map((g) => (
                                  <Tooltip
                                    key={g.id}
                                    multiline
                                    withArrow
                                    position="right"
                                    transitionProps={{ transition: 'pop' }}
                                    label={
                                      <Stack gap={2}>
                                        <Text size="sm" fw={700}>
                                          {g.name}
                                        </Text>
                                        <Text size="xs">
                                          {t.growthGroups.leaderLabel}: {g.leader_name}
                                        </Text>
                                        <Text size="xs">
                                          {g.weekday_display} às{' '}
                                          {(g.time || '').slice(0, 5)}
                                        </Text>
                                        <Text size="xs">
                                          {t.growthGroups.addressLabel}: {g.address}
                                        </Text>
                                        <Text size="xs">
                                          {t.growthGroups.radiusLabel}:{' '}
                                          {g.radius_meters} m
                                        </Text>
                                      </Stack>
                                    }
                                  >
                                    <Badge
                                      variant="light"
                                      color="green"
                                      leftSection={<IconMapPin size={12} />}
                                      style={{ cursor: 'help' }}
                                    >
                                      {g.name}
                                    </Badge>
                                  </Tooltip>
                                ))}
                            </Group>
                          </>
                        ) : (
                          <Text size="sm" c="dimmed">
                            {t.growthGroups.simulationNotCovered}
                          </Text>
                        )}
                        {nearest && nearestDist != null && coveredCount === 0 && (
                          <Text size="xs" c="dimmed">
                            {t.growthGroups.simulationNearest
                              .replace('{name}', nearest.name)
                              .replace('{meters}', String(nearestDist))}
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="table" pt="md">
                <GrowthGroupsTable
                  groups={filtered}
                  loading={false}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  search={search}
                  onSearchChange={setSearch}
                  weekdayFilter={weekdayFilter ?? ''}
                  onWeekdayFilterChange={setWeekdayFilter}
                  onView={viewOnMap}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}

        <GrowthGroupFormModal
          opened={formOpen}
          editing={editing}
          members={members}
          saving={saving}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />

        <Modal
          opened={!!toDelete}
          onClose={() => setToDelete(null)}
          title={t.growthGroups.confirmDeleteTitle}
        >
          <Stack gap="lg">
            <Text>
              {t.growthGroups.confirmDeleteBody.replace(
                '{name}',
                toDelete ? toDelete.name : ''
              )}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToDelete(null)}>
                {t.common.cancel}
              </Button>
              <Button color="red" loading={deleting} onClick={confirmDelete}>
                {t.common.delete}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconExternalLink,
  IconMapPin,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';
import { accountsApi, growthGroupsApi } from '../api/accounts';
import MemberFormModal from '../components/MemberFormModal';
import MemberLocationsMap from '../components/MemberLocationsMap';
import { useChurchCardConfig } from '../hooks/useChurchCardConfig';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { useLanguage } from '../i18n';
import type {
  GrowthGroup,
  Member,
  MemberLocationMember,
  MemberLocationMissingItem,
  MemberLocationsPayload,
  MemberStatus,
  MinistryArea,
} from '../types';
import { buildGrowthGroupMapLayer } from '../utils/growthGroupLayer';

type StatusFilter = 'ALL' | MemberStatus;

const isChurchItem = (item: MemberLocationMissingItem) => item.kind === 'church';

const isGeocodableMissing = (item: MemberLocationMissingItem) =>
  item.reason !== 'no_address' && item.reason !== 'not_found';

export default function MemberLocationsTab() {
  const { t } = useLanguage();
  const { church } = useCurrentChurch();
  const { config, contact } = useChurchCardConfig();
  const [data, setData] = useState<MemberLocationsPayload | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [editing, setEditing] = useState<Member | null>(null);
  const [geocodingIds, setGeocodingIds] = useState<number[]>([]);
  const [churchGeocoding, setChurchGeocoding] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [showGcPoints, setShowGcPoints] = useState(false);
  const [showGcRadius, setShowGcRadius] = useState(false);
  const [growthGroups, setGrowthGroups] = useState<GrowthGroup[] | null>(null);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcError, setGcError] = useState('');
  const loadSeqRef = useRef(0);
  const batchStartedRef = useRef(false);
  const gcLoadStartedRef = useRef(false);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError('');
    try {
      const [locations, areaList] = await Promise.all([
        accountsApi.memberLocations(),
        accountsApi.ministryAreas(),
      ]);
      if (seq !== loadSeqRef.current) return;
      setData(locations);
      setAreas(areaList);
    } catch {
      if (seq === loadSeqRef.current) setError(t.memberMap.loadError);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [t.memberMap.loadError]);

  const refreshMembers = useCallback(async () => {
    if (!church?.id) return;
    try {
      setMembers(await accountsApi.churchMembers(church.id));
    } catch {
      return;
    }
  }, [church?.id]);

  const ensureGrowthGroups = useCallback(async () => {
    if (gcLoadStartedRef.current) return;
    gcLoadStartedRef.current = true;
    setGcLoading(true);
    setGcError('');
    try {
      setGrowthGroups(await growthGroupsApi.list());
    } catch {
      gcLoadStartedRef.current = false;
      setGcError(t.memberMap.gcLoadError);
    } finally {
      setGcLoading(false);
    }
  }, [t.memberMap.gcLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showGcPoints || showGcRadius) void ensureGrowthGroups();
  }, [showGcPoints, showGcRadius, ensureGrowthGroups]);

  useEffect(() => {
    batchStartedRef.current = false;
    gcLoadStartedRef.current = false;
    setData(null);
    setGrowthGroups(null);
    setGcError('');
    if (!church?.id) return;
    let active = true;
    accountsApi
      .churchMembers(church.id)
      .then((list) => {
        if (active) setMembers(list);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [church?.id]);

  useEffect(() => {
    if (!data || batchStartedRef.current) return;
    batchStartedRef.current = true;
    const ids = data.missing
      .filter(
        (item): item is MemberLocationMember =>
          !isChurchItem(item) && isGeocodableMissing(item)
      )
      .map((item) => item.id)
      .slice(0, 12);
    if (!ids.length) return;
    let active = true;
    setBatchRunning(true);
    void accountsApi
      .geocodeMembers(ids)
      .then(async () => {
        if (!active) return;
        await load();
        await refreshMembers();
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setBatchRunning(false);
      });
    return () => {
      active = false;
    };
  }, [data, load, refreshMembers]);

  const filtered = useMemo(() => {
    if (!data) return null;
    const query = search.trim().toLocaleLowerCase();
    const statusMatches = (value: MemberStatus) =>
      status === 'ALL' || value === status;
    const matchesQuery = (name: string, address: string) =>
      !query ||
      name.toLocaleLowerCase().includes(query) ||
      address.toLocaleLowerCase().includes(query);

    const points = data.points
      .map((point) => ({
        ...point,
        members: point.members.filter(
          (member) =>
            statusMatches(member.status) &&
            matchesQuery(member.name, point.address)
        ),
      }))
      .filter((point) => point.members.length > 0);
    const missing = data.missing.filter((item) =>
      isChurchItem(item)
        ? matchesQuery(item.name, item.address)
        : statusMatches(item.status) &&
          matchesQuery(item.name, item.address)
    );
    return { ...data, points, missing };
  }, [data, search, status]);

  const growthGroupLayer = useMemo(
    () => (growthGroups ? buildGrowthGroupMapLayer(growthGroups) : null),
    [growthGroups]
  );

  const openEdit = (memberId: number) => {
    const member = members.find((item) => item.id === memberId);
    if (member) setEditing(member);
  };

  const handleSave = async (
    payload: Record<string, unknown>,
    isEdit: boolean
  ): Promise<Member> => {
    if (!isEdit || !editing) {
      throw new Error('member-required');
    }
    const saved = await accountsApi.updateMember(editing.id, payload);
    await load();
    await refreshMembers();
    return saved;
  };

  const pendingItems = (data?.missing || []).filter(isGeocodableMissing);
  const pendingIds = pendingItems
    .filter((item): item is MemberLocationMember => !isChurchItem(item))
    .map((item) => item.id);
  const churchPending = pendingItems.some(isChurchItem);
  const pendingCount = pendingIds.length + (churchPending ? 1 : 0);

  const geocodeOne = async (item: MemberLocationMissingItem) => {
    if (isChurchItem(item)) {
      if (churchGeocoding) return;
      setChurchGeocoding(true);
      try {
        await accountsApi.geocodeChurch(true);
        await load();
      } catch {
        return;
      } finally {
        setChurchGeocoding(false);
      }
      return;
    }
    const id = item.id;
    if (geocodingIds.includes(id)) return;
    setGeocodingIds((ids) => [...ids, id]);
    try {
      await accountsApi.geocodeMember(id, true);
      await load();
      await refreshMembers();
    } catch {
      return;
    } finally {
      setGeocodingIds((ids) => ids.filter((current) => current !== id));
    }
  };

  const geocodePendingBatch = async () => {
    if (batchRunning || !pendingCount) return;
    setBatchRunning(true);
    try {
      if (churchPending) await accountsApi.geocodeChurch();
      if (pendingIds.length) await accountsApi.geocodeMembers(pendingIds);
      await load();
      await refreshMembers();
    } catch {
      return;
    } finally {
      setBatchRunning(false);
    }
  };

  const statusOptions = [
    { value: 'ALL', label: t.memberMap.statusAll },
    { value: 'ACTIVE', label: t.memberMap.statusActive },
    { value: 'INACTIVE', label: t.memberMap.statusInactive },
  ];

  if (loading && !data) {
    return (
      <Center py={80}>
        <Stack align="center" gap="sm">
          <Loader size="md" />
          <Text size="sm" c="dimmed">
            {t.memberMap.loading}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (error && !data) {
    return (
      <Center py={80}>
        <Stack align="center" gap="sm">
          <Text c="red" size="sm">
            {error}
          </Text>
          <Button
            variant="light"
            leftSection={<IconRefresh size={15} />}
            onClick={load}
          >
            {t.memberMap.retry}
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md" data-testid="member-locations-tab">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={3}>{t.memberMap.title}</Title>
          <Text size="sm" c="dimmed">
            {t.memberMap.subtitle}
          </Text>
        </div>
        <Tooltip label={t.memberMap.retry}>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={t.memberMap.retry}
            onClick={load}
            loading={loading}
          >
            <IconRefresh size={17} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {data && (
        <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="sm">
          <Card withBorder padding="sm" radius="md">
            <Text size="xs" c="dimmed">
              {t.memberMap.totalMembers}
            </Text>
            <Text fw={700} size="xl">
              {data.counts.members}
            </Text>
          </Card>
          <Card withBorder padding="sm" radius="md">
            <Text size="xs" c="dimmed">
              {t.memberMap.mappedPoints}
            </Text>
            <Text fw={700} size="xl">
              {data.counts.points}
            </Text>
          </Card>
          <Card withBorder padding="sm" radius="md">
            <Text size="xs" c="dimmed">
              {t.memberMap.withoutPoint}
            </Text>
            <Text fw={700} size="xl">
              {data.counts.missing}
            </Text>
          </Card>
          <Card withBorder padding="sm" radius="md">
            <Text size="xs" c="dimmed">
              {t.memberMap.geocodedCount}
            </Text>
            <Text fw={700} size="xl" c="grape">
              {data.counts.geocoded}
            </Text>
          </Card>
        </SimpleGrid>
      )}

      <Group grow align="flex-end" wrap="wrap">
        <TextInput
          label={t.memberMap.searchPlaceholder}
          placeholder={t.memberMap.searchPlaceholder}
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <Select
          label={t.membersPage.status}
          data={statusOptions}
          value={status}
          onChange={(value) => setStatus((value as StatusFilter) || 'ALL')}
          allowDeselect={false}
        />
      </Group>

      {data && filtered && (
        <>
          {!data.counts.ready && (
            <Paper
              withBorder
              radius="md"
              p="lg"
              ta="center"
              data-testid="member-locations-pending"
            >
              <Text fw={700}>{t.memberMap.pendingGeocodeTitle}</Text>
              <Text size="sm" c="dimmed" mt={4}>
                {t.memberMap.pendingGeocodeBody.replace(
                  '{count}',
                  String(data.counts.pending)
                )}
              </Text>
              <Button
                mt="sm"
                size="xs"
                variant="light"
                leftSection={<IconRefresh size={14} />}
                loading={batchRunning}
                disabled={!pendingCount}
                onClick={geocodePendingBatch}
              >
                {t.memberMap.geocodePending.replace(
                  '{count}',
                  String(pendingCount)
                )}
              </Button>
            </Paper>
          )}

          <Group gap="lg" wrap="wrap">
            <Switch
              checked={showGcPoints}
              onChange={(event) => setShowGcPoints(event.currentTarget.checked)}
              label={t.memberMap.gcPointsSwitch}
              data-testid="member-map-gc-points-switch"
            />
            <Switch
              checked={showGcRadius}
              onChange={(event) => setShowGcRadius(event.currentTarget.checked)}
              label={t.memberMap.gcRadiusSwitch}
              data-testid="member-map-gc-radius-switch"
            />
            {gcLoading && (
              <Text size="xs" c="dimmed">
                {t.memberMap.gcLoading}
              </Text>
            )}
            {gcError && (
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="red">
                  {gcError}
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => {
                    gcLoadStartedRef.current = false;
                    void ensureGrowthGroups();
                  }}
                >
                  {t.memberMap.retry}
                </Button>
              </Group>
            )}
          </Group>

          <Paper withBorder radius="md" p="sm">
            <MemberLocationsMap
              data={filtered}
              points={filtered.points}
              onEdit={openEdit}
              showGcPoints={showGcPoints}
              showGcRadius={showGcRadius}
              growthGroupLayer={growthGroupLayer}
            />
            {filtered.points.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {t.memberMap.noPoints}
              </Text>
            )}
          </Paper>

          {growthGroupLayer && (
            <Paper withBorder radius="md" p="md" data-testid="member-map-gc-missing">
              <Text fw={600}>
                {t.memberMap.gcWithoutCoords} ({growthGroupLayer.missing.length})
              </Text>
              {growthGroupLayer.missing.length === 0 ? (
                <Text size="sm" c="dimmed" mt={4}>
                  {t.memberMap.gcNoMissing}
                </Text>
              ) : (
                <Stack gap="xs" mt="xs">
                  {growthGroupLayer.missing.map((item) => (
                    <Group
                      key={item.id}
                      justify="space-between"
                      gap="xs"
                      wrap="wrap"
                    >
                      <div>
                        <Text size="sm" fw={500}>
                          {item.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {item.address || '-'}
                        </Text>
                      </div>
                      <Badge size="sm" variant="light" color="orange">
                        {item.reason === 'no_coordinates'
                          ? t.memberMap.gcReasonNoCoordinates
                          : t.memberMap.gcReasonNoRadius}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              )}
            </Paper>
          )}

          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={600}>
                {t.memberMap.membersWithoutPoint} ({filtered.missing.length})
              </Text>
              {data.church.latitude != null && data.church.longitude != null && (
                <Anchor
                  href={`https://www.google.com/maps/search/?api=1&query=${data.church.latitude},${data.church.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  size="xs"
                >
                  <Group gap={4} wrap="nowrap">
                    <IconExternalLink size={13} />
                    {t.memberMap.googleMaps}
                  </Group>
                </Anchor>
              )}
            </Group>
            {filtered.missing.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t.memberMap.noMissing}
              </Text>
            ) : (
              <Stack gap="xs">
                {filtered.missing.map((item) => {
                  const isChurch = isChurchItem(item);
                  const itemName = isChurch
                    ? t.memberMap.churchPoint
                    : item.name;
                  const detail = isChurch
                    ? [item.name, item.address].filter(Boolean).join(' · ') || '-'
                    : item.address || '-';
                  const geocodeLabel = isChurch
                    ? t.memberMap.geocodeChurch
                    : t.memberMap.geocodeMember;
                  return (
                    <Group
                      key={item.id}
                      justify="space-between"
                      wrap="wrap"
                      gap="xs"
                    >
                      <div>
                        <Text size="sm" fw={500}>
                          {itemName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {detail}
                        </Text>
                        {item.reason && (
                          <Text size="xs" c="orange">
                            {item.reason === 'no_address'
                              ? t.memberMap.reasonNoAddress
                              : item.reason === 'not_found'
                                ? t.memberMap.reasonNotFound
                                : item.reason === 'pending'
                                  ? t.memberMap.reasonPending
                                  : item.reason === 'error'
                                    ? t.memberMap.reasonError
                                    : t.memberMap.reasonQuota}
                          </Text>
                        )}
                      </div>
                      <Group gap="xs" wrap="nowrap">
                        <Badge
                          size="sm"
                          variant="light"
                          color={
                            isChurch
                              ? 'grape'
                              : item.status === 'ACTIVE'
                                ? 'teal'
                                : 'gray'
                          }
                        >
                          {isChurch ? itemName : item.status_display}
                        </Badge>
                        <Tooltip label={geocodeLabel}>
                          <ActionIcon
                            variant="subtle"
                            color="grape"
                            aria-label={`${geocodeLabel}: ${item.name}`}
                            data-testid={`member-location-geocode-${
                              isChurch ? 'church' : item.id
                            }`}
                            loading={
                              isChurch
                                ? churchGeocoding
                                : geocodingIds.includes(item.id)
                            }
                            onClick={() => geocodeOne(item)}
                          >
                            <IconRefresh size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {!isChurch && (
                          <Tooltip label={t.memberMap.editPoint}>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              aria-label={`${t.memberMap.editPoint}: ${item.name}`}
                              data-testid={`member-location-edit-${item.id}`}
                              onClick={() => openEdit(item.id)}
                            >
                              <IconMapPin size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </>
      )}

      <MemberFormModal
        opened={!!editing}
        onClose={() => setEditing(null)}
        member={editing}
        areas={areas}
        churchName={church?.name || ''}
        cardConfig={config}
        churchContact={contact}
        onSave={handleSave}
      />
    </Stack>
  );
}

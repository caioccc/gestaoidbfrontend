'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { accountsApi } from '../api/accounts';
import MemberFormModal from '../components/MemberFormModal';
import MemberLocationsMap from '../components/MemberLocationsMap';
import { useChurchCardConfig } from '../hooks/useChurchCardConfig';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { useLanguage } from '../i18n';
import type {
  Member,
  MemberLocationsPayload,
  MemberStatus,
  MinistryArea,
} from '../types';

type StatusFilter = 'ALL' | MemberStatus;

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [locations, memberList, areaList] = await Promise.all([
        accountsApi.memberLocations(),
        church ? accountsApi.churchMembers(church.id) : Promise.resolve([]),
        accountsApi.ministryAreas(),
      ]);
      setData(locations);
      setMembers(memberList);
      setAreas(areaList);
    } catch {
      setError(t.memberMap.loadError);
    } finally {
      setLoading(false);
    }
  }, [church, t.memberMap.loadError]);

  useEffect(() => {
    load();
  }, [load]);

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
    const missing = data.missing.filter(
      (member) =>
        statusMatches(member.status) &&
        matchesQuery(member.name, member.address)
    );
    return { ...data, points, missing };
  }, [data, search, status]);

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
    return saved;
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
          <Paper withBorder radius="md" p="sm">
            <MemberLocationsMap
              data={filtered}
              points={filtered.points}
              onEdit={openEdit}
            />
            {filtered.points.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {t.memberMap.noPoints}
              </Text>
            )}
          </Paper>

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
                {filtered.missing.map((member) => (
                  <Group
                    key={member.id}
                    justify="space-between"
                    wrap="wrap"
                    gap="xs"
                  >
                    <div>
                      <Text size="sm" fw={500}>
                        {member.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {member.address || '-'}
                      </Text>
                      {member.reason && (
                        <Text size="xs" c="orange">
                          {member.reason === 'no_address'
                            ? t.memberMap.reasonNoAddress
                            : member.reason === 'quota'
                              ? t.memberMap.reasonQuota
                              : t.memberMap.reasonNotFound}
                        </Text>
                      )}
                    </div>
                    <Group gap="xs" wrap="nowrap">
                      <Badge
                        size="sm"
                        variant="light"
                        color={
                          member.status === 'ACTIVE' ? 'teal' : 'gray'
                        }
                      >
                        {member.status_display}
                      </Badge>
                      <Tooltip label={t.memberMap.editPoint}>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          aria-label={`${t.memberMap.editPoint}: ${member.name}`}
                          data-testid={`member-location-edit-${member.id}`}
                          onClick={() => openEdit(member.id)}
                        >
                          <IconMapPin size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                ))}
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

'use client';

import React from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Input,
  Menu,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconDots,
  IconEdit,
  IconHomeHeart,
  IconMapPin,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import MobileItemCard from './MobileItemCard';
import { useLanguage } from '../i18n';
import type { GrowthGroup, GrowthGroupWeekday } from '../types';

interface GrowthGroupsTableProps {
  groups: GrowthGroup[];
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  weekdayFilter: string;
  onWeekdayFilterChange: (v: string | null) => void;
  onView: (group: GrowthGroup) => void;
  onEdit: (group: GrowthGroup) => void;
  onDelete: (group: GrowthGroup) => void;
}

const WEEKDAY_VALUES: GrowthGroupWeekday[] = [0, 1, 2, 4];

const WEEKDAY_LABELS: Record<GrowthGroupWeekday, 'monday' | 'tuesday' | 'wednesday' | 'friday'> = {
  0: 'monday',
  1: 'tuesday',
  2: 'wednesday',
  4: 'friday',
};

export default function GrowthGroupsTable({
  groups,
  loading,
  canEdit,
  canDelete,
  search,
  onSearchChange,
  weekdayFilter,
  onWeekdayFilterChange,
  onView,
  onEdit,
  onDelete,
}: GrowthGroupsTableProps) {
  const { t } = useLanguage();

  const weekdayName = (w: GrowthGroupWeekday | number) =>
    t.growthGroups[WEEKDAY_LABELS[w as GrowthGroupWeekday]];

  const weekdayOptions = WEEKDAY_VALUES.map((w) => ({
    value: String(w),
    label: weekdayName(w),
  }));

  const groupActions = (g: GrowthGroup) => (
    <>
      <Menu.Item
        leftSection={<IconMapPin size={16} />}
        onClick={() => onView(g)}
      >
        {t.growthGroups.viewOnMap}
      </Menu.Item>
      {canEdit && (
        <Menu.Item
          leftSection={<IconEdit size={16} />}
          onClick={() => onEdit(g)}
        >
          {t.common.edit}
        </Menu.Item>
      )}
      {canDelete && (
        <Menu.Item
          leftSection={<IconTrash size={16} />}
          color="red"
          onClick={() => onDelete(g)}
        >
          {t.common.delete}
        </Menu.Item>
      )}
    </>
  );

  if (loading) {
    return (
      <Paper withBorder p="md">
        <Skeleton height={40} mb="md" radius="md" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={40} mb="sm" radius="md" />
        ))}
      </Paper>
    );
  }

  const rows = groups.map((g) => (
    <Table.Tr key={g.id} data-testid={`gc-row-${g.id}`}>
      <Table.Td>
        <Text fw={600}>{g.name}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <Badge variant="light" data-testid={`gc-category-badge-${g.id}`}>
            {g.category_display}
          </Badge>
          {g.is_full && (
            <Badge
              variant="light"
              color="red"
              data-testid={`gc-full-badge-${g.id}`}
            >
              {t.growthGroups.isFullBadge}
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>{g.leader_name}</Table.Td>
      <Table.Td>{g.host_name || '—'}</Table.Td>
      <Table.Td>{weekdayName(g.weekday)}</Table.Td>
      <Table.Td>{g.time}</Table.Td>
      <Table.Td style={{ maxWidth: 260 }}>
        <Text size="xs" lineClamp={2}>
          {g.address}
        </Text>
        {g.latitude != null && g.longitude != null && (
          <Group gap={4}>
            <IconMapPin size={12} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="xs" c="dimmed">
              {g.radius_meters}m
            </Text>
          </Group>
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={g.is_active ? 'teal' : 'gray'} variant="light">
          {g.is_active ? t.growthGroups.statusActive : t.growthGroups.statusInactive}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <ActionIcon variant="subtle" data-testid={`gc-actions-${g.id}`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>{groupActions(g)}</Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper withBorder>
      <Group px="md" pt="md" pb="sm">
        <Input
          placeholder={t.growthGroups.searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          style={{ flex: 1 }}
          data-testid="gc-search"
        />
        <Select
          placeholder={t.growthGroups.allDays}
          clearable
          data={weekdayOptions}
          value={weekdayFilter || null}
          onChange={(v) => onWeekdayFilterChange(v)}
          w={180}
          data-testid="gc-weekday-filter"
        />
      </Group>
      {rows.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t.growthGroups.noGroups}
        </Text>
      ) : (
        <>
          <Box visibleFrom="sm">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.growthGroups.nameLabel}</Table.Th>
                  <Table.Th>{t.growthGroups.category}</Table.Th>
                  <Table.Th>{t.growthGroups.leaderLabel}</Table.Th>
                  <Table.Th>{t.growthGroups.hostLabel}</Table.Th>
                  <Table.Th>{t.growthGroups.weekdayLabel}</Table.Th>
                  <Table.Th>{t.growthGroups.timeLabel}</Table.Th>
                  <Table.Th>{t.growthGroups.addressLabel}</Table.Th>
                  <Table.Th>{t.growthGroups.activeLabel}</Table.Th>
                  <Table.Th>{t.common.actions}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </Box>
          <Stack hiddenFrom="sm" gap="xs" p="sm">
            {groups.map((g) => (
              <MobileItemCard
                key={g.id}
                testId={`gc-mobile-${g.id}`}
                media={
                  <ThemeIcon
                    color={g.is_active ? 'teal' : 'gray'}
                    variant="light"
                    radius="md"
                    size="lg"
                  >
                    <IconHomeHeart size={20} />
                  </ThemeIcon>
                }
                actions={groupActions(g)}
              >
                <Stack gap={4}>
                  <Text fw={600} truncate>
                    {g.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {g.leader_name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {g.host_name || '—'}
                  </Text>
                  <Group gap={4} wrap="nowrap" align="center">
                    <Badge
                      variant="light"
                      size="sm"
                      data-testid={`gc-mobile-category-${g.id}`}
                    >
                      {g.category_display}
                    </Badge>
                    {g.is_full && (
                      <Badge
                        variant="light"
                        size="sm"
                        color="red"
                        data-testid={`gc-mobile-full-${g.id}`}
                      >
                        {t.growthGroups.isFullBadge}
                      </Badge>
                    )}
                  </Group>
                  <Group gap={4} wrap="nowrap" align="center">
                    <Badge variant="light" size="sm">
                      {weekdayName(g.weekday)}
                    </Badge>
                    <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                      {g.time}
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed" truncate>
                    {g.address}
                  </Text>
                  {g.latitude != null && g.longitude != null && (
                    <Group gap={4} wrap="nowrap">
                      <IconMapPin
                        size={12}
                        style={{ color: 'var(--mantine-color-dimmed)' }}
                      />
                      <Text size="xs" c="dimmed">
                        {g.radius_meters}m
                      </Text>
                    </Group>
                  )}
                </Stack>
              </MobileItemCard>
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}
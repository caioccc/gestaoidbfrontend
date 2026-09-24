import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Grid,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
  Accordion,
} from '@mantine/core';
import { useRouter } from 'next/router';
import {
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconCake,
  IconCalendar,
  IconChartPie,
  IconDownload,
  IconRefresh,
  IconUsersGroup,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import SendWhatsAppModal from '../components/SendWhatsAppModal';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import type { Member, MinistryArea } from '../types';

function ageGroup(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m =
    today.getMonth() - birth.getMonth() +
    (today.getDate() < birth.getDate() ? -1 : 0);
  if (m < 0) age -= 1;
  if (age <= 11) return 'age0_11';
  if (age <= 17) return 'age12_17';
  if (age <= 29) return 'age18_29';
  if (age <= 59) return 'age30_59';
  return 'age60';
}

function DistributionCard({
  title,
  items,
  total,
}: {
  title: string;
  items: { label: string; count: number }[];
  total: number;
}) {
  const present = items.filter((i) => i.count > 0);
  return (
    <Card withBorder shadow="sm" p="md">
      <Text fw={600} size="sm" mb="sm">
        {title}
      </Text>
      {present.length === 0 ? (
        <Text size="sm" c="dimmed">
          —
        </Text>
      ) : (
        <Stack gap="xs">
          {present.map((item) => {
            const pct = total ? Math.round((item.count / total) * 100) : 0;
            return (
              <Box key={item.label}>
                <Group justify="space-between" gap="xs">
                  <Text size="sm" truncate>
                    {item.label}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {item.count}
                  </Text>
                </Group>
                <Progress.Root size="sm" radius="xl" mt={2}>
                  <Progress.Section
                    value={pct}
                    color={pct >= 50 ? 'teal' : pct >= 25 ? 'blue' : 'gray'}
                    style={{ transition: 'width 400ms ease' }}
                  />
                </Progress.Root>
              </Box>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}

function CompositionTab({ members, t }: { members: Member[]; t: any }) {
  const total = members.length;
  const active = members.filter((m) => m.status === 'ACTIVE').length;
  const inactive = total - active;

  const countBy = (fn: (m: Member) => string | null | undefined) => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const key = fn(m) || '—';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].map(([label, count]) => ({ label, count }));
  };

  const educationItems = countBy((m) =>
    m.education_level ? m.education_level_display || m.education_level : null
  );
  const maritalItems = countBy((m) =>
    m.marital_status ? m.marital_status_display || m.marital_status : null
  );
  const entryItems = countBy((m) => m.church_entry_display || null);
  const ageItems = countBy((m) => {
    const key = ageGroup(m.birth_date);
    return key ? t.memberReports[key as string] : null;
  });

  return (
    <Stack gap="md">
      <Grid>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card withBorder shadow="sm" p="md">
            <Group gap="sm" align="center">
              <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                <IconUsersGroup size={20} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t.memberReports.total}
                </Text>
                <Text fw={800} size="xl">
                  {total}
                </Text>
              </Box>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card withBorder shadow="sm" p="md">
            <Group gap="sm" align="center">
              <ThemeIcon size="lg" radius="xl" color="teal" variant="light">
                <IconChartPie size={20} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t.memberReports.active}
                </Text>
                <Text fw={800} size="xl">
                  {active}
                </Text>
              </Box>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card withBorder shadow="sm" p="md">
            <Group gap="sm" align="center">
              <ThemeIcon size="lg" radius="xl" color="gray" variant="light">
                <IconUsersGroup size={20} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t.memberReports.inactive}
                </Text>
                <Text fw={800} size="xl">
                  {inactive}
                </Text>
              </Box>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <DistributionCard
          title={t.memberReports.byEducation}
          items={educationItems}
          total={total}
        />
        <DistributionCard
          title={t.memberReports.byMarital}
          items={maritalItems}
          total={total}
        />
        <DistributionCard
          title={t.memberReports.byEntry}
          items={entryItems}
          total={total}
        />
        <DistributionCard
          title={t.memberReports.byAge}
          items={ageItems}
          total={total}
        />
      </SimpleGrid>
    </Stack>
  );
}

function AreasTab({ members, areas, t }: { members: Member[]; areas: MinistryArea[]; t: any }) {
  const grouped = areas.map((area) => ({
    area,
    list: members.filter((m) =>
      m.ministry_areas_display.some((a) => a.id === area.id)
    ),
  }));
  const noArea = members.filter(
    (m) => m.ministry_areas_display.length === 0
  );

  if (grouped.length === 0 && noArea.length === 0) {
    return (
      <Card withBorder shadow="sm" p="xl">
        <Stack align="center" gap="sm">
          <ThemeIcon size={48} radius="xl" color="gray" variant="light">
            <IconBuildingChurch size={24} />
          </ThemeIcon>
          <Text c="dimmed">{t.memberReports.empty}</Text>
        </Stack>
      </Card>
    );
  }

  const items = [...grouped, { area: null, list: noArea }].filter(
    (g) => g.list.length > 0
  );
  const defaultValue = items[0]
    ? items[0].area
      ? String(items[0].area.id)
      : 'no-area'
    : undefined;

  return (
    <Accordion variant="separated" defaultValue={defaultValue}>
      {items.map(({ area, list }) => (
        <Accordion.Item
          key={area?.id ?? 'no-area'}
          value={area ? String(area.id) : 'no-area'}
        >
          <Accordion.Control>
            <Group justify="space-between" wrap="nowrap" w="100%">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size="md" radius="xl" color="teal" variant="light">
                  <IconBuildingChurch size={16} />
                </ThemeIcon>
                <Text fw={600}>{area ? area.name : t.memberReports.noArea}</Text>
              </Group>
              <Badge color={area ? 'teal' : 'gray'} variant="light">
                {list.length} {t.memberReports.inArea}
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Box visibleFrom="sm">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.membersPage.name}</Table.Th>
                    <Table.Th>{t.membersPage.phone}</Table.Th>
                    <Table.Th>{t.membersPage.status}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {list.map((m) => (
                    <Table.Tr key={m.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Text fw={500} truncate maw={260}>
                            {m.name}
                          </Text>
                          {m.card_number && (
                            <Text size="xs" c="dimmed">
                              #{m.card_number}
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>{m.phone || '—'}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={m.status === 'ACTIVE' ? 'green' : 'gray'}
                          variant="light"
                        >
                          {m.status_display}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="sm" gap="xs" p="sm">
              {list.map((m) => (
                <MobileItemCard
                  key={m.id}
                  testId={`member-area-mobile-${m.id}`}
                  media={
                    <Avatar
                      src={m.photo || null}
                      radius="xl"
                      size={48}
                      data-testid={`member-area-mobile-avatar-${m.id}`}
                    >
                      {m.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  }
                >
                  <Stack gap={4}>
                    <Text fw={600} truncate>
                      {m.name}
                    </Text>
                    {m.card_number && (
                      <Text size="xs" c="dimmed" truncate>
                        #{m.card_number}
                      </Text>
                    )}
                    <Text size="sm" c="dimmed" truncate>
                      {m.phone || '—'}
                    </Text>
                    <Badge
                      color={m.status === 'ACTIVE' ? 'green' : 'gray'}
                      variant="light"
                      size="sm"
                      style={{ width: 'fit-content' }}
                    >
                      {m.status_display}
                    </Badge>
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

function ListingTab({ members, t, onExport }: { members: Member[]; t: any; onExport: () => void }) {
  const active = members.filter((m) => m.status === 'ACTIVE').length;
  const inactive = members.length - active;
  return (
    <Stack gap="md">
      <Paper withBorder p="sm" radius="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="lg" wrap="wrap">
            <Text size="sm">
              <Text span fw={600}>
                {t.memberReports.total}:
              </Text>{' '}
              {members.length}
            </Text>
            <Text size="sm">
              <Text span fw={600}>
                {t.memberReports.active}:
              </Text>{' '}
              {active}
            </Text>
            <Text size="sm">
              <Text span fw={600}>
                {t.memberReports.inactive}:
              </Text>{' '}
              {inactive}
            </Text>
          </Group>
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={onExport}
            data-testid="member-reports-export"
            disabled={members.length === 0}
          >
            {t.memberReports.exportCsv}
          </Button>
        </Group>
      </Paper>
      <Card withBorder shadow="sm" p={0}>
        {members.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUsersGroup size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.memberReports.empty}</Text>
          </Stack>
        ) : (
          <>
            <Box visibleFrom="sm">
              <Table.ScrollContainer minWidth={900}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.membersPage.name}</Table.Th>
                      <Table.Th>{t.membersPage.contact}</Table.Th>
                      <Table.Th>{t.membersPage.bornInCity}</Table.Th>
                      <Table.Th>{t.membersPage.educationLevel}</Table.Th>
                      <Table.Th>{t.membersPage.maritalStatus}</Table.Th>
                      <Table.Th>{t.membersPage.churchEntry}</Table.Th>
                      <Table.Th>{t.membersPage.ministryAreas}</Table.Th>
                      <Table.Th>{t.membersPage.status}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {members.map((m) => (
                      <Table.Tr key={m.id}>
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar size="sm" radius="xl" color="blue">
                              {m.name
                                ?.split(' ')
                                .map((p) => p?.[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </Avatar>
                            <Stack gap={0} style={{ minWidth: 0 }}>
                              <Text fw={600} size="sm" truncate maw={200}>
                                {m.name}
                              </Text>
                              {m.card_number && (
                                <Text size="xs" c="dimmed">
                                  #{m.card_number}
                                </Text>
                              )}
                            </Stack>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm">{m.phone || '—'}</Text>
                            <Text size="xs" c="dimmed">
                              {m.email || '—'}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{m.born_in_city || '—'}</Table.Td>
                        <Table.Td>{m.education_level_display || '—'}</Table.Td>
                        <Table.Td>{m.marital_status_display || '—'}</Table.Td>
                        <Table.Td>{m.church_entry_display || '—'}</Table.Td>
                        <Table.Td>
                          {m.ministry_areas_display.length ? (
                            <Group gap={4} wrap="wrap">
                              {m.ministry_areas_display.map((a) => (
                                <Badge key={a.id} variant="light" color="blue" size="xs">
                                  {a.name}
                                </Badge>
                              ))}
                            </Group>
                          ) : (
                            <Text size="xs" c="dimmed">
                              —
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="dot"
                            size="sm"
                            color={m.status === 'ACTIVE' ? 'teal' : 'gray'}
                          >
                            {m.status_display}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Box>
          <Stack hiddenFrom="sm" gap="xs" p="sm">
            {members.map((m) => (
              <MobileItemCard
                key={m.id}
                testId={`member-listing-mobile-${m.id}`}
                media={
                  <Avatar
                    src={m.photo || null}
                    radius="xl"
                    size={48}
                    data-testid={`member-listing-mobile-avatar-${m.id}`}
                  >
                    {m.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                }
              >
                <Stack gap={4}>
                  <Text fw={600} truncate>
                    {m.name}
                  </Text>
                  {m.card_number && (
                    <Text size="xs" c="dimmed" truncate>
                      #{m.card_number}
                    </Text>
                  )}
                  <Text size="sm" truncate>
                    {m.phone || '—'}
                  </Text>
                  <Text size="sm" c="dimmed" truncate>
                    {m.email || '—'}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {m.born_in_city || '—'}
                  </Text>
                  {m.ministry_areas_display.length > 0 && (
                    <Text size="xs" c="dimmed" truncate>
                      {m.ministry_areas_display.map((a) => a.name).join(', ')}
                    </Text>
                  )}
                  <Badge
                    color={m.status === 'ACTIVE' ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                    style={{ width: 'fit-content' }}
                  >
                    {m.status_display}
                  </Badge>
                </Stack>
              </MobileItemCard>
            ))}
          </Stack>
          </>
        )}
      </Card>
    </Stack>
  );
}

function exactAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function BirthdaysTab({
  members,
  t,
  locale,
}: {
  members: Member[];
  t: any;
  locale: string;
}) {
  const { church } = useCurrentChurch();
  const [month, setMonth] = useState<string | null>(
    String(new Date().getMonth() + 1)
  );
  const [activeOnly, setActiveOnly] = useState(true);
  const [waMember, setWaMember] = useState<Member | null>(null);

  const monthLabel = (m: number) =>
    new Date(2000, m - 1, 1).toLocaleDateString(locale, { month: 'long' });

  const list = useMemo(() => {
    const m = Number(month);
    if (!m) return [];
    return members
      .filter((mem) => {
        if (!mem.birth_date) return false;
        const bd = new Date(`${mem.birth_date}T00:00:00`);
        if (Number.isNaN(bd.getTime())) return false;
        if (bd.getMonth() + 1 !== m) return false;
        if (activeOnly && mem.status !== 'ACTIVE') return false;
        return true;
      })
      .sort((a, b) => {
        const da = new Date(`${a.birth_date}T00:00:00`).getDate();
        const db = new Date(`${b.birth_date}T00:00:00`).getDate();
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name, locale);
      });
  }, [members, month, activeOnly, locale]);

  const exportCsv = () => {
    const esc = (v: string | number | null | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      t.birthdays.day,
      t.membersPage.name,
      t.birthdays.age,
      t.membersPage.phone,
      t.membersPage.email,
      t.membersPage.status,
    ];
    const lines = [
      headers.map(esc).join(';'),
      ...list.map((m) =>
        [
          String(new Date(`${m.birth_date}T00:00:00`).getDate()),
          m.name,
          exactAge(m.birth_date) ?? '',
          m.phone,
          m.email,
          m.status_display,
        ]
          .map(esc)
          .join(';')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aniversariantes-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="sm" radius="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="md" wrap="wrap">
            <Select
              data={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: monthLabel(i + 1),
              }))}
              value={month}
              onChange={setMonth}
              size="sm"
              leftSection={<IconCalendar size={16} />}
              w={200}
              maw="100%"
            />
            <Checkbox
              label={t.birthdays.activeOnly}
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.currentTarget.checked)}
            />
          </Group>
          <Button
            size="sm"
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={exportCsv}
            disabled={list.length === 0}
          >
            {t.birthdays.exportCsv}
          </Button>
        </Group>
      </Paper>
      <Card withBorder shadow="sm" p={0}>
        {list.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="pink" variant="light">
              <IconCake size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.birthdays.none}</Text>
          </Stack>
        ) : (
          <>
            <Box visibleFrom="sm">
              <Table.ScrollContainer minWidth={760}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.birthdays.day}</Table.Th>
                      <Table.Th>{t.membersPage.name}</Table.Th>
                      <Table.Th>{t.birthdays.age}</Table.Th>
                      <Table.Th>{t.membersPage.phone}</Table.Th>
                      <Table.Th>{t.membersPage.email}</Table.Th>
                      <Table.Th>{t.membersPage.status}</Table.Th>
                      <Table.Th ta="right">{t.common.actions}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {list.map((m) => {
                      const age = exactAge(m.birth_date);
                      return (
                        <Table.Tr key={m.id}>
                          <Table.Td>
                            <ThemeIcon color="pink" radius="md" size="lg" variant="light">
                              <Text fw={700} size="sm">
                                {new Date(`${m.birth_date}T00:00:00`).getDate()}
                              </Text>
                            </ThemeIcon>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Text fw={500} truncate maw={260}>
                                {m.name}
                              </Text>
                              {m.card_number && (
                                <Text size="xs" c="dimmed">
                                  #{m.card_number}
                                </Text>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {age !== null ? `${age} ${t.birthdays.makingYears}` : '—'}
                          </Table.Td>
                          <Table.Td>{m.phone || '—'}</Table.Td>
                          <Table.Td>{m.email || '—'}</Table.Td>
                          <Table.Td>
                            <Badge
                              variant="dot"
                              size="sm"
                              color={m.status === 'ACTIVE' ? 'teal' : 'gray'}
                            >
                              {m.status_display}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group justify="flex-end" gap={4}>
                              <Tooltip label={t.membersPage.sendWhatsApp}>
                                <ActionIcon
                                  variant="light"
                                  color="teal"
                                  size="md"
                                  radius="md"
                                  onClick={() => setWaMember(m)}
                                  data-testid={`birthday-wa-${m.id}`}
                                >
                                  <IconBrandWhatsapp size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Box>
          <Stack hiddenFrom="sm" gap="xs" p="sm">
            {list.map((m) => {
              const age = exactAge(m.birth_date);
              return (
                <MobileItemCard
                  key={m.id}
                  testId={`member-birthday-mobile-${m.id}`}
                  media={
                    <Avatar
                      src={m.photo || null}
                      radius="xl"
                      size={48}
                      data-testid={`member-birthday-mobile-avatar-${m.id}`}
                    >
                      {m.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  }
                >
                  <Stack gap={4}>
                    <Group gap={6} wrap="nowrap" align="center">
                      <Badge color="pink" variant="light" radius="xl" size="sm">
                        {new Date(`${m.birth_date}T00:00:00`).getDate()}
                      </Badge>
                      <Text fw={600} truncate>
                        {m.name}
                      </Text>
                    </Group>
                    {m.card_number && (
                      <Text size="xs" c="dimmed" truncate>
                        #{m.card_number}
                      </Text>
                    )}
                    <Text size="sm" c="dimmed" truncate>
                      {age !== null ? `${age} ${t.birthdays.makingYears}` : '—'}
                    </Text>
                    <Text size="sm" c="dimmed" truncate>
                      {m.phone || '—'}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {m.email || '—'}
                    </Text>
                    <Badge
                      color={m.status === 'ACTIVE' ? 'teal' : 'gray'}
                      variant="dot"
                      size="sm"
                      style={{ width: 'fit-content' }}
                    >
                      {m.status_display}
                    </Badge>
                    <ActionIcon
                      variant="light"
                      color="teal"
                      size="sm"
                      radius="md"
                      mt={2}
                      onClick={() => setWaMember(m)}
                      data-testid={`birthday-wa-mobile-${m.id}`}
                    >
                      <IconBrandWhatsapp size={14} />
                    </ActionIcon>
                  </Stack>
                </MobileItemCard>
              );
            })}
          </Stack>
          </>
        )}
      </Card>

      <SendWhatsAppModal
        opened={!!waMember}
        onClose={() => setWaMember(null)}
        member={waMember}
        churchName={church?.name || ''}
        churchCity={church?.city || ''}
      />
    </Stack>
  );
}

const VALID_REPORT_TABS = ['composition', 'areas', 'listing', 'birthdays'];

export default function MembersReportsPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<string | null>('composition');
  const [members, setMembers] = useState<Member[]>([]);
  const [areas, setAreas] = useState<MinistryArea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([accountsApi.members(), accountsApi.ministryAreas()])
      .then(([membersData, areasData]) => {
        setMembers(membersData);
        setAreas(areasData);
      })
      .catch(() => {
        setMembers([]);
        setAreas([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = router.query.tab;
    if (typeof q === 'string' && VALID_REPORT_TABS.includes(q)) {
      setTab(q);
    }
  }, [router.query.tab]);

  const handleTabChange = (value: string | null) => {
    setTab(value);
    if (value) {
      router.push(
        { pathname: router.pathname, query: { ...router.query, tab: value } },
        undefined,
        { shallow: true }
      );
    }
  };

  const exportCsv = useMemo(
    () => () => {
      const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
      const headers = [
        t.membersPage.name,
        'Matrícula',
        t.membersPage.phone,
        t.membersPage.email,
        t.membersPage.bornInCity,
        t.membersPage.profession,
        t.membersPage.educationLevel,
        t.membersPage.maritalStatus,
        t.membersPage.churchEntry,
        t.membersPage.ministryAreas,
        t.membersPage.status,
      ];
      const lines = [
        headers.map(esc).join(';'),
        ...members.map((m) =>
          [
            m.name,
            m.card_number || '',
            m.phone,
            m.email,
            m.born_in_city,
            m.profession,
            m.education_level_display,
            m.marital_status_display,
            m.church_entry_display,
            m.ministry_areas_display.map((a) => a.name).join('; '),
            m.status_display,
          ]
            .map(esc)
            .join(';')
        ),
      ];
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'membros.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
    [members, t]
  );

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'TESOUREIRO']}>
      <Layout>
        <PageHeader
          title={t.memberReports.title}
          description={t.memberReports.subtitle}
        >
          <Tabs value={tab} onChange={handleTabChange} variant="default">
            <Tabs.List>
              <Tabs.Tab
                value="composition"
                data-testid="tab-composition"
                leftSection={<IconChartPie size={16} />}
              >
                {t.memberReports.tabComposition}
              </Tabs.Tab>
              <Tabs.Tab
                value="areas"
                data-testid="tab-areas"
                leftSection={<IconBuildingChurch size={16} />}
              >
                {t.memberReports.tabAreas}
              </Tabs.Tab>
              <Tabs.Tab
                value="listing"
                data-testid="tab-listing"
                leftSection={<IconUsersGroup size={16} />}
              >
                {t.memberReports.tabListing}
              </Tabs.Tab>
              <Tabs.Tab
                value="birthdays"
                data-testid="tab-birthdays"
                leftSection={<IconCake size={16} />}
              >
                {t.birthdays.tab}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </PageHeader>

        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : (
          <>
            <Group justify="flex-end" mb="md">
              <Button
                variant="default"
                leftSection={<IconRefresh size={16} />}
                onClick={load}
                data-testid="member-reports-refresh"
              >
                {t.common.filter}
              </Button>
            </Group>
            {tab === 'composition' && (
              <CompositionTab members={members} t={t} />
            )}
            {tab === 'areas' && (
              <AreasTab members={members} areas={areas} t={t} />
            )}
            {tab === 'listing' && (
              <ListingTab members={members} t={t} onExport={exportCsv} />
            )}
            {tab === 'birthdays' && (
              <BirthdaysTab members={members} t={t} locale={locale} />
            )}
          </>
        )}
      </Layout>
    </AuthGuard>
  );
}
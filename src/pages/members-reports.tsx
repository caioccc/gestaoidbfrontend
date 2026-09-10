import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Group,
  Text,
  Stack,
  Badge,
  Table,
  Tabs,
  Loader,
  Center,
  SimpleGrid,
  Progress,
  Button,
  Grid,
  ThemeIcon,
  Box,
  Select,
  Checkbox,
} from '@mantine/core';
import { useRouter } from 'next/router';
import {
  IconDownload,
  IconUsersGroup,
  IconChartPie,
  IconBuildingChurch,
  IconRefresh,
  IconCake,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
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
                <Progress
                  value={pct}
                  size="xs"
                  color={pct >= 50 ? 'teal' : pct >= 25 ? 'blue' : 'gray'}
                  mt={2}
                />
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

  return (
    <Stack gap="md">
      {[...grouped, { area: null, list: noArea }]
        .filter((g) => g.list.length > 0)
        .map(({ area, list }) => (
          <Card key={area?.id ?? 'no-area'} withBorder shadow="sm" p={0}>
            <Group justify="space-between" px="md" py="sm" wrap="wrap">
              <Group gap="sm">
                <ThemeIcon size="md" radius="xl" color="teal" variant="light">
                  <IconBuildingChurch size={16} />
                </ThemeIcon>
                <Text fw={600}>{area ? area.name : t.memberReports.noArea}</Text>
              </Group>
              <Badge color={area ? 'teal' : 'gray'} variant="light">
                {list.length} {t.memberReports.inArea}
              </Badge>
            </Group>
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
          </Card>
        ))}
    </Stack>
  );
}

function ListingTab({ members, t, onExport }: { members: Member[]; t: any; onExport: () => void }) {
  return (
    <Stack gap="md">
      <Group justify="flex-end">
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
      <Card withBorder shadow="sm" p={0}>
        {members.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconUsersGroup size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.memberReports.empty}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.membersPage.name}</Table.Th>
                <Table.Th>{t.membersPage.phone}</Table.Th>
                <Table.Th>{t.membersPage.email}</Table.Th>
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
                      <Text fw={500} truncate maw={200}>
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
                  <Table.Td>{m.email || '—'}</Table.Td>
                  <Table.Td>{m.born_in_city || '—'}</Table.Td>
                  <Table.Td>{m.education_level_display || '—'}</Table.Td>
                  <Table.Td>{m.marital_status_display || '—'}</Table.Td>
                  <Table.Td>{m.church_entry_display || '—'}</Table.Td>
                  <Table.Td>
                    {m.ministry_areas_display.length
                      ? m.ministry_areas_display.map((a) => a.name).join(', ')
                      : '—'}
                  </Table.Td>
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
  const [month, setMonth] = useState<string | null>(
    String(new Date().getMonth() + 1)
  );
  const [activeOnly, setActiveOnly] = useState(true);

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
      <Group justify="space-between" wrap="wrap">
        <Group gap="md">
          <Select
            data={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: monthLabel(i + 1),
            }))}
            value={month}
            onChange={setMonth}
            label={t.birthdays.month}
            w={200}
            maw="100%"
          />
          <Checkbox
            label={t.birthdays.activeOnly}
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.currentTarget.checked)}
            mt={30}
          />
        </Group>
        <Button
          variant="default"
          leftSection={<IconDownload size={16} />}
          onClick={exportCsv}
          disabled={list.length === 0}
          mt={26}
        >
          {t.birthdays.exportCsv}
        </Button>
      </Group>
      <Card withBorder shadow="sm" p={0}>
        {list.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={48} radius="xl" color="grape" variant="light">
              <IconCake size={24} />
            </ThemeIcon>
            <Text c="dimmed">{t.birthdays.none}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.birthdays.day}</Table.Th>
                <Table.Th>{t.membersPage.name}</Table.Th>
                <Table.Th>{t.birthdays.age}</Table.Th>
                <Table.Th>{t.membersPage.phone}</Table.Th>
                <Table.Th>{t.membersPage.email}</Table.Th>
                <Table.Th>{t.membersPage.status}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {list.map((m) => {
                const age = exactAge(m.birth_date);
                return (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      <Badge color="grape" variant="light" radius="xl">
                        {new Date(`${m.birth_date}T00:00:00`).getDate()}
                      </Badge>
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
                        color={m.status === 'ACTIVE' ? 'green' : 'gray'}
                        variant="light"
                      >
                        {m.status_display}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}

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
    if (router.query.tab === 'birthdays') {
      setTab('birthdays');
    }
  }, [router.query.tab]);

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
    <AuthGuard roles={['PASTOR', 'SECRETARIA']}>
      <Layout>
        <PageHeader
          title={t.memberReports.title}
          description={t.memberReports.subtitle}
        >
          <Tabs value={tab} onChange={setTab} variant="pills">
            <Tabs.List>
              <Tabs.Tab value="composition" data-testid="tab-composition">
                {t.memberReports.tabComposition}
              </Tabs.Tab>
              <Tabs.Tab value="areas" data-testid="tab-areas">
                {t.memberReports.tabAreas}
              </Tabs.Tab>
              <Tabs.Tab value="listing" data-testid="tab-listing">
                {t.memberReports.tabListing}
              </Tabs.Tab>
              <Tabs.Tab value="birthdays" data-testid="tab-birthdays">
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
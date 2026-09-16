import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Grid,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useRouter } from 'next/router';
import {
  IconArrowsRightLeft,
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconCake,
  IconCalendarEvent,
  IconCalendarPlus,
  IconFilePlus,
  IconFileText,
  IconIdBadge,
  IconPackage,
  IconReport,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from './PageHeader';
import SendWhatsAppModal from './SendWhatsAppModal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import { calendarEventsApi } from '../api/finance';
import type { AppAlert, CalendarEvent, SecretaryActionItem, SecretaryActions } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toShortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

interface FeedRow {
  key: string;
  icon: React.ReactNode;
  color: string;
  text: string;
  href?: string;
}

interface QuickTile {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const isIntercessao = user?.role === 'INTERCESSAO';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [openLoans, setOpenLoans] = useState(0);
  const [cultosMonth, setCultosMonth] = useState(0);
  const [minutesCount, setMinutesCount] = useState(0);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [secretaryActions, setSecretaryActions] = useState<SecretaryActions | null>(null);
  const [waAction, setWaAction] = useState<SecretaryActionItem | null>(null);
  const [recentCultos, setRecentCultos] = useState<
    { id: number; date: string; typeLabel: string; theme: string }[]
  >([]);
  const [recentMinutes, setRecentMinutes] = useState<
    { id: number; date: string; title: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    const today = new Date();
    const monthPrefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    setLoading(true);
    setError(false);

    Promise.all([
      accountsApi.alerts(),
      accountsApi.members(),
      accountsApi.loans(),
      accountsApi.worshipServices(),
      accountsApi.minutes(),
      accountsApi.incomingTransfers(),
      calendarEventsApi.list(),
      accountsApi.secretaryActions(),
    ])
      .then(([alertsRes, members, loans, cultos, minutes, transfers, events, actions]) => {
        if (!active) return;
        setAlerts(alertsRes.alerts ?? []);
        setSecretaryActions(actions);
        setActiveMembers(members.filter((m) => m.status === 'ACTIVE').length);
        setOpenLoans(loans.filter((l) => l.returned_at === null).length);
        setCultosMonth(cultos.filter((c) => c.date.startsWith(monthPrefix)).length);
        setMinutesCount(minutes.length);
        setPendingTransfers(transfers.filter((x) => x.status === 'PENDING').length);

        setRecentCultos(
          [...cultos]
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) * -1)
            .slice(0, 5)
            .map((c) => ({
              id: c.id,
              date: c.date,
              typeLabel: c.service_type_display,
              theme: c.theme,
            })),
        );
        setRecentMinutes(
          [...minutes]
            .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))
            .slice(0, 5)
            .map((m) => ({ id: m.id, date: m.meeting_date, title: m.title })),
        );

        const day = today.getDate();
        const month = today.getMonth() + 1;
        const todayISO = toISO(today);
        setTodayEvents(
          events
            .filter(
              (ev) =>
                ev.audience === 'GENERAL' &&
                (ev.repeat_monthly
                  ? ev.month === month && ev.day === day
                  : ev.date === todayISO),
            )
            .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
        );
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const headerTitle = firstName
    ? t.secretaryDashboard.greeting.replace('{name}', firstName)
    : t.secretaryDashboard.title;
  const sd = t.secretaryDashboard;

  const birthdayToday = alerts.filter((a) => a.type === 'birthday_today');
  const birthdayUpcoming = alerts.filter((a) => a.type === 'birthday_upcoming');
  const cardSoon = alerts.filter((a) => a.type === 'card_validity_soon');
  const cardExpired = alerts.filter((a) => a.type === 'card_validity_expired');
  const loanAlerts = alerts.filter(
    (a) =>
      a.type === 'loan_return_today' ||
      a.type === 'loan_return_soon' ||
      a.type === 'loan_return_overdue',
  );

  const feedRows: FeedRow[] = [];

  if (birthdayToday.length > 0) {
    feedRows.push({
      key: 'birthday-today',
      icon: <IconCake size={18} />,
      color: 'pink',
      text: sd.feedBirthdays.replace(
        '{names}',
        birthdayToday.map((a) => a.member_name ?? '').filter(Boolean).join(', '),
      ),
      href: '/members-reports?tab=birthdays',
    });
  }
  if (birthdayUpcoming.length > 0) {
    feedRows.push({
      key: 'birthday-upcoming',
      icon: <IconCalendarEvent size={18} />,
      color: 'blue',
      text: sd.feedBirthdaysUpcoming.replace('{count}', String(birthdayUpcoming.length)),
      href: '/members-reports?tab=birthdays',
    });
  }
  if (cardSoon.length > 0) {
    feedRows.push({
      key: 'card-soon',
      icon: <IconIdBadge size={18} />,
      color: 'orange',
      text: sd.feedCardsExpiring.replace('{count}', String(cardSoon.length)),
      href: '/members',
    });
  }
  if (cardExpired.length > 0) {
    feedRows.push({
      key: 'card-expired',
      icon: <IconIdBadge size={18} />,
      color: 'red',
      text: sd.feedCardsExpired.replace('{count}', String(cardExpired.length)),
      href: '/members',
    });
  }
  loanAlerts.forEach((a) => {
    if (isIntercessao) return;
    const overdue = a.type === 'loan_return_overdue';
    const todayL = a.type === 'loan_return_today';
    const color = overdue ? 'red' : todayL ? 'orange' : 'blue';
    const person = a.borrower_name ?? a.member_name ?? '';
    const message = (overdue ? sd.feedLoanOverdue : todayL ? sd.feedLoanToday : sd.feedLoanSoon)
      .replace('{item}', a.item_name ?? '')
      .replace('{person}', person)
      .replace('{date}', todayL ? '' : toShortDate(a.date));
    feedRows.push({
      key: `loan-${a.loan_id ?? a.item_id ?? a.date}`,
      icon: <IconPackage size={18} />,
      color,
      text: message.trim(),
      href: '/inventory',
    });
  });
  todayEvents.forEach((ev) => {
    const time = ev.start_time ? ev.start_time.slice(0, 5) : '';
    feedRows.push({
      key: `event-${ev.id}`,
      icon: <IconCalendarEvent size={18} />,
      color: 'violet',
      text: time
        ? sd.feedEvent.replace('{time}', time).replace('{title}', ev.title)
        : ev.title,
      href: '/calendar',
    });
  });

  const allStatCards = [
    { key: 'members', label: sd.statMembers, value: activeMembers, color: 'blue', icon: <IconUsers size={22} /> },
    { key: 'loans', label: sd.statLoans, value: openLoans, color: 'green', icon: <IconPackage size={22} /> },
    { key: 'cultos', label: sd.statCultos, value: cultosMonth, color: 'teal', icon: <IconBuildingChurch size={22} /> },
    { key: 'minutes', label: sd.statMinutes, value: minutesCount, color: 'orange', icon: <IconFileText size={22} /> },
    { key: 'birthdays', label: sd.statBirthdays, value: birthdayToday.length, color: 'pink', icon: <IconCake size={22} /> },
    { key: 'cards', label: sd.statCardsExpiring, value: cardSoon.length + cardExpired.length, color: 'red', icon: <IconIdBadge size={22} /> },
    { key: 'transfers', label: sd.statTransfers, value: pendingTransfers, color: 'indigo', icon: <IconArrowsRightLeft size={22} /> },
  ];
  const statCards = isIntercessao
    ? allStatCards.filter((c) => ['cultos', 'minutes', 'birthdays'].includes(c.key))
    : allStatCards;

  const allQuickTiles: QuickTile[] = [
    { key: 'members', label: sd.linkMembers, icon: <IconUsers size={24} />, color: 'blue', href: '/members' },
    { key: 'calendar', label: sd.linkCalendar, icon: <IconCalendarEvent size={24} />, color: 'violet', href: '/calendar' },
    { key: 'cultos', label: sd.linkCultos, icon: <IconBuildingChurch size={24} />, color: 'teal', href: '/cultos' },
    { key: 'minutes', label: sd.linkMinutes, icon: <IconFileText size={24} />, color: 'orange', href: '/atas' },
    { key: 'inventory', label: sd.linkInventory, icon: <IconPackage size={24} />, color: 'green', href: '/inventory' },
    { key: 'reports', label: sd.linkReports, icon: <IconReport size={24} />, color: 'cyan', href: '/members-reports' },
    { key: 'birthdays', label: sd.linkBirthdays, icon: <IconCake size={24} />, color: 'pink', href: '/members-reports?tab=birthdays' },
    { key: 'transfers', label: sd.linkTransfers, icon: <IconArrowsRightLeft size={24} />, color: 'indigo', href: '/members?tab=transfers' },
  ];
  const quickTiles = isIntercessao
    ? allQuickTiles.filter((t) => ['calendar', 'cultos', 'minutes'].includes(t.key))
    : allQuickTiles;

  const renderFeedRow = (row: FeedRow) => (
    <UnstyledButton
      key={row.key}
      w="100%"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        '&:hover': { backgroundColor: 'var(--mantine-color-gray-0)' },
      }}
      onClick={() => row.href && router.push(row.href)}
    >
      <Group gap="sm" wrap="nowrap" p="xs">
        <ThemeIcon color={row.color} variant="light" size="sm">
          {row.icon}
        </ThemeIcon>
        <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
          {row.text}
        </Text>
      </Group>
    </UnstyledButton>
  );

  const quickActions = isIntercessao ? null : (
    <Group gap="xs">
      <Button
        variant="light"
        leftSection={<IconCalendarPlus size={18} />}
        onClick={() => router.push('/cultos')}
      >
        {sd.quickCulto}
      </Button>
      <Button variant="light" leftSection={<IconFilePlus size={18} />} onClick={() => router.push('/atas')}>
        {sd.quickAta}
      </Button>
      <Button variant="light" leftSection={<IconUserPlus size={18} />} onClick={() => router.push('/members')}>
        {sd.quickMember}
      </Button>
      <Button variant="light" leftSection={<IconPackage size={18} />} onClick={() => router.push('/inventory')}>
        {sd.quickLoan}
      </Button>
    </Group>
  );

  const actionGroups = secretaryActions
    ? [
        { key: 'birthdays', title: sd.actionsBirthdays, items: secretaryActions.birthdays_today, color: 'pink', icon: <IconCake size={16} /> },
        { key: 'care', title: sd.actionsCare, items: secretaryActions.absent_pending_contact, color: 'orange', icon: <IconUsers size={16} /> },
        { key: 'visitors', title: sd.actionsVisitors, items: secretaryActions.new_visitors, color: 'violet', icon: <IconUserPlus size={16} /> },
        { key: 'cards', title: sd.actionsCards, items: secretaryActions.cards_expiring, color: 'red', icon: <IconIdBadge size={16} /> },
      ]
    : [];
  const actionCount = actionGroups.reduce((acc, g) => acc + g.items.length, 0);

  const churchName = user?.church?.name ?? '';

  const removeActionItem = (memberId: number) => {
    setSecretaryActions((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        birthdays_today: prev.birthdays_today.filter((i) => i.member_id !== memberId),
        absent_pending_contact: prev.absent_pending_contact.filter((i) => i.member_id !== memberId),
        new_visitors: prev.new_visitors.filter((i) => i.member_id !== memberId),
        cards_expiring: prev.cards_expiring.filter((i) => i.member_id !== memberId),
      };
    });
  };

  return (
    <>
      <PageHeader title={headerTitle} description={sd.subtitle}>
        {quickActions}
      </PageHeader>

      {loading ? (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 7 }} spacing="sm" mb="lg">
            {statCards.map((c) => (
              <Skeleton key={c.key} height={104} />
            ))}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Skeleton height={260} />
            <Skeleton height={260} />
          </SimpleGrid>
        </>
      ) : error ? (
        <Center py="xl">
          <Text c="dimmed">{sd.loadError}</Text>
        </Center>
      ) : (
        <>
          {secretaryActions && (
            <Card withBorder radius="md" p="md" mb="lg" data-testid="secretary-actions">
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <ThemeIcon color="green" variant="light" size="md">
                    <IconBrandWhatsapp size={16} />
                  </ThemeIcon>
                  <Title order={4} size="md">
                    {sd.actionsTitle}
                  </Title>
                </Group>
                <Badge color="green" variant="light" size="lg" data-testid="secretary-actions-count">
                  {actionCount}
                </Badge>
              </Group>
              {actionCount === 0 ? (
                <Text size="sm" c="dimmed">
                  {sd.actionsEmpty}
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mt="sm">
                  {actionGroups.map((group) =>
                    group.items.length === 0 ? null : (
                      <Stack key={group.key} gap={4}>
                        <Group gap={6} mb={2}>
                          <ThemeIcon color={group.color} variant="light" size="sm">
                            {group.icon}
                          </ThemeIcon>
                          <Text size="sm" fw={700}>
                            {group.title}
                          </Text>
                          <Badge color={group.color} variant="light" size="xs" ml="auto">
                            {group.items.length}
                          </Badge>
                        </Group>
                        {group.items.map((item) => (
                          <Group
                            key={`${group.key}-${item.member_id}`}
                            gap="xs"
                            wrap="nowrap"
                            p={6}
                            style={{ borderRadius: 'var(--mantine-radius-md)' }}
                            data-testid={`sa-row-${group.key}-${item.member_id}`}
                          >
                            <Avatar src={item.photo || null} radius="xl" size="sm">
                              {item.name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                              <Text size="sm" fw={500} truncate>
                                {item.name}
                              </Text>
                              <Text size="xs" c="dimmed" truncate>
                                {item.phone || '—'}
                              </Text>
                            </Stack>
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              onClick={() => setWaAction(item)}
                              data-testid={`sa-wa-${group.key}-${item.member_id}`}
                            >
                              <IconBrandWhatsapp size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                    ),
                  )}
                </SimpleGrid>
              )}
            </Card>
          )}

          <SimpleGrid cols={{ base: 2, sm: 3, lg: 7 }} spacing="sm" mb="lg">
            {statCards.map((card) => (
              <Card key={card.key} withBorder shadow="sm" padding="lg">
                <Stack gap={6} align="flex-start">
                  <ThemeIcon color={card.color} variant="light" size="lg">
                    {card.icon}
                  </ThemeIcon>
                  <Text fw={800} size="xl">
                    {card.value}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {card.label}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

          <Grid mb="lg">
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Card withBorder radius="md" p="md" h="100%">
                <Title order={4} mb="xs" size="md">
                  {sd.todayTitle}
                </Title>
                {feedRows.length === 0 ? (
                  <Center py="lg">
                    <Text size="sm" c="dimmed">
                      {sd.todayEmpty}
                    </Text>
                  </Center>
                ) : (
                  <Stack gap={2}>{feedRows.map(renderFeedRow)}</Stack>
                )}
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 5 }}>
              <Stack gap="md">
                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="md">
                      {sd.recentCultos}
                    </Title>
                    <Text
                      size="xs"
                      c="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push('/cultos')}
                    >
                      {sd.viewAll}
                    </Text>
                  </Group>
                  {recentCultos.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {sd.emptyCultos}
                    </Text>
                  ) : (
                    <Stack gap={4}>
                      {recentCultos.map((c) => (
                        <Group key={c.id} gap="sm" wrap="nowrap" p={4}>
                          <Text size="sm" c="dimmed" style={{ minWidth: 62 }}>
                            {toShortDate(c.date)}
                          </Text>
                          <Text size="sm" c="blue" style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} lineClamp={1} onClick={() => router.push('/cultos')}>
                            {c.typeLabel}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {c.theme}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Card>
                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={4} size="md">
                      {sd.recentMinutes}
                    </Title>
                    <Text
                      size="xs"
                      c="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push('/atas')}
                    >
                      {sd.viewAll}
                    </Text>
                  </Group>
                  {recentMinutes.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {sd.emptyMinutes}
                    </Text>
                  ) : (
                    <Stack gap={4}>
                      {recentMinutes.map((m) => (
                        <Group key={m.id} gap="sm" wrap="nowrap" p={4}>
                          <Text size="sm" c="dimmed" style={{ minWidth: 62 }}>
                            {toShortDate(m.date)}
                          </Text>
                          <Text size="sm" lineClamp={1} style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} c="blue" onClick={() => router.push('/atas')}>
                            {m.title}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>

          <Title order={3} tt="uppercase" size="sm" c="dimmed" mb="xs" fw={700}>
            {sd.quickAccessTitle}
          </Title>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            {quickTiles.map((tile) => (
              <Card
                key={tile.key}
                component="a"
                href={tile.href}
                withBorder
                radius="md"
                p="md"
                style={{ textDecoration: 'none' }}
              >
                <Group gap="sm">
                  <ThemeIcon color={tile.color} variant="light">
                    {tile.icon}
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    {tile.label}
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </>
      )}

      <SendWhatsAppModal
        opened={!!waAction}
        onClose={() => setWaAction(null)}
        member={waAction
          ? { id: waAction.member_id, name: waAction.name, phone: waAction.phone }
          : null}
        defaultCategory={waAction?.category_hint}
        churchName={churchName}
        onSent={(memberId) => removeActionItem(memberId)}
      />
    </>
  );
}
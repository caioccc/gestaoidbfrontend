import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Center,
  Divider,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/router';
import {
  IconBox,
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconCake,
  IconCalendarEvent,
  IconCalendarPlus,
  IconChevronRight,
  IconFileDownload,
  IconFilePlus,
  IconFileText,
  IconIdBadge,
  IconPackage,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from './PageHeader';
import SendWhatsAppModal from './SendWhatsAppModal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import { calendarEventsApi, saveBlob } from '../api/finance';
import { addDays, dateFromApi, dateToApi, eventOccursOn } from '../utils/calendarRecurrence';
import type {
  AppAlert,
  CalendarEvent,
  Loan,
  SecretaryActionItem,
  SecretaryActions,
} from '../types';

const pad = (n: number) => String(n).padStart(2, '0');
const toShortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const UPCOMING_DAYS = 6;

interface CultoRow {
  id: number;
  date: string;
  typeLabel: string;
  theme: string;
  attendees: number;
  visitors: number;
}

interface MinutesRow {
  id: number;
  date: string;
  title: string;
  pdf: string | null;
  pdfName: string | null;
}

interface EventGroup {
  date: string;
  events: CalendarEvent[];
}

interface Kpi {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SectionProps {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}

function Section({ title, hint, action, children, testId }: SectionProps) {
  return (
    <Paper withBorder radius="md" p="md" data-testid={testId}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm" gap="sm">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={4} size="md">
            {title}
          </Title>
          {hint ? (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          ) : null}
        </Stack>
        {action}
      </Group>
      {children}
    </Paper>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Stack gap={0}>
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <Divider my="xs" /> : null}
          {child}
        </React.Fragment>
      ))}
    </Stack>
  );
}

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const isIntercessao = user?.role === 'INTERCESSAO';
  const sd = t.secretaryDashboard;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [cultosMonth, setCultosMonth] = useState(0);
  const [minutesCount, setMinutesCount] = useState(0);
  const [upcoming, setUpcoming] = useState<EventGroup[]>([]);
  const [todayISO, setTodayISO] = useState('');
  const [secretaryActions, setSecretaryActions] = useState<SecretaryActions | null>(null);
  const [waAction, setWaAction] = useState<SecretaryActionItem | null>(null);
  const [recentCultos, setRecentCultos] = useState<CultoRow[]>([]);
  const [recentMinutes, setRecentMinutes] = useState<MinutesRow[]>([]);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  useEffect(() => {
    let active = true;
    const today = new Date();
    const monthPrefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setLoading(true);
    setError(false);
    setTodayISO(dateToApi(midnight) ?? '');

    Promise.all([
      accountsApi.alerts(),
      accountsApi.members(),
      accountsApi.loans(),
      accountsApi.worshipServices(),
      accountsApi.minutes(),
      calendarEventsApi.list(),
      accountsApi.secretaryActions(),
    ])
      .then(([alertsRes, members, loanList, cultos, minutes, events, actions]) => {
        if (!active) return;
        setAlerts(alertsRes.alerts ?? []);
        setLoans(loanList);
        setSecretaryActions(actions);
        setActiveMembers(members.filter((m) => m.status === 'ACTIVE').length);
        setCultosMonth(cultos.filter((c) => c.date.startsWith(monthPrefix)).length);
        setMinutesCount(minutes.length);

        setRecentCultos(
          [...cultos]
            .sort((a, b) => `${b.date}${b.time ?? ''}`.localeCompare(`${a.date}${a.time ?? ''}`))
            .slice(0, 4)
            .map((c) => ({
              id: c.id,
              date: c.date,
              typeLabel: c.service_type_display,
              theme: c.theme,
              attendees: c.attendees,
              visitors: c.visitors,
            })),
        );

        setRecentMinutes(
          [...minutes]
            .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))
            .slice(0, 4)
            .map((m) => ({
              id: m.id,
              date: m.meeting_date,
              title: m.title,
              pdf: m.pdf,
              pdfName: m.pdf_name,
            })),
        );

        const groups: EventGroup[] = [];
        for (let i = 0; i <= UPCOMING_DAYS; i++) {
          const day = addDays(midnight, i);
          const list = events
            .filter((ev) => ev.audience === 'GENERAL' && eventOccursOn(ev, day))
            .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
          if (list.length > 0) {
            groups.push({ date: dateToApi(day) ?? '', events: list });
          }
        }
        setUpcoming(groups);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const greetingTemplate =
    hour === null
      ? sd.greeting
      : hour < 12
        ? sd.greetingMorning
        : hour < 18
          ? sd.greetingAfternoon
          : sd.greetingEvening;
  const headerTitle = firstName
    ? greetingTemplate.replace('{name}', firstName)
    : t.secretaryDashboard.title;
  const churchName = user?.church?.name ?? '';

  const birthdayToday = alerts.filter((a) => a.type === 'birthday_today');
  const birthdayUpcoming = alerts.filter((a) => a.type === 'birthday_upcoming');
  const cardSoon = alerts.filter((a) => a.type === 'card_validity_soon');
  const cardExpired = alerts.filter((a) => a.type === 'card_validity_expired');
  const loanAlerts = isIntercessao
    ? []
    : alerts.filter(
        (a) =>
          a.type === 'loan_return_today' ||
          a.type === 'loan_return_soon' ||
          a.type === 'loan_return_overdue',
      );

  const openLoans = loans.filter((l) => l.returned_at === null).length;
  const overdueLoans = loans.filter((l) => l.status === 'overdue').length;
  const visitors = secretaryActions?.new_visitors ?? [];
  const careList = secretaryActions?.absent_pending_contact ?? [];
  const cardsList = secretaryActions?.cards_expiring ?? [];

  const kpis = useMemo<Kpi[]>(() => {
    const list: Kpi[] = [
      { key: 'members', label: sd.statMembers, value: activeMembers, color: 'blue', icon: <IconUsers size={20} /> },
      { key: 'cultos', label: sd.statCultos, value: cultosMonth, color: 'cyan', icon: <IconBuildingChurch size={20} /> },
      { key: 'visitors', label: sd.statVisitors, value: visitors.length, color: 'grape', icon: <IconUserCheck size={20} /> },
    ];
    if (!isIntercessao) {
      list.push({
        key: 'loans',
        label: sd.statActiveLoans,
        value: openLoans,
        color: overdueLoans > 0 ? 'red' : 'orange',
        icon: <IconBox size={20} />,
        badge: overdueLoans > 0 ? `${overdueLoans} ${sd.badgeOverdue.toLowerCase()}` : undefined,
      });
    }
    list.push(
      { key: 'minutes', label: sd.statMinutes, value: minutesCount, color: 'gray', icon: <IconFileText size={20} /> },
      {
        key: 'birthdays',
        label: sd.statBirthdaysWeek,
        value: birthdayToday.length + birthdayUpcoming.length,
        color: 'pink',
        icon: <IconCake size={20} />,
      },
    );
    return list;
  }, [
    activeMembers,
    birthdayToday.length,
    birthdayUpcoming.length,
    cultosMonth,
    isIntercessao,
    minutesCount,
    openLoans,
    overdueLoans,
    sd,
    visitors.length,
  ]);

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

  const downloadPdf = (item: MinutesRow) => {
    accountsApi
      .minutesPdfDownload(item.id)
      .then((blob) => saveBlob(blob, item.pdfName || 'ata.pdf'))
      .catch(() => notifications.show({ message: sd.loadError, color: 'red' }));
  };

  const go = (href: string) => router.push(href);

  const quickActions = isIntercessao ? null : (
    <Group gap="xs" wrap="wrap">
      <Button
        color="blue"
        leftSection={<IconUserPlus size={18} />}
        onClick={() => go('/members')}
        data-testid="sd-quick-member"
      >
        {sd.quickMember}
      </Button>
      <Button
        variant="light"
        color="cyan"
        leftSection={<IconCalendarPlus size={18} />}
        onClick={() => go('/cultos')}
        data-testid="sd-quick-culto"
      >
        {sd.quickCulto}
      </Button>
      <Button
        variant="light"
        color="orange"
        leftSection={<IconFilePlus size={18} />}
        onClick={() => go('/atas')}
        data-testid="sd-quick-ata"
      >
        {sd.quickAta}
      </Button>
      <Button
        variant="light"
        color="teal"
        leftSection={<IconPackage size={18} />}
        onClick={() => go('/inventory')}
        data-testid="sd-quick-loan"
      >
        {sd.quickLoan}
      </Button>
    </Group>
  );

  const renderKpi = (kpi: Kpi) => (
    <Paper key={kpi.key} withBorder radius="md" p="md" shadow="xs" data-testid={`sd-kpi-${kpi.key}`}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text fz="xl" fw={700} lh={1.1}>
            {kpi.value}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {kpi.label}
          </Text>
        </Stack>
        <ThemeIcon color={kpi.color} variant="light" radius="xl" size="lg">
          {kpi.icon}
        </ThemeIcon>
      </Group>
      {kpi.badge ? (
        <Badge color="red" variant="light" size="xs" mt={8}>
          {kpi.badge}
        </Badge>
      ) : null}
    </Paper>
  );

  const renderContactRow = (
    item: SecretaryActionItem,
    groupKey: string,
    trailing?: React.ReactNode
  ) => (
    <Group
      key={`${groupKey}-${item.member_id}`}
      gap="sm"
      wrap="nowrap"
      py={6}
      data-testid={`sa-row-${groupKey}-${item.member_id}`}
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
      {trailing ?? (
        <ActionIcon
          variant="light"
          color="green"
          size="lg"
          radius="xl"
          onClick={() => setWaAction(item)}
          aria-label={sd.welcomeContact}
          data-testid={`sa-wa-${groupKey}-${item.member_id}`}
        >
          <IconBrandWhatsapp size={16} />
        </ActionIcon>
      )}
    </Group>
  );

  const alertGroups = [
    {
      key: 'birthdays',
      title: sd.alertsBirthdays,
      icon: <IconCake size={16} />,
      color: 'pink',
      count: birthdayToday.length + birthdayUpcoming.length,
      body: (
        <Stack gap={2}>
          {birthdayToday.slice(0, 4).map((a) => (
            <Group key={`bt-${a.member_id ?? a.date}`} gap="xs" wrap="nowrap" py={2}>
              <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                {a.member_name}
              </Text>
              <Badge color="pink" variant="light" size="xs">
                {sd.badgeToday}
              </Badge>
            </Group>
          ))}
          {birthdayUpcoming.slice(0, 3).map((a) => (
            <Group key={`bu-${a.member_id ?? a.date}`} gap="xs" wrap="nowrap" py={2}>
              <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                {a.member_name}
              </Text>
              <Text size="xs" c="dimmed">
                {toShortDate(a.date)}
              </Text>
            </Group>
          ))}
        </Stack>
      ),
    },
    {
      key: 'loans',
      title: sd.alertsLoans,
      icon: <IconPackage size={16} />,
      color: 'orange',
      count: loanAlerts.length,
      body: (
        <Stack gap={2}>
          {loanAlerts.slice(0, 5).map((a) => {
            const overdue = a.type === 'loan_return_overdue';
            const dueToday = a.type === 'loan_return_today';
            return (
              <Group
                key={`loan-${a.loan_id ?? a.item_id ?? a.date}`}
                gap="xs"
                wrap="nowrap"
                py={2}
                data-testid={`sd-alert-${a.type}`}
              >
                <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                  {a.item_name}
                </Text>
                <Text size="xs" c="dimmed" truncate style={{ maxWidth: 110 }}>
                  {a.borrower_name ?? a.member_name}
                </Text>
                <Badge color={overdue ? 'red' : dueToday ? 'orange' : 'blue'} variant="light" size="xs">
                  {overdue ? sd.badgeOverdue : dueToday ? sd.badgeToday : toShortDate(a.date)}
                </Badge>
              </Group>
            );
          })}
        </Stack>
      ),
    },
    {
      key: 'cards',
      title: sd.alertsCards,
      icon: <IconIdBadge size={16} />,
      color: 'red',
      count: cardSoon.length + cardExpired.length,
      body: (
        <Group gap="xs">
          {cardSoon.length > 0 ? (
            <Badge color="orange" variant="light" size="sm">
              {cardSoon.length} {sd.badgeExpiring}
            </Badge>
          ) : null}
          {cardExpired.length > 0 ? (
            <Badge color="red" variant="light" size="sm">
              {cardExpired.length} {sd.badgeExpired}
            </Badge>
          ) : null}
          {cardsList.slice(0, 3).map((item) => (
            <UnstyledButton
              key={`card-${item.member_id}`}
              onClick={() => setWaAction(item)}
              data-testid={`sa-row-cards-${item.member_id}`}
            >
              <Text size="sm" c="dimmed" style={{ textDecoration: 'underline' }}>
                {item.name}
              </Text>
            </UnstyledButton>
          ))}
        </Group>
      ),
    },
    ...(!isIntercessao && careList.length > 0
      ? [
          {
            key: 'care',
            title: sd.alertsCare,
            icon: <IconUsers size={16} />,
            color: 'violet',
            count: careList.length,
            body: <Stack gap={0}>{careList.slice(0, 4).map((i) => renderContactRow(i, 'care'))}</Stack>,
          },
        ]
      : []),
  ].filter((g) => g.count > 0);

  const alertCount = alertGroups.reduce((acc, g) => acc + g.count, 0);

  return (
    <>
      <PageHeader title={headerTitle} description={churchName || sd.subtitle}>
        {quickActions}
      </PageHeader>

      {loading ? (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="md" mb="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={92} radius="md" />
            ))}
          </SimpleGrid>
          <Grid gap="md">
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Skeleton height={220} radius="md" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 5 }}>
              <Skeleton height={220} radius="md" />
            </Grid.Col>
          </Grid>
        </>
      ) : error ? (
        <Center py="xl">
          <Text c="dimmed">{sd.loadError}</Text>
        </Center>
      ) : (
        <>
          <SimpleGrid
            cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
            spacing="md"
            mb="md"
          >
            {kpis.map(renderKpi)}
          </SimpleGrid>

          <Grid gap="md" mb="md">
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Stack gap="md">
                <Section
                  title={sd.welcomeTitle}
                  hint={sd.welcomeHint}
                  testId="secretary-actions"
                  action={
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      rightSection={<IconChevronRight size={14} />}
                      onClick={() => go('/visitors')}
                      data-testid="sd-visitors-funnel"
                    >
                      {sd.welcomeFunnel}
                    </Button>
                  }
                >
                  {visitors.length === 0 ? (
                    <Center py="md">
                      <Text size="sm" c="dimmed">
                        {sd.welcomeEmpty}
                      </Text>
                    </Center>
                  ) : (
                    <Rows>
                      {visitors.map((item) => renderContactRow(item, 'visitors'))}
                    </Rows>
                  )}
                </Section>

                <Section
                  title={sd.alertsTitle}
                  hint={sd.alertsHint}
                  testId="secretary-alerts"
                  action={
                    <Badge
                      color={alertCount > 0 ? 'orange' : 'gray'}
                      variant="light"
                      data-testid="secretary-actions-count"
                    >
                      {alertCount}
                    </Badge>
                  }
                >
                  {alertGroups.length === 0 ? (
                    <Center py="md">
                      <Text size="sm" c="dimmed">
                        {sd.alertsEmpty}
                      </Text>
                    </Center>
                  ) : (
                    <Stack gap="md">
                      {alertGroups.map((group) => (
                        <Stack key={group.key} gap={4}>
                          <Group gap={6}>
                            <ThemeIcon color={group.color} variant="light" size="sm">
                              {group.icon}
                            </ThemeIcon>
                            <Text size="sm" fw={700}>
                              {group.title}
                            </Text>
                            <Badge color={group.color} variant="light" size="xs" ml="auto">
                              {group.count}
                            </Badge>
                          </Group>
                          {group.body}
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Section>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 5 }}>
              <Stack gap="md">
                <Section
                  title={sd.recentCultos}
                  testId="sd-recent-cultos"
                  action={
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      rightSection={<IconChevronRight size={14} />}
                      onClick={() => go('/cultos')}
                    >
                      {sd.viewAll}
                    </Button>
                  }
                >
                  {recentCultos.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {sd.emptyCultos}
                    </Text>
                  ) : (
                    <Rows>
                      {recentCultos.map((c) => (
                        <Group key={c.id} gap="sm" wrap="nowrap" py={8}>
                          <Badge variant="light" color="cyan" size="sm" style={{ flexShrink: 0 }}>
                            {toShortDate(c.date)}
                          </Badge>
                          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={500} truncate>
                              {c.typeLabel}
                            </Text>
                            {c.theme ? (
                              <Text size="xs" c="dimmed" truncate>
                                {c.theme}
                              </Text>
                            ) : null}
                            <Text size="xs" c="dimmed">
                              {sd.cultosStats
                                .replace('{attendees}', String(c.attendees))
                                .replace('{visitors}', String(c.visitors))}
                            </Text>
                          </Stack>
                        </Group>
                      ))}
                    </Rows>
                  )}
                </Section>

                <Section
                  title={sd.recentMinutes}
                  testId="sd-recent-minutes"
                  action={
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      rightSection={<IconChevronRight size={14} />}
                      onClick={() => go('/atas')}
                    >
                      {sd.viewAll}
                    </Button>
                  }
                >
                  {recentMinutes.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {sd.emptyMinutes}
                    </Text>
                  ) : (
                    <Rows>
                      {recentMinutes.map((m) => (
                        <Group key={m.id} gap="sm" wrap="nowrap" py={8}>
                          <ThemeIcon color="gray" variant="light" size="md" radius="md">
                            <IconFileText size={16} />
                          </ThemeIcon>
                          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={500} truncate>
                              {m.title}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {toShortDate(m.date)}
                            </Text>
                          </Stack>
                          {m.pdf ? (
                            <ActionIcon
                              variant="light"
                              color="gray"
                              onClick={() => downloadPdf(m)}
                              aria-label={sd.minutesDownload}
                              data-testid={`sd-minutes-pdf-${m.id}`}
                            >
                              <IconFileDownload size={16} />
                            </ActionIcon>
                          ) : null}
                        </Group>
                      ))}
                    </Rows>
                  )}
                </Section>
              </Stack>
            </Grid.Col>
          </Grid>

          <Section
            title={sd.upcomingTitle}
            hint={sd.upcomingHint}
            testId="sd-upcoming-events"
            action={
              <Button
                variant="subtle"
                size="compact-sm"
                rightSection={<IconChevronRight size={14} />}
                onClick={() => go('/calendar')}
              >
                {sd.viewCalendar}
              </Button>
            }
          >
            {upcoming.length === 0 ? (
              <Center py="md">
                <Text size="sm" c="dimmed">
                  {sd.upcomingEmpty}
                </Text>
              </Center>
            ) : (
              <Stack gap="md">
                {upcoming.map((group) => (
                  <Stack key={group.date} gap={4}>
                    <Text size="xs" fw={700} c="dimmed">
                      {group.date === todayISO
                        ? sd.eventsToday
                        : group.date === dateToApi(addDays(dateFromApi(todayISO), 1))
                          ? sd.eventsTomorrow
                          : toShortDate(group.date)}
                    </Text>
                    <Stack gap={4}>
                      {group.events.map((ev) => (
                        <Group key={`${group.date}-${ev.id}`} gap="sm" wrap="nowrap">
                          <ThemeIcon color="violet" variant="light" size="sm" radius="md">
                            <IconCalendarEvent size={14} />
                          </ThemeIcon>
                          <Text size="sm" c="dimmed" style={{ minWidth: 42 }}>
                            {ev.start_time ? ev.start_time.slice(0, 5) : '—'}
                          </Text>
                          <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                            {ev.title}
                          </Text>
                          <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
                            {ev.category_display}
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Section>
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

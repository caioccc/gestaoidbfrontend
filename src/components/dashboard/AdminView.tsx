import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowDownCircle,
  IconBook2,
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconCalendarEvent,
  IconChartDonut,
  IconFileText,
  IconNotes,
  IconReport,
  IconUserHeart,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { accountsApi } from '../../api/accounts';
import { calendarEventsApi, financeApi } from '../../api/finance';
import { musicApi } from '../../api/music';
import { useAuth, useRoleHelpers } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import type {
  CalendarEvent,
  DashboardSummary,
  Member,
  PrayerRequest,
  WorshipService,
} from '../../types';
import { daysSinceLastContact } from '../../utils/whatsapp';
import {
  DashboardTone,
  EmptyState,
  FeedRow,
  KpiCard,
  QuickAction,
  QuickActionsGroup,
  SectionCard,
  SkeletonCards,
} from './primitives';
import MemberFunnelCard from './MemberFunnelCard';
import MonthFinanceCard from './MonthFinanceCard';

const SHORTCUT_KEYS = [
  'members',
  'visitors',
  'prayer',
  'cultos',
  'visitation',
  'growthGroups',
  'calendar',
  'minutes',
  'exits',
  'reports',
] as const;

type ShortcutKey = (typeof SHORTCUT_KEYS)[number];

const SHORTCUT_META: Record<ShortcutKey, { href: string; tone: DashboardTone }> = {
  members: { href: '/members', tone: 'blue' },
  visitors: { href: '/visitors', tone: 'cyan' },
  prayer: { href: '/prayer-requests', tone: 'violet' },
  cultos: { href: '/cultos', tone: 'grape' },
  visitation: { href: '/visitation', tone: 'teal' },
  growthGroups: { href: '/growth-groups', tone: 'indigo' },
  calendar: { href: '/calendar', tone: 'orange' },
  minutes: { href: '/atas', tone: 'gray' },
  exits: { href: '/exits', tone: 'red' },
  reports: { href: '/reports', tone: 'teal' },
};

const SHORTCUT_ICONS: Record<ShortcutKey, React.ReactNode> = {
  members: <IconUsers size={16} />,
  visitors: <IconUserPlus size={16} />,
  prayer: <IconNotes size={16} />,
  cultos: <IconBuildingChurch size={16} />,
  visitation: <IconUserHeart size={16} />,
  growthGroups: <IconUsersGroup size={16} />,
  calendar: <IconCalendarEvent size={16} />,
  minutes: <IconFileText size={16} />,
  exits: <IconArrowDownCircle size={16} />,
  reports: <IconReport size={16} />,
};

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function AdminView({ year }: { year: number }) {
  const { t } = useLanguage();
  const router = useRouter();
  const dv = t.dashboardViews;
  const { user } = useAuth();
  const { canViewMusic, canManageMusic } = useRoleHelpers(user);
  const canSeeSetlists = canViewMusic || canManageMusic;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [services, setServices] = useState<WorshipService[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [setlistCount, setSetlistCount] = useState<number | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthKey = `${year}-${String(currentMonth).padStart(2, '0')}`;
  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const requests: Promise<unknown>[] = [
      accountsApi.members(),
      accountsApi.prayerRequests(),
      accountsApi.worshipServices(),
      financeApi.dashboardSummary(year),
      calendarEventsApi.list(),
    ];

    if (canSeeSetlists) {
      requests.push(
        musicApi.bandSetlists({ month: currentMonthKey }).then((items) => items.length),
      );
    }

    Promise.allSettled(requests)
      .then((results) => {
        if (!active) return;
        const [mem, pray, svc, fin, evt, setlists] = results;
        if (mem.status === 'fulfilled') setMembers(mem.value as Member[]);
        if (pray.status === 'fulfilled') setPrayers(pray.value as PrayerRequest[]);
        if (svc.status === 'fulfilled') setServices(svc.value as WorshipService[]);
        if (fin.status === 'fulfilled') setSummary(fin.value as DashboardSummary);
        if (evt.status === 'fulfilled') setEvents(evt.value as CalendarEvent[]);
        if (setlists?.status === 'fulfilled') setSetlistCount(setlists.value as number);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, currentMonthKey, canSeeSetlists]);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'ACTIVE'),
    [members],
  );

  const absentMembers = useMemo(
    () => members.filter((member) => member.lifecycle_stage === 'ABSENT_CARE'),
    [members],
  );

  const newMembers = useMemo(() => {
    const from = `${currentMonthKey}-01`;
    const to = `${currentMonthKey}-${String(new Date(year, currentMonth, 0).getDate()).padStart(2, '0')}`;
    return members.filter((member) => {
      const created = (member.created_at ?? '').slice(0, 10);
      return created >= from && created <= to;
    });
  }, [members, currentMonthKey, year, currentMonth]);

  const monthServices = useMemo(
    () => services.filter((service) => service.date.startsWith(currentMonthKey)),
    [services, currentMonthKey],
  );

  const monthTotals = useMemo(
    () =>
      monthServices.reduce(
        (acc, service) => ({
          attendees: acc.attendees + (service.attendees ?? 0),
          visitors: acc.visitors + (service.visitors ?? 0),
          conversions: acc.conversions + (service.conversions ?? 0),
        }),
        { attendees: 0, visitors: 0, conversions: 0 },
      ),
    [monthServices],
  );

  const pendingPrayers = useMemo(
    () =>
      prayers
        .filter((prayer) => prayer.status === 'PENDING' || prayer.status === 'PRAYING')
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [prayers],
  );

  const recentMembers = useMemo(
    () => [...members].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    [members],
  );

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => (event.date ? event.date >= todayISO : true))
        .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
        .slice(0, 6),
    [events, todayISO],
  );

  const nextService = useMemo(
    () =>
      [...services]
        .filter((service) => service.date >= todayISO)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null,
    [services, todayISO],
  );

  const monthPoint = useMemo(
    () => summary?.series.find((point) => point.month === currentMonth) ?? null,
    [summary, currentMonth],
  );

  const contactHint = (member: Member) => {
    const days = daysSinceLastContact(member.last_contact_at);
    if (days === null) return t.funnel.noContact;
    if (days === 0) return t.funnel.today;
    return t.funnel.daysSince.replace('{n}', String(days));
  };

  const absentHint = useMemo(() => {
    const sample = absentMembers[0];
    return sample ? contactHint(sample) : dv.psAwaitingContact;
  }, [absentMembers, dv.psAwaitingContact]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: 'member',
        label: dv.adQuickNewMember,
        icon: <IconUserPlus size={16} />,
        color: 'blue',
        onClick: () => void router.push('/members'),
      },
      {
        key: 'prayer',
        label: dv.adQuickPrayer,
        icon: <IconNotes size={16} />,
        color: 'violet',
        onClick: () => void router.push('/prayer-requests'),
      },
      {
        key: 'exit',
        label: dv.adQuickNewExit,
        icon: <IconArrowDownCircle size={16} />,
        color: 'red',
        onClick: () => void router.push('/exits'),
      },
      {
        key: 'event',
        label: dv.adQuickNewEvent,
        icon: <IconCalendarEvent size={16} />,
        color: 'orange',
        onClick: () => void router.push('/calendar'),
      },
      {
        key: 'reports',
        label: dv.adQuickReports,
        icon: <IconReport size={16} />,
        color: 'teal',
        onClick: () => void router.push('/reports'),
      },
    ],
    [dv, router],
  );

  const shortcutItems = useMemo(
    () =>
      SHORTCUT_KEYS.map((key) => ({
        key,
        label: dv.shortcuts[key],
        icon: SHORTCUT_ICONS[key],
        ...SHORTCUT_META[key],
      })),
    [dv],
  );

  return (
    <Stack gap="lg">
      <QuickActionsGroup actions={quickActions} />

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg">
          <KpiCard
            label={dv.adActiveMembers}
            value={activeMembers.length}
            icon={<IconUsers size={24} />}
            color="blue"
            hint={`${newMembers.length} ${dv.adNewInMonth}`}
            onClick={() => void router.push('/members')}
          />
          <KpiCard
            label={dv.adPendingPrayers}
            value={pendingPrayers.length}
            icon={<IconNotes size={24} />}
            color="red"
            hint={dv.psAwaitingResponse}
            onClick={() => void router.push('/prayer-requests')}
          />
          <KpiCard
            label={dv.adAbsentCare}
            value={absentMembers.length}
            icon={<IconUserHeart size={24} />}
            color="orange"
            hint={absentHint}
            onClick={() => void router.push('/visitors')}
          />
          <KpiCard
            label={dv.adCultosThisMonth}
            value={monthServices.length}
            icon={<IconBuildingChurch size={24} />}
            color="grape"
            hint={`${monthTotals.visitors} ${dv.psNewVisitors}`}
            onClick={() => void router.push('/cultos')}
          />
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <MonthFinanceCard
          entries={monthPoint?.entries ?? 0}
          exits={monthPoint?.exits ?? 0}
          balance={monthPoint?.monthly_balance ?? 0}
          loading={loading}
          onClickEntries={() => void router.push('/entries')}
          onClickExits={() => void router.push('/exits')}
          onClickBalance={() => void router.push('/statement')}
        />

        <SectionCard
          title={dv.psNextService}
          description={dv.psNextServiceHint}
          icon={<IconBuildingChurch size={18} />}
          color="grape"
          loading={loading}
          skeletonHeight={150}
        >
          {nextService ? (
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={700} lineClamp={1}>
                    {nextService.service_type_display}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {formatShortDate(nextService.date)}
                    {nextService.time ? ` · ${nextService.time.slice(0, 5)}` : ''}
                  </Text>
                </Box>
                <Badge color="grape" variant="light">
                  {nextService.date === todayISO ? dv.psToday : dv.psUpcoming}
                </Badge>
              </Group>
              {nextService.theme ? (
                <Text size="sm" lineClamp={2}>
                  <Text span fw={600}>
                    {dv.psTheme}:
                  </Text>{' '}
                  {nextService.theme}
                </Text>
              ) : null}
              <Group gap="xs">
                {setlistCount !== null ? (
                  <Badge variant="light" color="indigo" leftSection={<IconBook2 size={12} />}>
                    {setlistCount} {dv.psSetlists}
                  </Badge>
                ) : null}
                <Badge variant="light" color="teal">
                  {monthTotals.conversions} {dv.psConversions}
                </Badge>
              </Group>
            </Stack>
          ) : (
            <EmptyState label={dv.psNoUpcomingService} icon={<IconBuildingChurch size={30} />} />
          )}
        </SectionCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard
          title={dv.psPrayerWall}
          description={dv.psPrayerWallHint}
          icon={<IconNotes size={18} />}
          color="violet"
          loading={loading}
          skeletonHeight={240}
          minHeight={320}
          action={
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => void router.push('/prayer-requests')}
            >
              {dv.viewAll}
            </Button>
          }
        >
          {pendingPrayers.length === 0 ? (
            <EmptyState label={dv.psNoPrayers} />
          ) : (
            <Stack gap={2}>
              {pendingPrayers.slice(0, 5).map((prayer) => (
                <FeedRow
                  key={prayer.id}
                  icon={<IconNotes size={16} />}
                  color={prayer.status === 'PENDING' ? 'red' : 'violet'}
                  title={prayer.is_anonymous ? dv.psAnonymous : prayer.requester_name}
                  description={`${prayer.category_display} · ${formatShortDate(prayer.created_at)}`}
                  trailing={
                    prayer.whatsapp_url ? (
                      <Tooltip label={dv.psContactWhatsapp} withArrow>
                        <ActionIcon
                          component="a"
                          href={prayer.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="subtle"
                          color="green"
                          size="sm"
                          aria-label={dv.psContactWhatsapp}
                        >
                          <IconBrandWhatsapp size={16} />
                        </ActionIcon>
                      </Tooltip>
                    ) : null
                  }
                  onClick={() => void router.push('/prayer-requests')}
                />
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title={dv.adRecentMembers}
          description={dv.adRecentMembersHint}
          icon={<IconUsersGroup size={18} />}
          color="blue"
          loading={loading}
          skeletonHeight={240}
          minHeight={320}
          action={
            <Button variant="subtle" size="compact-xs" onClick={() => void router.push('/members')}>
              {dv.viewAll}
            </Button>
          }
        >
          {recentMembers.length === 0 ? (
            <EmptyState label={dv.adNoMembers} />
          ) : (
            <Stack gap={2}>
              {recentMembers.map((member) => (
                <FeedRow
                  key={member.id}
                  icon={<IconUserPlus size={16} />}
                  color="blue"
                  title={member.name}
                  description={`${member.status_display}${
                    member.created_at ? ` · ${formatShortDate(member.created_at)}` : ''
                  }`}
                  onClick={() => void router.push('/members')}
                />
              ))}
            </Stack>
          )}
        </SectionCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <MemberFunnelCard members={members} loading={loading} />

        <SectionCard
          title={dv.psAgenda}
          description={dv.adAgendaHint}
          icon={<IconCalendarEvent size={18} />}
          color="orange"
          loading={loading}
          skeletonHeight={240}
          minHeight={320}
          action={
            <Button variant="subtle" size="compact-xs" onClick={() => void router.push('/calendar')}>
              {dv.viewAll}
            </Button>
          }
        >
          {upcomingEvents.length === 0 ? (
            <EmptyState label={dv.psNoEvents} />
          ) : (
            <Stack gap={2}>
              {upcomingEvents.map((event) => (
                <FeedRow
                  key={event.id}
                  icon={<IconCalendarEvent size={16} />}
                  color="orange"
                  title={event.title}
                  description={event.date ? formatShortDate(event.date) : event.category_display}
                  onClick={() => void router.push('/calendar')}
                />
              ))}
            </Stack>
          )}
        </SectionCard>
      </SimpleGrid>

      <SectionCard
        title={dv.adShortcuts}
        description={dv.adShortcutsHint}
        icon={<IconChartDonut size={18} />}
        color="gray"
        loading={loading}
        skeletonHeight={140}
      >
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          {shortcutItems.map((item) => (
            <Button
              key={item.key}
              variant="light"
              color={item.tone}
              leftSection={item.icon}
              justify="start"
              fullWidth
              onClick={() => void router.push(item.href)}
            >
              <Text size="xs" fw={600} lineClamp={1}>
                {item.label}
              </Text>
            </Button>
          ))}
        </SimpleGrid>
      </SectionCard>
    </Stack>
  );
}

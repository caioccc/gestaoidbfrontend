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
  IconBook2,
  IconBrandWhatsapp,
  IconBuildingChurch,
  IconCalendarPlus,
  IconClock,
  IconHandStop,
  IconHeartHandshake,
  IconNotes,
  IconTrendingUp,
  IconUserHeart,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { accountsApi, growthGroupsApi } from '../../api/accounts';
import { calendarEventsApi, financeApi } from '../../api/finance';
import { musicApi } from '../../api/music';
import { useAuth, useRoleHelpers } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import type {
  CalendarEvent,
  DashboardSummary,
  GrowthGroup,
  LifecycleStage,
  Member,
  PastoralVisit,
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

const STAGE_TONE: Record<LifecycleStage, DashboardTone> = {
  VISITOR: 'violet',
  INTEGRATION: 'blue',
  ACTIVE: 'teal',
  ABSENT_CARE: 'orange',
  TRANSITION: 'gray',
};

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function PastorView({ year }: { year: number }) {
  const { t } = useLanguage();
  const router = useRouter();
  const dv = t.dashboardViews;
  const { user } = useAuth();
  const { canViewMusic, canManageMusic } = useRoleHelpers(user);
  const canSeeSetlists = canViewMusic || canManageMusic;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<GrowthGroup[]>([]);
  const [services, setServices] = useState<WorshipService[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [visits, setVisits] = useState<PastoralVisit[]>([]);
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
      growthGroupsApi.list(),
      accountsApi.worshipServices(),
      accountsApi.prayerRequests(),
      accountsApi.pastoralVisits({ year }),
      financeApi.dashboardSummary(year),
      calendarEventsApi.list(),
    ];

    if (canSeeSetlists) {
      requests.push(musicApi.bandSetlists({ month: currentMonthKey }).then((items) => items.length));
    }

    Promise.allSettled(requests)
      .then((results) => {
        if (!active) return;
        const [mem, grp, svc, pray, vis, fin, evt, setlists] = results;
        if (mem.status === 'fulfilled') setMembers(mem.value as Member[]);
        if (grp.status === 'fulfilled') setGroups(grp.value as GrowthGroup[]);
        if (svc.status === 'fulfilled') setServices(svc.value as WorshipService[]);
        if (pray.status === 'fulfilled') setPrayers(pray.value as PrayerRequest[]);
        if (vis.status === 'fulfilled') setVisits(vis.value as PastoralVisit[]);
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

  const monthServices = useMemo(
    () => services.filter((service) => service.date.startsWith(currentMonthKey)),
    [services, currentMonthKey],
  );

  const nextService = useMemo(
    () =>
      [...services]
        .filter((service) => service.date >= todayISO)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null,
    [services, todayISO],
  );

  const pendingPrayers = useMemo(
    () => prayers.filter((prayer) => prayer.status === 'PENDING' || prayer.status === 'PRAYING'),
    [prayers],
  );

  const recentPrayers = useMemo(
    () => [...prayers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [prayers],
  );

  const upcomingVisits = useMemo(
    () =>
      visits
        .filter((visit) => visit.status === 'PLANNED' && visit.scheduled_date >= todayISO)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .slice(0, 5),
    [visits, todayISO],
  );

  const activeGroups = useMemo(() => groups.filter((group) => group.is_active), [groups]);

  const todayGroups = useMemo(() => {
    // GrowthGroup.weekday usa a mesma convenção de CalendarEvent.weekdays (0 = segunda).
    const weekdayCode = (new Date().getDay() + 6) % 7;
    return activeGroups.filter((group) => group.weekday === weekdayCode);
  }, [activeGroups]);

  const monthPoint = useMemo(
    () => summary?.series.find((point) => point.month === currentMonth) ?? null,
    [summary, currentMonth],
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

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => (event.date ? event.date >= todayISO : true))
        .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
        .slice(0, 5),
    [events, todayISO],
  );

  const contactHint = (member: Member) => {
    const days = daysSinceLastContact(member.last_contact_at);
    if (days === null) return t.funnel.noContact;
    if (days === 0) return t.funnel.today;
    return t.funnel.daysSince.replace('{n}', String(days));
  };

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: 'culto',
        label: dv.psQuickCulto,
        icon: <IconBuildingChurch size={16} />,
        color: 'grape',
        onClick: () => void router.push('/cultos'),
      },
      {
        key: 'visita',
        label: dv.psQuickVisit,
        icon: <IconCalendarPlus size={16} />,
        color: 'violet',
        onClick: () => void router.push('/visitation'),
      },
      {
        key: 'oracao',
        label: dv.psQuickPrayers,
        icon: <IconNotes size={16} />,
        color: 'blue',
        onClick: () => void router.push('/prayer-requests'),
      },
      {
        key: 'setlists',
        label: dv.psQuickSetlists,
        icon: <IconBook2 size={16} />,
        color: 'indigo',
        onClick: () => void router.push('/setlists'),
        disabled: !canSeeSetlists,
      },
    ],
    [dv, router, canSeeSetlists],
  );

  return (
    <Stack gap="lg">
      <QuickActionsGroup actions={quickActions} />

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg">
          <KpiCard
            label={dv.psActiveMembers}
            value={activeMembers.length}
            icon={<IconUsers size={24} />}
            color="blue"
            hint={`${absentMembers.length} ${dv.psAbsentCareCount}`}
            onClick={() => void router.push('/visitors')}
          />
          <KpiCard
            label={dv.psNewVisitors}
            value={monthTotals.visitors}
            icon={<IconUserPlus size={24} />}
            color="cyan"
            hint={dv.psInFunnel}
            onClick={() => void router.push('/visitors')}
          />
          <KpiCard
            label={dv.psGrowthGroups}
            value={activeGroups.length}
            icon={<IconUsersGroup size={24} />}
            color="indigo"
            hint={`${todayGroups.length} ${dv.psMeetingsThisWeek}`}
            onClick={() => void router.push('/growth-groups')}
          />
          <KpiCard
            label={dv.psPendingPrayers}
            value={pendingPrayers.length}
            icon={<IconHandStop size={24} />}
            color="red"
            hint={dv.psAwaitingResponse}
            onClick={() => void router.push('/prayer-requests')}
          />
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard
          title={dv.psNextService}
          description={dv.psNextServiceHint}
          icon={<IconBuildingChurch size={18} />}
          color="grape"
          loading={loading}
          skeletonHeight={200}
        >
          {nextService ? (
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={700} size="lg" lineClamp={1}>
                    {nextService.service_type_display}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {formatShortDate(nextService.date)}
                    {nextService.time ? ` · ${nextService.time.slice(0, 5)}` : ''}
                  </Text>
                </Box>
                <Badge color="grape" variant="light" size="lg">
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
              {nextService.preacher ? (
                <Text size="sm" lineClamp={1}>
                  <Text span fw={600}>
                    {dv.psPreacher}:
                  </Text>{' '}
                  {nextService.preacher}
                </Text>
              ) : null}
              <Group gap="xs">
                {setlistCount !== null ? (
                  <Badge variant="light" color="indigo" leftSection={<IconBook2 size={12} />}>
                    {setlistCount} {dv.psSetlists}
                  </Badge>
                ) : null}
                <Badge variant="light" color="teal" leftSection={<IconTrendingUp size={12} />}>
                  {monthTotals.conversions} {dv.psConversions}
                </Badge>
              </Group>
            </Stack>
          ) : (
            <EmptyState label={dv.psNoUpcomingService} icon={<IconBuildingChurch size={30} />} />
          )}
        </SectionCard>

        <MemberFunnelCard members={members} loading={loading} />
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
          {recentPrayers.length === 0 ? (
            <EmptyState label={dv.psNoPrayers} />
          ) : (
            <Stack gap={2}>
              {recentPrayers.map((prayer) => (
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
          title={dv.psVisitsAndAbsent}
          description={dv.psVisitsAndAbsentHint}
          icon={<IconHeartHandshake size={18} />}
          color="teal"
          loading={loading}
          skeletonHeight={240}
          minHeight={320}
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {dv.psUpcomingVisits}
              </Text>
              <Badge variant="light" color="violet">
                {upcomingVisits.length}
              </Badge>
            </Group>
            {upcomingVisits.length === 0 ? (
              <Text size="sm" c="dimmed">
                {dv.psNoUpcomingVisits}
              </Text>
            ) : (
              <Stack gap={2}>
                {upcomingVisits.map((visit) => (
                  <FeedRow
                    key={visit.id}
                    icon={<IconClock size={16} />}
                    color="violet"
                    title={visit.member_name || visit.target_name || dv.psVisit}
                    description={`${formatShortDate(visit.scheduled_date)} · ${visit.visit_type_display}`}
                    onClick={() => void router.push('/visitation')}
                  />
                ))}
              </Stack>
            )}

            <Group justify="space-between" mt="xs">
              <Text size="sm" fw={600}>
                {dv.psAbsentCare}
              </Text>
              <Badge variant="light" color={STAGE_TONE.ABSENT_CARE}>
                {absentMembers.length}
              </Badge>
            </Group>
            {absentMembers.length === 0 ? (
              <Text size="sm" c="dimmed">
                {dv.psNoAbsent}
              </Text>
            ) : (
              <Stack gap={2}>
                {absentMembers.slice(0, 3).map((member) => (
                  <FeedRow
                    key={member.id}
                    icon={<IconUserHeart size={16} />}
                    color="orange"
                    title={member.name}
                    description={contactHint(member)}
                    onClick={() => void router.push('/visitors')}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </SectionCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
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
          title={dv.psAgenda}
          icon={<IconBuildingChurch size={18} />}
          color="grape"
          loading={loading}
          skeletonHeight={120}
          minHeight={200}
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
                  icon={<IconBuildingChurch size={16} />}
                  color="grape"
                  title={event.title}
                  description={event.date ? formatShortDate(event.date) : event.category_display}
                  onClick={() => void router.push('/calendar')}
                />
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title={dv.psMonthSummary}
          icon={<IconTrendingUp size={18} />}
          color="blue"
          loading={loading}
          skeletonHeight={120}
          minHeight={200}
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {dv.psCultosHeld}
              </Text>
              <Text size="sm" fw={700}>
                {monthServices.length}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {dv.psAttendance}
              </Text>
              <Text size="sm" fw={700}>
                {monthTotals.attendees}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {dv.psConversions}
              </Text>
              <Text size="sm" fw={700} c="teal.7">
                {monthTotals.conversions}
              </Text>
            </Group>
          </Stack>
        </SectionCard>
      </SimpleGrid>
    </Stack>
  );
}

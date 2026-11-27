import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Alert, Button, Center, Group, Loader, Stack, Tabs, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import AuthGuard from '../../../../components/AuthGuard';
import Layout from '../../../../components/Layout';
import PageHeader from '../../../../components/PageHeader';
import CheckinConfigPanel from '../../../../components/CheckinConfigPanel';
import CheckinRowsPanel from '../../../../components/CheckinRowsPanel';
import CheckinReportPanel from '../../../../components/CheckinReportPanel';
import CheckinSessionsPanel from '../../../../components/CheckinSessionsPanel';
import CheckinTeamPanel from '../../../../components/CheckinTeamPanel';
import EventRegistrationsPanel from '../../../../components/EventRegistrationsPanel';
import { eventCheckinApi } from '../../../../api/checkin';
import { useLanguage } from '../../../../i18n';
import { useFeedback } from '../../../../hooks/useFeedback';
import type {
  Event,
  EventCheckinConfig,
  EventCheckinSession,
  EventCheckinTeamMember,
} from '../../../../types';

const CHECKIN_ROLES = ['PASTOR', 'SECRETARIA', 'TESOUREIRO', 'ADMIN'];

export default function EventCheckinPage() {
  const { t } = useLanguage();
  const fb = useFeedback();
  const router = useRouter();
  const eventIdValue = Array.isArray(router.query.eventId)
    ? router.query.eventId[0]
    : router.query.eventId;
  const eventId = Number(eventIdValue);
  const [event, setEvent] = useState<Event | null>(null);
  const [config, setConfig] = useState<EventCheckinConfig | null>(null);
  const [sessions, setSessions] = useState<EventCheckinSession[]>([]);
  const [team, setTeam] = useState<EventCheckinTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string | null>('overview');

  const validId = Number.isFinite(eventId) && eventId > 0;

  useEffect(() => {
    if (router.isReady && typeof router.query.tab === 'string') setTab(router.query.tab);
  }, [router.isReady, router.query.tab]);

  const changeTab = (next: string | null) => {
    setTab(next);
    router.replace(
      { pathname: router.pathname, query: { ...router.query, tab: next ?? 'overview' } },
      undefined,
      { shallow: true }
    );
  };

  const load = useCallback(async () => {
    if (!validId) return;
    setLoading(true);
    try {
      const [eventRecord, configs] = await Promise.all([
        eventCheckinApi.getEvent(eventId),
        eventCheckinApi.listConfigs({ checkinEvent: eventId }),
      ]);
      const current = configs[0] ?? null;
      setEvent(eventRecord);
      setConfig(current);
      if (current) {
        const [sessionList, teamList] = await Promise.all([
          eventCheckinApi.listSessions(current.id),
          eventCheckinApi.listTeam(current.id),
        ]);
        setSessions(sessionList);
        setTeam(teamList);
      } else {
        setSessions([]);
        setTeam([]);
      }
    } catch (err) {
      fb.fromError(err, t.common.toast.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [eventId, validId, fb, t.common.toast.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const defaultSession = useMemo(() => sessions[0]?.id, [sessions]);

  return (
    <AuthGuard roles={CHECKIN_ROLES}>
      <Layout>
        <PageHeader title={t.eventCheckin.title} description={event?.title || undefined}>
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => router.push('/events')}
          >
            {t.nav.events}
          </Button>
        </PageHeader>

        {loading || !validId ? (
          <Center h="50vh"><Loader /></Center>
        ) : !event ? (
          <Alert color="red" title={t.events.publicForm.invalid} />
        ) : (
          <Stack gap="md">
            <Tabs value={tab} onChange={changeTab} variant="pills">
              <Tabs.List>
                <Tabs.Tab value="overview" data-testid="checkin-tab-overview">
                  {t.eventCheckin.tabs.overview}
                </Tabs.Tab>
                <Tabs.Tab value="registrations" data-testid="checkin-tab-registrations">
                  {t.eventCheckin.tabs.registrations}
                </Tabs.Tab>
                <Tabs.Tab value="team" data-testid="checkin-tab-team">
                  {t.eventCheckin.tabs.team}
                </Tabs.Tab>
                <Tabs.Tab value="sessions" data-testid="checkin-tab-sessions">
                  {t.eventCheckin.tabs.sessions}
                </Tabs.Tab>
                <Tabs.Tab value="checkins" data-testid="checkin-tab-checkins">
                  {t.eventCheckin.tabs.checkins}
                </Tabs.Tab>
                <Tabs.Tab value="reports" data-testid="checkin-tab-reports">
                  {t.eventCheckin.tabs.reports}
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            {tab === 'overview' ? (
              <Stack gap="md">
                <CheckinConfigPanel event={event} config={config} onChanged={load} />
                {config ? (
                  <Group gap="lg">
                    <Text size="sm" c="dimmed">
                      {t.eventCheckin.sessions.checkins}: {sessions.reduce((sum, item) => sum + item.checkin_count, 0)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {t.eventCheckin.team.title}: {team.length}
                    </Text>
                  </Group>
                ) : null}
              </Stack>
            ) : tab === 'registrations' ? (
              <EventRegistrationsPanel event={event} onChanged={load} />
            ) : !config ? (
              <Text c="dimmed" ta="center" py="xl">
                {t.eventCheckin.config.create}
              </Text>
            ) : tab === 'team' ? (
              <CheckinTeamPanel configId={config.id} members={team} onChanged={load} />
            ) : tab === 'sessions' ? (
              <CheckinSessionsPanel
                configId={config.id}
                config={config}
                sessions={sessions}
                onChanged={load}
              />
            ) : tab === 'checkins' ? (
              <CheckinRowsPanel
                sessions={sessions}
                team={team}
                defaultSession={defaultSession}
                onChanged={load}
              />
            ) : (
              <CheckinReportPanel sessions={sessions} eventTitle={event.title} />
            )}
          </Stack>
        )}
      </Layout>
    </AuthGuard>
  );
}

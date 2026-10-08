import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useRouter } from 'next/router';
import {
  IconAlertTriangle,
  IconChevronRight,
  IconUserCheck,
  IconUserQuestion,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from './PageHeader';
import EmptyState from './EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import { useFeedback } from '../hooks/useFeedback';
import type { AppAlert, Member } from '../types';

const WELCOME_STAGES = ['VISITOR', 'INTEGRATION'];

/**
 * Painel do MEMBRO: o recorte por responsável já vem do backend
 * (`MemberViewSet.get_queryset` e `AlertsView._scope_visitor_alerts`), então aqui
 * só consumimos as duas listas — nada de `secretaryActions`, que nega 403 ao
 * membro comum.
 */
export default function MemberHome() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const fb = useFeedback();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([accountsApi.members(), accountsApi.alerts()])
      .then(([list, res]) => {
        if (!active) return;
        setMembers(list);
        setAlerts(
          (res.alerts ?? []).filter((a) => a.type.startsWith('visitor_'))
        );
      })
      .catch((err) => {
        if (active) fb.fromError(err, t.memberHome.loadError);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const title = t.memberHome.greeting.replace('{name}', firstName);
  const critical = alerts.filter((a) => a.type === 'visitor_sla_critical');
  const welcome = members.filter(
    (m) => m.lifecycle_stage && WELCOME_STAGES.includes(m.lifecycle_stage)
  );

  const stats = [
    {
      key: 'assigned',
      label: t.memberHome.statAssigned,
      value: members.length,
      color: 'grape',
      icon: <IconUsers size={18} />,
    },
    {
      key: 'critical',
      label: t.memberHome.statCritical,
      value: critical.length,
      color: critical.length > 0 ? 'red' : 'gray',
      icon: <IconAlertTriangle size={18} />,
    },
    {
      key: 'welcome',
      label: t.memberHome.statUnassigned,
      value: welcome.length,
      color: 'blue',
      icon: <IconUserCheck size={18} />,
    },
  ];

  const openFunnel = () => router.push('/visitors');

  return (
    <>
      <PageHeader title={title} description={t.memberHome.subtitle} />

      <Stack gap="lg" data-testid="member-home">
        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={78} radius="md" />
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {stats.map((s) => (
              <Paper
                key={s.key}
                withBorder
                p="md"
                radius="md"
                data-testid={`member-home-stat-${s.key}`}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                      {s.label}
                    </Text>
                    <Text fw={700} size="xl">
                      {s.value}
                    </Text>
                  </Stack>
                  <ThemeIcon
                    size={38}
                    radius="xl"
                    variant="light"
                    color={s.color}
                  >
                    {s.icon}
                  </ThemeIcon>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        )}

        {!loading && alerts.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Text fw={600} size="sm" mb="xs">
              {t.memberHome.alertsTitle} ({alerts.length})
            </Text>
            <Stack gap="xs">
              {alerts.map((a) => (
                <Group
                  key={`${a.type}-${a.member_id ?? a.date}`}
                  gap="xs"
                  wrap="nowrap"
                >
                  <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                  <Text size="sm">
                    {a.type === 'visitor_unassigned'
                      ? t.alertsBell.visitorUnassigned.replace(
                          '{name}',
                          a.member_name ?? ''
                        )
                      : t.alertsBell.visitorSlaCritical.replace(
                          '{name}',
                          a.member_name ?? ''
                        )}
                  </Text>
                  {a.waiting_days !== undefined && (
                    <Badge size="xs" color="red" variant="light">
                      {t.alertsBell.visitorDays.replace(
                        '{count}',
                        String(a.waiting_days)
                      )}
                    </Badge>
                  )}
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {!loading && members.length === 0 && (
          <EmptyState
            icon={<IconUserQuestion size={24} />}
            title={t.memberHome.emptyTitle}
            hint={t.memberHome.emptyHint}
          />
        )}

        {!loading && members.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">
                {t.memberHome.visitorsTitle} ({members.length})
              </Text>
              <Button
                size="xs"
                variant="light"
                rightSection={<IconChevronRight size={14} />}
                onClick={openFunnel}
                data-testid="member-home-open-funnel"
              >
                {t.memberHome.openFunnel}
              </Button>
            </Group>
            <Stack gap="xs">
              {members.map((m) => {
                const isVisitor =
                  !!m.lifecycle_stage && WELCOME_STAGES.includes(m.lifecycle_stage);
                const showSla =
                  isVisitor && m.sla_state !== null && m.sla_state !== undefined;
                const color =
                  m.sla_state === 'red'
                    ? 'red'
                    : m.sla_state === 'yellow'
                      ? 'yellow'
                      : 'green';
                return (
                  <Group
                    key={m.id}
                    justify="space-between"
                    wrap="nowrap"
                    py={4}
                    data-testid={`member-home-row-${m.id}`}
                  >
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        {m.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {m.lifecycle_stage_display}
                      </Text>
                    </Stack>
                    {showSla && (
                      <Badge
                        size="sm"
                        variant="light"
                        color={color}
                        data-testid={`member-home-sla-${m.id}`}
                      >
                        {t.memberHome[`sla_${m.sla_state}` as 'sla_green']} ·{' '}
                        {`${m.sla_days_waiting ?? 0}d`}
                      </Badge>
                    )}
                  </Group>
                );
              })}
            </Stack>
          </Paper>
        )}
      </Stack>
    </>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBell,
  IconCake,
  IconCalendarEvent,
  IconIdBadge,
  IconPackage,
  IconArrowRight,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import type { AppAlert } from '../types';

const POLL_INTERVAL_MS = 60_000;

function alertKey(alert: AppAlert, churchId: number): string {
  return `${churchId}:${alert.type}:${alert.loan_id ?? alert.member_id ?? 'church'}:${alert.date}`;
}

function seenStorageKey(userId: number, churchId: number): string {
  return `idb_alerts_seen_${userId}_${churchId}`;
}

function loadSeen(userId: number, churchId: number): Set<string> {
  try {
    const raw = localStorage.getItem(seenStorageKey(userId, churchId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(userId: number, churchId: number, keys: Set<string>): void {
  try {
    localStorage.setItem(seenStorageKey(userId, churchId), JSON.stringify([...keys]));
  } catch {
    // armazenamento indisponível: alertas permanecem não-lidos nesta sessão
  }
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState(false);
  const prevUnread = useRef<number | null>(null);

  const church = user?.church ?? null;
  const churchId = church?.id ?? null;
  const userId = user?.id ?? null;

  const fetchAlerts = useCallback(async () => {
    if (!userId || !churchId) return;
    try {
      const res = await accountsApi.alerts();
      const next = res.alerts ?? [];
      setAlerts(next);

      const known = loadSeen(userId, churchId);
      const unread = next.filter((a) => !known.has(alertKey(a, churchId))).length;

      if (prevUnread.current !== null && unread > prevUnread.current) {
        const diff = unread - prevUnread.current;
        notifications.show({
          color: 'blue',
          icon: <IconBell size={18} />,
          title: t.alertsBell.title,
          message: t.alertsBell.newAlerts.replace('{count}', String(diff)),
        });
      }
      prevUnread.current = unread;
    } catch {
      // falha silenciosa no polling
    }
  }, [userId, churchId, t]);

  useEffect(() => {
    if (!userId || !churchId) {
      setAlerts([]);
      setSeen(new Set());
      prevUnread.current = null;
      return;
    }

    setSeen(loadSeen(userId, churchId));
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchAlerts();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      prevUnread.current = null;
    };
  }, [userId, churchId, fetchAlerts]);

  if (!userId || !churchId) {
    return null;
  }

  const markAsRead = () => {
    const known = loadSeen(userId, churchId);
    alerts.forEach((a) => known.add(alertKey(a, churchId)));
    saveSeen(userId, churchId, known);
    setSeen(known);
    prevUnread.current = 0;
  };

  const openBell = () => {
    if (!opened) {
      markAsRead();
    }
    setOpened((o) => !o);
  };

  const unread = alerts.filter((a) => !seen.has(alertKey(a, churchId))).length;

  const todayBirthdays = alerts.filter((a) => a.type === 'birthday_today');
  const upcomingBirthdays = alerts.filter((a) => a.type === 'birthday_upcoming');
  const cardAlerts = alerts.filter(
    (a) => a.type === 'card_validity_soon' || a.type === 'card_validity_expired',
  );
  const loanAlerts = alerts.filter(
    (a) =>
      a.type === 'loan_return_today' ||
      a.type === 'loan_return_soon' ||
      a.type === 'loan_return_overdue',
  );

  const goMembers = () => {
    setOpened(false);
    router.push('/members');
  };

  const goLoans = () => {
    setOpened(false);
    router.push('/inventory');
  };

  const renderRow = (a: AppAlert) => {
    if (a.type === 'birthday_today' || a.type === 'birthday_upcoming') {
      return (
        <Box key={alertKey(a, churchId)}>
          <Group gap="xs" justify="space-between">
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              {a.type === 'birthday_today' ? (
                <IconCake size={16} style={{ color: 'var(--mantine-color-pink-5)' }} />
              ) : (
                <IconCalendarEvent size={16} style={{ color: 'var(--mantine-color-blue-5)' }} />
              )}
              <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
                {a.member_name}
              </Text>
            </Group>
            {a.type === 'birthday_upcoming' && (
              <Badge size="xs" variant="light" color="blue">
                {formatShortDate(a.date)}
              </Badge>
            )}
          </Group>
        </Box>
      );
    }
    if (
      a.type === 'loan_return_today' ||
      a.type === 'loan_return_soon' ||
      a.type === 'loan_return_overdue'
    ) {
      const overdue = a.type === 'loan_return_overdue';
      const today = a.type === 'loan_return_today';
      const color = overdue ? 'red' : today ? 'orange' : 'blue';
      const message =
        (overdue
          ? t.alertsBell.loanOverdue
          : today
            ? t.alertsBell.loanToday
            : t.alertsBell.loanSoon
        )
          .replace('{item}', a.item_name || '')
          .replace('{person}', a.borrower_name || '')
          .replace('{date}', today ? '' : formatShortDate(a.date));
      return (
        <Box key={alertKey(a, churchId)}>
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <IconPackage size={16} style={{ color: `var(--mantine-color-${color}-5)` }} />
            <Text size="sm" c={overdue ? 'red' : undefined} truncate style={{ flex: 1, minWidth: 0 }}>
              {message}
            </Text>
            {!today && (
              <Badge size="xs" variant="light" color={color}>
                {formatShortDate(a.date)}
              </Badge>
            )}
          </Group>
        </Box>
      );
    }
    const expired = a.type === 'card_validity_expired';
    return (
      <Box key={alertKey(a, churchId)}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <IconIdBadge size={16} style={{ color: `var(--mantine-color-${expired ? 'red' : 'orange'}-5)` }} />
          <Text size="sm" c={expired ? 'red' : undefined} truncate style={{ flex: 1, minWidth: 0 }}>
            {t.alertsBell[expired ? 'cardExpired' : 'cardSoon']
              .replace('{date}', formatFullDate(a.date))}
          </Text>
        </Group>
      </Box>
    );
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={340}
      shadow="md"
      closeOnClickOutside
    >
      <Popover.Target>
        <Tooltip label={t.alertsBell.bell}>
          <Indicator
            inline
            label={unread > 99 ? '99+' : unread}
            size={16}
            color="red"
            disabled={unread === 0}
          >
            <ActionIcon variant="subtle" aria-label="Alertas" onClick={openBell} size="lg">
              <IconBell size={18} />
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={700} size="sm">
              {t.alertsBell.title}
            </Text>
            {unread > 0 && (
              <Badge size="xs" color="red" variant="light">
                {unread}
              </Badge>
            )}
          </Group>
          <Divider />

          {alerts.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              {t.alertsBell.empty}
            </Text>
          ) : (
            <ScrollArea.Autosize mah={320}>
              <Stack gap="xs">
                {loanAlerts.length > 0 && (
                  <>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                      {t.alertsBell.loanTitle} ({loanAlerts.length})
                    </Text>
                    {loanAlerts.map(renderRow)}
                  </>
                )}
                {todayBirthdays.length > 0 && (
                  <>
                    {loanAlerts.length > 0 && <Divider />}
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                      {t.alertsBell.todayTitle} ({todayBirthdays.length})
                    </Text>
                    {todayBirthdays.map(renderRow)}
                  </>
                )}
                {upcomingBirthdays.length > 0 && (
                  <>
                    {loanAlerts.length + todayBirthdays.length > 0 && <Divider />}
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                      {t.alertsBell.upcomingTitle} ({upcomingBirthdays.length})
                    </Text>
                    {upcomingBirthdays.map(renderRow)}
                  </>
                )}
                {cardAlerts.length > 0 && (
                  <>
                    {loanAlerts.length + todayBirthdays.length + upcomingBirthdays.length >
                      0 && <Divider />}
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                      {t.alertsBell.cardTitle}
                    </Text>
                    {cardAlerts.map(renderRow)}
                  </>
                )}
              </Stack>
            </ScrollArea.Autosize>
          )}

          <Divider />
          <Group justify="space-between">
            {alerts.length > 0 && (
              <Text size="xs" c="dimmed">
                {t.alertsBell.scope}
              </Text>
            )}
            <Group gap="xs" style={{ marginLeft: 'auto' }}>
              {loanAlerts.length > 0 && (
                <ActionIcon
                  variant="subtle"
                  color="teal"
                  onClick={goLoans}
                  aria-label={t.alertsBell.openLoans}
                >
                  <IconPackage size={18} />
                </ActionIcon>
              )}
              {alerts.length > 0 && (
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={goMembers}
                  aria-label={t.alertsBell.openMembers}
                >
                  <IconArrowRight size={18} />
                </ActionIcon>
              )}
            </Group>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
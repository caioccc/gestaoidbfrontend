import React, { useEffect, useState } from 'react';
import { Card, Group, Text, Stack, Button, Loader, ThemeIcon } from '@mantine/core';
import { IconCake } from '@tabler/icons-react';
import Link from 'next/link';
import PageHeader from '../components/PageHeader';
import CalendarEventsBoard, { CalendarEventsGateway } from '../components/CalendarEventsBoard';
import { useLanguage } from '../i18n';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';
import { accountsApi } from '../api/accounts';
import { calendarEventsApi } from '../api/finance';

function BirthdaysCard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canSecretary } = useRoleHelpers(user);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const month = new Date().getMonth() + 1;
    let active = true;
    accountsApi
      .birthdays(month)
      .then((list) => {
        if (active) setCount(list.length);
      })
      .catch(() => {
        if (active) setCount(0);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card withBorder shadow="sm" p="md" mb="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="xl" color="grape" variant="light">
            <IconCake size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {t.birthdays.monthCard}
            </Text>
            <Group gap="xs">
              <Text fw={800} size="lg">
                {count === null ? <Loader size={14} /> : count}
              </Text>
              <Text size="sm" c="dimmed">
                {t.birthdays.count}
              </Text>
            </Group>
          </Stack>
        </Group>
        {canSecretary && (
          <Button
            component={Link}
            href="/members-reports?tab=birthdays"
            variant="light"
            size="xs"
            color="grape"
          >
            {t.birthdays.view}
          </Button>
        )}
      </Group>
    </Card>
  );
}

export default function CalendarPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const { canSecretary, canFinance } = useRoleHelpers(user);

  const gateway: CalendarEventsGateway = {
    list: () => calendarEventsApi.list(),
    create: (p) => calendarEventsApi.create(p),
    update: (id, p) => calendarEventsApi.update(id, p),
    delete: (id) => calendarEventsApi.delete(id),
    listMembers: () => accountsApi.members(),
    canManageGeneral: canSecretary && !!user,
    canManageFinance: canFinance && !!user,
    ...(canSecretary && user
      ? {
          publicLink: () => accountsApi.calendarPublicLink(),
          regeneratePublicLink: () => accountsApi.regenerateCalendarPublicLink(),
        }
      : {}),
  };

  return (
    <>
      <PageHeader title={t.calendarPage.title} />
      <BirthdaysCard />
      <CalendarEventsBoard gateway={gateway} locale={locale} />
    </>
  );
}
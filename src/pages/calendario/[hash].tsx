import React, { useEffect, useState } from 'react';
import { Container, Paper, Text, Title, Stack, Loader, Center, ThemeIcon, Group } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import CalendarEventsBoard, { CalendarEventsGateway } from '../../components/CalendarEventsBoard';
import { useLanguage } from '../../i18n';
import { publicCalendarApi } from '../../api/finance';
import { PublicCalendarPayload } from '../../types';

export default function PublicCalendarPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [payload, setPayload] = useState<PublicCalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicCalendarApi
      .get(hash)
      .then((data) => {
        if (active) setPayload(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hash]);

  const gateway: CalendarEventsGateway = {
    list: async () =>
      (payload?.events ?? []).map((ev) => ({
        ...ev,
        church: payload?.church.id ?? 0,
        audience: 'GENERAL',
        audience_display: '',
        created_by: null,
        created_by_name: '',
        members: [],
        members_names: [],
        created_at: '',
      })),
    create: async () => {
      throw new Error('readOnly');
    },
    update: async () => {
      throw new Error('readOnly');
    },
    delete: async () => undefined,
    canManageGeneral: false,
    canManageFinance: false,
  };

  return (
    <Container size="lg" py="xl">
      {loading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : error || !payload ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <Text size="lg">{t.publicCalendar.invalid}</Text>
        </Paper>
      ) : (
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon size="xl" radius="xl" color="blue" variant="light">
              <IconCalendar size={26} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={2}>{payload.church.name}</Title>
              <Text size="sm" c="dimmed">
                {t.publicCalendar.title} • {t.publicCalendar.subtitle}
              </Text>
            </Stack>
          </Group>
          <CalendarEventsBoard gateway={gateway} readOnly />
        </Stack>
      )}
    </Container>
  );
}
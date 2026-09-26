import React, { useEffect, useState } from 'react';
import { Center, Container, Loader, Paper, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { useLanguage } from '../../i18n';
import { publicCalendarApi } from '../../api/finance';
import type { PublicCalendarPayload } from '../../types';
import PublicCalendarAgenda from '../../components/PublicCalendarAgenda';

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
        <PublicCalendarAgenda payload={payload} />
      )}
    </Container>
  );
}

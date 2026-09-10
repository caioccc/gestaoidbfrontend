import React, { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Typography,
} from '@mantine/core';
import { IconBuildingChurch, IconFileText, IconPdf } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useLanguage } from '../../i18n';
import { publicMinutesApi } from '../../api/accounts';
import { sanitizeHtml, hasHtmlTags } from '../../utils/sanitize';
import { PublicMinutesPayload } from '../../types';

function formatISODate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export default function PublicMinutesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const hash = typeof router.query.hash === 'string' ? router.query.hash : '';

  const [minutes, setMinutes] = useState<PublicMinutesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let active = true;
    setLoading(true);
    setError(false);
    publicMinutesApi
      .get(hash)
      .then(async (data) => {
        if (!active) return;
        const cleanContent = hasHtmlTags(data.content) ? await sanitizeHtml(data.content) : data.content;
        if (active) setMinutes({ ...data, content: cleanContent });
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
    <Container size="md" py="xl">
      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : error || !minutes ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <ThemeIcon size="xl" radius="xl" color="red" variant="light" mx="auto" mb="sm">
            <IconFileText size={26} />
          </ThemeIcon>
          <Title order={3}>{t.publicMinutes.invalid}</Title>
          <Text c="dimmed" size="sm">
            {t.publicMinutes.invalidHint}
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          <Paper withBorder radius="md" p="lg">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="xl" radius="xl" color="blue" variant="light">
                <IconFileText size={26} />
              </ThemeIcon>
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Title order={2} lineClamp={2}>
                  {minutes.title}
                </Title>
                <Group gap={6} c="dimmed" wrap="nowrap">
                  <IconBuildingChurch size={15} style={{ flexShrink: 0 }} />
                  <Text size="sm" truncate>
                    {t.publicMinutes.church}: {minutes.church.name}
                    {minutes.church.city ? ` — ${minutes.church.city}/${minutes.church.state}` : ''}
                  </Text>
                </Group>
              </Stack>
            </Group>
          </Paper>

          <Group grow>
            <Meta label={t.publicMinutes.date} value={formatISODate(minutes.meeting_date)} />
            <Meta
              label={t.publicMinutes.meetingType}
              value={minutes.meeting_type_display}
            />
          </Group>
          <Group grow>
            <Meta label={t.publicMinutes.location} value={minutes.location || '—'} />
            <Meta label={t.publicMinutes.recorder} value={minutes.recorder || '—'} />
          </Group>

          {minutes.participants && (
            <Paper withBorder radius="md" p="lg">
              <Text fw={600} size="sm" mb="xs">
                {t.publicMinutes.participants}
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                {minutes.participants}
              </Text>
            </Paper>
          )}

          <Paper withBorder radius="md" p="lg">
            <Text fw={600} size="sm" mb="xs">
              {t.publicMinutes.content}
            </Text>
            {hasHtmlTags(minutes.content) ? (
              <Typography>
                <div dangerouslySetInnerHTML={{ __html: minutes.content }} />
              </Typography>
            ) : (
              <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                {minutes.content}
              </Text>
            )}
          </Paper>

          {minutes.has_pdf && (
            <>
              <Divider />
              <Button
                component="a"
                href={publicMinutesApi.pdfUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconPdf size={18} />}
                variant="light"
              >
                {t.publicMinutes.downloadPdf}
              </Button>
            </>
          )}
        </Stack>
      )}
    </Container>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius="md" p="lg" style={{ flex: 1 }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Paper>
  );
}
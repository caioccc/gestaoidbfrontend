import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { QRCodeSVG } from 'qrcode.react';
import { IconCheck, IconCopy, IconQrcode } from '@tabler/icons-react';
import { publicEventRegistrationApi } from '../../api/checkin';
import { useLanguage } from '../../i18n';
import { formatCheckinDate } from '../../utils/eventCheckin';
import type {
  PublicEventRegistrationMeta,
  PublicEventRegistrationResult,
} from '../../types';

export default function PublicEventRegistrationPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [meta, setMeta] = useState<PublicEventRegistrationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PublicEventRegistrationResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const form = useForm({
    initialValues: { name: '', phone: '', email: '' },
    validate: {
      name: (value) => (value.trim() ? null : t.events.publicForm.name),
    },
  });

  useEffect(() => {
    if (!token || !router.isReady) return;
    let active = true;
    setLoading(true);
    publicEventRegistrationApi.get(token)
      .then((data) => { if (active) setMeta(data); })
      .catch(() => { if (active) setError(t.events.publicForm.invalid); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, router.isReady, t.events.publicForm.invalid]);

  const submit = form.onSubmit(async (values) => {
    if (!token) return;
    setError('');
    setCopied(false);
    try {
      setResult(await publicEventRegistrationApi.submit(token, values));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 429 ? t.eventCheckin.public.throttled : t.events.publicForm.error);
    }
  });

  const copyCode = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t.events.publicForm.title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Stack gap={2} ta="center">
            <Title order={2}>{meta?.event_title ?? t.events.publicForm.title}</Title>
            <Text size="sm" c="dimmed">
              {meta?.church_name ?? ''}
            </Text>
            {meta?.date ? (
              <Group gap="xs" justify="center">
                <Badge variant="light" color="blue">
                  {t.events.publicForm.date}: {formatCheckinDate(meta.date, locale)}
                </Badge>
                {meta.location ? (
                  <Badge variant="light" color="gray">{meta.location}</Badge>
                ) : null}
              </Group>
            ) : null}
            {meta?.description ? (
              <Text size="sm" c="dimmed" ta="center">{meta.description}</Text>
            ) : null}
          </Stack>

          {loading ? (
            <Paper withBorder p="lg" radius="md" ta="center">
              <Text c="dimmed">{t.eventCheckin.public.loading}</Text>
            </Paper>
          ) : error && !meta ? (
            <Paper withBorder p="lg" radius="md" ta="center">
              <Text c="red">{error}</Text>
            </Paper>
          ) : result?.created ? (
            <Paper withBorder p="lg" radius="md" ta="center" data-testid="registration-result">
              <Stack gap="md" align="center">
                <Badge variant="light" color="green" leftSection={<IconCheck size={13} />}>
                  {t.events.publicForm.success}
                </Badge>
                <Text size="sm" c="dimmed">{t.events.publicForm.successBody}</Text>
                <Paper withBorder p="sm" radius="md">
                  <QRCodeSVG value={result.code} size={190} includeMargin />
                </Paper>
                <Group gap="xs">
                  <Text fw={700} style={{ letterSpacing: 1 }}>{result.code}</Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconCopy size={13} />}
                    onClick={copyCode}
                  >
                    {copied ? t.events.publicForm.copied : t.events.publicForm.copyCode}
                  </Button>
                </Group>
                <Text size="xs" c="dimmed">{t.events.publicForm.qrHint}</Text>
              </Stack>
            </Paper>
          ) : result?.already ? (
            <Paper withBorder p="lg" radius="md" ta="center" data-testid="registration-already">
              <Stack gap="md" align="center">
                <Text fw={600}>{t.events.publicForm.already}</Text>
                <QRCodeSVG value={result.code} size={170} includeMargin />
                <Text fw={700} style={{ letterSpacing: 1 }}>{result.code}</Text>
              </Stack>
            </Paper>
          ) : (
            <Paper
              withBorder
              p="md"
              radius="md"
              component="form"
              onSubmit={submit}
              data-testid="public-registration-form"
            >
              <Stack gap="md">
                <Text size="sm" c="dimmed" ta="center">
                  {t.events.publicForm.subtitle}
                </Text>
                <TextInput
                  label={t.events.publicForm.name}
                  required
                  {...form.getInputProps('name')}
                />
                <TextInput
                  label={t.events.publicForm.phone}
                  {...form.getInputProps('phone')}
                />
                <TextInput
                  type="email"
                  label={t.events.publicForm.email}
                  {...form.getInputProps('email')}
                />
                {error ? <Text size="sm" c="red">{error}</Text> : null}
                <Button
                  type="submit"
                  loading={form.submitting}
                  leftSection={<IconQrcode size={15} />}
                >
                  {t.events.publicForm.submit}
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </>
  );
}

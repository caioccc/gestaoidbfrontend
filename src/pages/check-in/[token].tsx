import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconQrcode } from '@tabler/icons-react';
import QrScannerModal from '../../components/QrScannerModal';
import CheckinPersonCard from '../../components/CheckinPersonCard';
import { publicEventCheckinApi } from '../../api/checkin';
import { useLanguage } from '../../i18n';
import { parseQrCode } from '../../utils/memberCard';
import { formatCheckinDate } from '../../utils/eventCheckin';
import type { PublicEventCheckinResult, PublicEventCheckinSession } from '../../types';

function errorKey(err: unknown, t: ReturnType<typeof useLanguage>['t']): string {
  const response = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  const status = response?.status;
  const detail = typeof response?.data?.detail === 'string' ? response.data.detail : '';
  if (status === 429 || /muitas|too many/i.test(detail)) return t.eventCheckin.public.throttled;
  if (/período|fechad|encerrad|closed/i.test(detail)) return t.eventCheckin.public.closed;
  if (/código|inval|not found|inválid/i.test(detail)) return t.eventCheckin.public.invalid;
  return t.eventCheckin.public.error;
}

export default function PublicEventCheckinPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [session, setSession] = useState<PublicEventCheckinSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [operator, setOperator] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicEventCheckinResult | null>(null);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!token || !router.isReady) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    publicEventCheckinApi.get(token)
      .then((data) => { if (active) setSession(data); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, router.isReady]);

  useEffect(() => {
    if (!token) return;
    const saved = window.localStorage.getItem(`idb-checkin-operator:${token}`);
    if (saved) setOperator(saved);
  }, [token]);

  const register = useCallback(async (rawCode: string) => {
    const normalized = parseQrCode(rawCode);
    if (!normalized || !operator || !token) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await publicEventCheckinApi.scan(token, {
        code: normalized,
        operator: Number(operator),
      });
      setResult(response);
      setCode('');
    } catch (err) {
      setError(errorKey(err, t));
    } finally {
      setSubmitting(false);
      setScannerOpen(false);
    }
  }, [operator, token, t]);

  const changeOperator = (value: string | null) => {
    setOperator(value);
    if (value && token) window.localStorage.setItem(`idb-checkin-operator:${token}`, value);
  };

  if (loading) {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <Container size="sm" py="xl">
          <Text ta="center" c="dimmed">{t.eventCheckin.public.loading}</Text>
        </Container>
      </>
    );
  }

  if (loadError || !session) {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <Container size="sm" py="xl">
          <Paper withBorder p="lg" radius="md" ta="center">
            <Text c="red">{t.eventCheckin.public.invalid}</Text>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t.eventCheckin.public.title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Stack gap={2} ta="center">
            <Title order={2}>{session.event_title}</Title>
            <Text c="dimmed" size="sm">{session.church_name}</Text>
            <Group gap="xs" justify="center">
              <Badge variant="light" color="blue">
                {t.eventCheckin.public.eventDate}: {formatCheckinDate(session.occurrence_date, locale)}
              </Badge>
              <Badge variant="light" color={session.is_open ? 'green' : 'gray'}>
                {session.is_open ? t.eventCheckin.config.active : t.eventCheckin.config.inactive}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">{t.eventCheckin.public.subtitle}</Text>
          </Stack>

          <Paper withBorder p="md" radius="md" data-testid="checkin-public-panel">
            <Stack gap="md">
              <Select
                data-testid="checkin-public-operator"
                label={t.eventCheckin.public.operator}
                placeholder={t.eventCheckin.public.selectOperator}
                data={session.team.map((member) => ({
                  value: String(member.id),
                  label: member.name,
                }))}
                value={operator}
                onChange={changeOperator}
                searchable
                nothingFoundMessage={t.eventCheckin.public.noTeam}
              />
              <Button
                data-testid="checkin-public-scan"
                leftSection={<IconQrcode size={16} />}
                disabled={!operator || !session.is_open}
                onClick={() => setScannerOpen(true)}
              >
                {t.eventCheckin.public.scan}
              </Button>
              <TextInput
                data-testid="checkin-public-code"
                label={t.eventCheckin.public.manualCode}
                value={code}
                disabled={!operator || !session.is_open}
                onChange={(event) => setCode(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') register(code);
                }}
              />
              <Button
                data-testid="checkin-public-submit"
                loading={submitting}
                disabled={!code.trim() || !operator || !session.is_open}
                onClick={() => register(code)}
              >
                {t.eventCheckin.public.submit}
              </Button>
              {error ? <Text size="sm" c="red">{error}</Text> : null}
            </Stack>
          </Paper>

          {result ? (
            <Stack gap="sm" data-testid="checkin-public-result">
              <Text fw={700} ta="center">
                {result.already ? t.eventCheckin.public.already : t.eventCheckin.public.success}
              </Text>
              <CheckinPersonCard
                person={result.person}
                inRoster={result.in_roster}
                checkedAt={result.checked_at}
              />
            </Stack>
          ) : null}
        </Stack>

        <QrScannerModal
          opened={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onDetected={register}
        />
      </Container>
    </>
  );
}

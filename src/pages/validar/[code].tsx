import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import QrScannerModal from '../../components/QrScannerModal';
import { publicQrApi } from '../../api/accounts';
import { useLanguage } from '../../i18n';
import type { PublicQrValidation } from '../../types';
import { parseQrCode } from '../../utils/memberCard';

function formatCpf(value: string): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '---';
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function QrValidationResultPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const rawCode = typeof router.query.code === 'string' ? router.query.code : '';
  const code = parseQrCode(rawCode);
  const notFoundText = t.qrValidation.notFound;
  const [data, setData] = useState<PublicQrValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!router.isReady || !code) return;
    let active = true;
    setLoading(true);
    setError('');
    publicQrApi
      .validate(code)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) {
          setData(null);
          setError(notFoundText);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router.isReady, code, notFoundText]);

  const handleDetected = useCallback(
    (value: string) => {
      setScannerOpen(false);
      const parsed = parseQrCode(value);
      if (parsed && parsed !== code) router.push(`/validar/${parsed}`);
    },
    [router, code]
  );

  const subject = data?.subject;
  const address = subject
    ? [subject.street, subject.number, subject.complement, subject.neighborhood, subject.city, subject.state]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <>
      <Head>
        <title>{t.qrValidation.title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Group justify="space-between" wrap="wrap">
            <Stack gap={2}>
              <Title order={2}>{t.qrValidation.title}</Title>
              <Text size="sm" c="dimmed">
                {t.qrValidation.validBody}
              </Text>
            </Stack>
            <Group gap="xs">
              <Button component={Link} href="/validar" variant="default" size="xs">
                {t.qrValidation.other}
              </Button>
              <Button variant="default" size="xs" onClick={() => setScannerOpen(true)}>
                {t.qrValidation.scan}
              </Button>
            </Group>
          </Group>

          {loading && (
            <Paper withBorder radius="md" p="lg">
              <Text size="sm" c="dimmed">
                {t.qrValidation.loading}
              </Text>
            </Paper>
          )}

          {!loading && error && <Alert color="red" title={t.qrValidation.title}>{error}</Alert>}

          {!loading && data && subject && (
            <Stack gap="md">
              <Badge color="green" size="lg">
                {t.qrValidation.validTitle}
              </Badge>
              <Paper withBorder radius="md" p="lg">
                <Group align="center" gap="lg" wrap="wrap">
                  {subject.photo ? (
                    <img
                      src={subject.photo}
                      alt={subject.name}
                      style={{ width: 112, height: 112, borderRadius: 14, objectFit: 'cover' }}
                    />
                  ) : (
                    <Paper
                      withBorder
                      radius="md"
                      style={{ width: 112, height: 112, display: 'grid', placeItems: 'center' }}
                    >
                      <Text size="xs" c="dimmed">
                        {t.qrValidation.noPhoto}
                      </Text>
                    </Paper>
                  )}
                  <Stack gap={2}>
                    <Title order={3}>{subject.name}</Title>
                    <Text size="sm" c="dimmed">
                      {subject.church_name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t.qrValidation.checkedAt}: {new Date(data.checked_at).toLocaleString()}
                    </Text>
                  </Stack>
                </Group>
              </Paper>

              <Paper withBorder radius="md" p="lg">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.qrLabel}
                    </Text>
                    <Text size="sm" fw={600}>
                      {data.code}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.registration}
                    </Text>
                    <Text size="sm" fw={600}>
                      {subject.card_number || '---'}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.status}
                    </Text>
                    <Text size="sm" fw={600}>
                      {subject.status_display}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.role}
                    </Text>
                    <Text size="sm" fw={600}>
                      {subject.role_title || '---'}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.validUntil}
                    </Text>
                    <Text size="sm" fw={600}>
                      {subject.valid_until || '---'}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.church}
                    </Text>
                    <Text size="sm" fw={600}>
                      {[subject.church_city, subject.church_state].filter(Boolean).join('/') || '---'}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.cpf}
                    </Text>
                    <Text size="sm" fw={600}>
                      {formatCpf(subject.cpf)}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.phone}
                    </Text>
                    <Text size="sm" fw={600}>
                      {subject.phone || '---'}
                    </Text>
                  </Stack>
                  <Stack gap={0} style={{ gridColumn: '1 / -1' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {t.qrValidation.address}
                    </Text>
                    <Text size="sm" fw={600}>
                      {address || t.qrValidation.noAddress}
                    </Text>
                  </Stack>
                </SimpleGrid>
              </Paper>

              <Text size="xs" c="dimmed" ta="center">
                {t.qrValidation.privacy}
              </Text>
            </Stack>
          )}
        </Stack>
      </Container>

      <QrScannerModal
        opened={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetected}
      />
    </>
  );
}

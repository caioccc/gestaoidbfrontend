import React, { useCallback, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button, Container, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import QrScannerModal from '../components/QrScannerModal';
import { useLanguage } from '../i18n';
import { parseQrCode } from '../utils/memberCard';

export default function QrValidationIndexPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const goToCode = useCallback(
    (raw: string) => {
      const parsed = parseQrCode(raw);
      if (!/^[A-Z0-9]{8}$/.test(parsed)) {
        setError(t.qrValidation.invalid);
        return;
      }
      setError('');
      router.push(`/validar/${parsed}`);
    },
    [router, t.qrValidation.invalid]
  );

  const handleDetected = useCallback(
    (value: string) => {
      setScannerOpen(false);
      goToCode(value);
    },
    [goToCode]
  );

  return (
    <>
      <Head>
        <title>{t.qrValidation.title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Container size="xs" py="xl">
        <Stack gap="lg">
          <Stack gap={4} ta="center">
            <Title order={2}>{t.qrValidation.title}</Title>
            <Text size="sm" c="dimmed">
              {t.qrValidation.intro}
            </Text>
          </Stack>

          <Paper withBorder radius="md" p="lg">
            <Stack gap="sm">
              <TextInput
                label={t.qrValidation.codeLabel}
                placeholder={t.qrValidation.codePlaceholder}
                value={code}
                onChange={(event) => {
                  setCode(event.currentTarget.value);
                  setError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') goToCode(code);
                }}
              />
              {error && (
                <Text size="sm" c="red">
                  {error}
                </Text>
              )}
              <Button fullWidth onClick={() => goToCode(code)}>
                {t.qrValidation.validate}
              </Button>
              <Button
                fullWidth
                variant="default"
                onClick={() => setScannerOpen(true)}
              >
                {t.qrValidation.scan}
              </Button>
            </Stack>
          </Paper>
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

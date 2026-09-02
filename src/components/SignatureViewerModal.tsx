import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Title,
  Group,
  Image,
  Badge,
  ThemeIcon,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSignature, IconCopy, IconCheck } from '@tabler/icons-react';
import { useLanguage } from '../i18n';

interface SignatureViewerModalProps {
  opened: boolean;
  onClose: () => void;
  photoUrl: string | null;
  signatureUrl: string | null;
  signatureHash: string | null;
  roleLabel: string;
  signedAt: string | null;
  approved: boolean;
}

export default function SignatureViewerModal({
  opened,
  onClose,
  photoUrl,
  signatureUrl,
  signatureHash,
  roleLabel,
  signedAt,
  approved,
}: SignatureViewerModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const hasContent = !!photoUrl || !!signatureUrl;

  const copyHash = async () => {
    if (!signatureHash) return;
    try {
      await navigator.clipboard.writeText(signatureHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({ color: 'red', message: t.validationPage.confirmError });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.validationPage.viewSignature}
      size="lg"
      centered
    >
      <Stack align="center" gap="md">
        <Group gap="xs">
          <ThemeIcon color="blue" variant="light" size="lg">
            <IconSignature size={20} />
          </ThemeIcon>
          <Title order={5}>{roleLabel}</Title>
          <Badge color={approved ? 'green' : 'red'} variant="light">
            {approved ? t.validationPage.approved : t.validationPage.rejected}
          </Badge>
        </Group>

        {signedAt && (
          <Text size="xs" c="dimmed">
            {t.validationPage.wroteAt}: {signedAt}
          </Text>
        )}

        {!hasContent ? (
          <Text c="dimmed" ta="center" py="lg">
            {t.validationPage.noSignature}
          </Text>
        ) : (
          <Group align="flex-start" gap="lg" wrap="wrap" justify="center">
            {photoUrl && (
              <Stack align="center" gap={4}>
                <Text size="xs" c="dimmed">
                  {t.validationPage.stepPhoto}
                </Text>
                <div
                  style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Image src={photoUrl} alt="Foto" width={260} height={240} fit="contain" />
                </div>
              </Stack>
            )}
            {signatureUrl && (
              <Stack align="center" gap={4}>
                <Text size="xs" c="dimmed">
                  {t.validationPage.stepSign}
                </Text>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Image src={signatureUrl} alt="Assinatura" width={260} height={240} fit="contain" />
                </div>
              </Stack>
            )}
          </Group>
        )}

        {signatureHash && (
          <Stack align="center" gap={4} w="100%">
            <Text size="xs" c="dimmed" fw={500}>
              {t.validationPage.signatureHash}
            </Text>
            <Group
              gap={8}
              wrap="nowrap"
              style={{
                padding: '6px 10px',
                background: 'var(--mantine-color-body)',
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                maxWidth: '100%',
              }}
            >
              <Tooltip label={signatureHash} withArrow>
                <Text
                  size="xs"
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    wordBreak: 'break-all',
                    maxWidth: 300,
                  }}
                >
                  {signatureHash}
                </Text>
              </Tooltip>
              <ActionIcon variant="subtle" color="blue" size="sm" onClick={copyHash} aria-label="copy">
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

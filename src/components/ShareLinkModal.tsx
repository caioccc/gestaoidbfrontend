import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { IconCopy, IconExternalLink, IconRefresh } from '@tabler/icons-react';
import QrShareCard from './QrShareCard';
import { useLanguage } from '../i18n';
import { copyToClipboard } from '../utils/share';

interface ShareLinkModalProps {
  opened: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  getUrl: () => Promise<string>;
  regenerate?: () => Promise<string>;
}

export default function ShareLinkModal({
  opened,
  onClose,
  title,
  subtitle,
  getUrl,
  regenerate,
}: ShareLinkModalProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const getUrlRef = useRef(getUrl);
  getUrlRef.current = getUrl;
  const regenerateRef = useRef(regenerate);
  regenerateRef.current = regenerate;

  useEffect(() => {
    if (!opened) return;
    let active = true;
    setUrl(null);
    setError(false);
    setCopied(false);
    setConfirmRegen(false);
    setRegenerating(false);
    setLoading(true);
    getUrlRef
      .current()
      .then((u) => {
        if (active) setUrl(u);
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
  }, [opened]);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await copyToClipboard(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // sem ação extra
    }
  };

  const doRegenerate = async () => {
    if (!regenerateRef.current || !url) return;
    setRegenerating(true);
    try {
      const next = await regenerateRef.current();
      setUrl(next);
      setCopied(false);
      setConfirmRegen(false);
    } catch {
      // sem ação extra
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack align="center" gap="sm">
        {subtitle ? (
          <Text size="sm" c="dimmed" ta="center">
            {subtitle}
          </Text>
        ) : null}

        {loading || error || !url ? (
          <Center h={240}>
            {error ? (
              <Text size="sm" c="red">
                {t.qrShare.error}
              </Text>
            ) : (
              <Loader />
            )}
          </Center>
        ) : (
          <>
            <QrShareCard url={url} />
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              data-testid="share-url"
              style={{ wordBreak: 'break-all', maxWidth: 320 }}
            >
              {url}
            </Text>
            <Group gap="xs" justify="center">
              <Button
                size="xs"
                variant="default"
                leftSection={<IconCopy size={14} />}
                onClick={handleCopy}
                data-testid="share-copy"
              >
                {copied ? t.qrShare.copied : t.qrShare.copy}
              </Button>
              <Button
                size="xs"
                variant="default"
                component="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconExternalLink size={14} />}
                data-testid="share-open"
              >
                {t.qrShare.open}
              </Button>
              {regenerate && (
                <Button
                  size="xs"
                  variant="light"
                  color="orange"
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => setConfirmRegen(true)}
                  loading={regenerating}
                  data-testid="share-regenerate"
                >
                  {t.qrShare.regenerate}
                </Button>
              )}
            </Group>
          </>
        )}

        {confirmRegen && (
          <Alert color="orange" icon={<IconRefresh size={16} />} w="100%">
            <Stack gap="xs" align="stretch">
              <Text size="sm">{t.qrShare.regenerateBody}</Text>
              <Group justify="flex-end">
                <Button size="xs" variant="default" onClick={() => setConfirmRegen(false)}>
                  {t.qrShare.cancel}
                </Button>
                <Button
                  size="xs"
                  color="orange"
                  loading={regenerating}
                  onClick={doRegenerate}
                  data-testid="share-regenerate-confirm"
                >
                  {t.qrShare.regenerateConfirm}
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
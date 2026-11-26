import React, { useEffect, useRef, useState } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { IScannerControls } from '@zxing/browser';
import { useLanguage } from '../i18n';
import { parseQrCode } from '../utils/memberCard';

interface QrScannerModalProps {
  opened: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export default function QrScannerModal({ opened, onClose, onDetected }: QrScannerModalProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!opened) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let active = true;
    setError('');

    const start = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (!active || !videoRef.current) return;
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!active || !result) return;
            const code = parseQrCode(result.getText());
            if (!code) return;
            active = false;
            controlsRef.current?.stop();
            controlsRef.current = null;
            onDetected(code);
          }
        );
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (active) setError(t.qrValidation.scannerError);
      }
    };

    start();

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [opened, onDetected, t.qrValidation.scannerError]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.qrValidation.scannerTitle}
      centered
      size="md"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t.qrValidation.scannerHint}
        </Text>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            borderRadius: 12,
            background: '#0f172a',
            aspectRatio: '4 / 3',
            objectFit: 'cover',
          }}
          playsInline
          muted
        />
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t.memberCard.close}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

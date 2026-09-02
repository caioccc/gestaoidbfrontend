import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Stack,
  Text,
  Title,
  Image,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { IconCamera, IconRefresh, IconCheck } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { notifications } from '@mantine/notifications';

interface SignatureModalProps {
  opened: boolean;
  action: 'approve' | 'reject';
  onClose: () => void;
  onConfirm: (photoDataUrl: string, signatureDataUrl: string) => Promise<void> | void;
}

export default function SignatureModal({
  opened,
  action,
  onClose,
  onConfirm,
}: SignatureModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => {
    if (!opened) {
      setStep(0);
      setPhoto(null);
      setSignature(null);
      setHasInk(false);
      setCameraError(null);
      stopCamera();
      return;
    }
    setStep(0);
    setPhoto(null);
    setSignature(null);
    setHasInk(false);
    setCameraError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCameraOn(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(
        err?.message || t.validationPage.cameraUnavailable
      );
      setCameraOn(false);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  useEffect(() => {
    if (step === 1 && !photo) {
      startCamera();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [step]);

  const canvasSize = { width: 640, height: 320 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [step]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const p = getPos(e);
    if (!p) return;
    drawing.current = true;
    lastPoint.current = p;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = getPos(e);
    const prev = lastPoint.current;
    if (!p || !prev) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    setHasInk(true);
  };

  const onPointerUp = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setSignature(null);
  };

  const exportSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignature(canvas.toDataURL('image/png'));
  };

  const handleNextFromSignature = () => {
    exportSignature();
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!photo || !signature) return;
    setSubmitting(true);
    try {
      await onConfirm(photo, signature);
      onClose();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: t.validationPage.confirmError,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.validationPage.signatureTitle}
      size="lg"
      centered
    >
      <Stepper active={step} onStepClick={setStep} allowNextStepsSelect={false} mb="lg">
        <Stepper.Step label={t.validationPage.stepPhoto} allowStepSelect={false}>
          <Stack align="center" gap="md">
            {!photo ? (
              cameraOn ? (
                <Stack align="center" gap="sm" style={{ position: 'relative' }}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxHeight: 340,
                      borderRadius: 8,
                      background: '#000',
                      objectFit: 'cover',
                    }}
                  />
                  {cameraError && <Alert color="red">{cameraError}</Alert>}
                  <Group>
                    <Button leftSection={<IconCamera size={18} />} onClick={takePhoto}>
                      {t.validationPage.capture}
                    </Button>
                    <Button variant="light" onClick={stopCamera}>
                      {t.validationPage.cancel}
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Stack align="center" py="lg">
                  <Button leftSection={<IconCamera size={18} />} onClick={startCamera}>
                    {t.validationPage.openCamera}
                  </Button>
                  {cameraError && <Alert color="red">{cameraError}</Alert>}
                </Stack>
              )
            ) : (
              <Stack align="center" gap="sm">
                <Image
                  src={photo}
                  alt="Foto"
                  radius="md"
                  style={{ maxWidth: 360, maxHeight: 300, objectFit: 'contain' }}
                />
                <Group>
                  <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={retakePhoto}>
                    {t.validationPage.retake}
                  </Button>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={18} />}
                    onClick={() => setStep(1)}
                  >
                    {t.validationPage.next}
                  </Button>
                </Group>
              </Stack>
            )}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t.validationPage.stepSign} allowStepSelect={false}>
          <Stack align="center" gap="sm">
            <Text size="sm" c="dimmed">
              {t.validationPage.signHint}
            </Text>
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                width: '100%',
                height: 'auto',
                border: '1px dashed var(--mantine-color-gray-4)',
                borderRadius: 8,
                touchAction: 'none',
                cursor: 'crosshair',
                background: '#fff',
              }}
            />
            <Group justify="space-between" w="100%">
              <Button variant="subtle" color="gray" onClick={clearSignature}>
                {t.validationPage.clear}
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={18} />}
                disabled={!hasInk}
                onClick={handleNextFromSignature}
              >
                {t.validationPage.next}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t.validationPage.stepReview} allowStepSelect={false}>
          <Stack align="center" gap="md">
            <Title order={5}>
              {action === 'approve' ? t.validationPage.approveLabel : t.validationPage.rejectLabel}
            </Title>
            <Group align="flex-start" gap="lg" wrap="wrap" justify="center">
              <Stack align="center" gap={4}>
                <Text size="xs" c="dimmed">
                  {t.validationPage.stepPhoto}
                </Text>
                <Image
                  src={photo ?? ''}
                  alt="Foto"
                  width={220}
                  height={200}
                  fit="contain"
                  radius="md"
                />
              </Stack>
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
                  data-testid="signature-preview"
                >
                  <Image src={signature ?? ''} alt="Assinatura" width={220} height={200} fit="contain" />
                </div>
              </Stack>
            </Group>
            <Group justify="flex-end" w="100%" mt="sm">
              <Button variant="default" onClick={() => setStep(step - 1)}>
                {t.common.back}
              </Button>
              <Button
                color={action === 'approve' ? 'green' : 'red'}
                leftSection={<IconCheck size={18} />}
                loading={submitting}
                onClick={handleConfirm}
              >
                {t.validationPage.confirm}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>
      </Stepper>
    </Modal>
  );
}

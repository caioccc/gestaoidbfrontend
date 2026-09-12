import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Group,
  Image,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconX, IconTrash } from '@tabler/icons-react';
import { accountsApi, CertificateTemplatePayload } from '../api/accounts';
import { useLanguage } from '../i18n';
import type { CertificateTemplate, CertificateType } from '../types';

interface CertificateTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: CertificateTemplate | null;
}

export default function CertificateTemplateModal({
  opened,
  onClose,
  onSaved,
  editing,
}: CertificateTemplateModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [certType, setCertType] = useState<CertificateType>('CUSTOM');
  const [layoutMode, setLayoutMode] = useState<'SYSTEM_DEFAULT' | 'CUSTOM_IMAGE' | 'BASE_PDF'>(
    'SYSTEM_DEFAULT',
  );
  const [defaultVerse, setDefaultVerse] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [basePdfFile, setBasePdfFile] = useState<File | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [removeBasePdf, setRemoveBasePdf] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setName(editing?.name ?? '');
    setCertType(editing?.certificate_type ?? 'CUSTOM');
    setLayoutMode(editing?.layout_mode ?? 'SYSTEM_DEFAULT');
    setDefaultVerse(editing?.default_verse ?? '');
    setIsActive(editing?.is_active ?? true);
    setBgFile(null);
    setBasePdfFile(null);
    setRemoveBg(false);
    setRemoveBasePdf(false);
    setSaving(false);
  }, [opened, editing]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const save = async () => {
    if (!name.trim()) {
      notifications.show({ color: 'red', message: t.certificates.error });
      return;
    }
    setSaving(true);
    try {
      const payload: CertificateTemplatePayload = {
        name: name.trim(),
        certificate_type: certType,
        layout_mode: layoutMode,
        default_verse: defaultVerse.trim(),
        is_active: isActive,
        background_image: bgFile,
        base_pdf: basePdfFile,
        remove_background_image: removeBg,
        remove_base_pdf: removeBasePdf,
      };
      if (editing) {
        await accountsApi.updateCertificateTemplate(editing.id, payload);
      } else {
        await accountsApi.createCertificateTemplate(payload);
      }
      notifications.show({ color: 'green', message: t.certificates.saveDone });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const first = data ? Object.values(data)[0] : null;
      notifications.show({
        color: 'red',
        message: first ? String(first) : t.certificates.error,
      });
    } finally {
      setSaving(false);
    }
  };

  const layoutData = [
    { value: 'SYSTEM_DEFAULT', label: t.certificates.layoutSystem },
    { value: 'CUSTOM_IMAGE', label: t.certificates.layoutImage },
    { value: 'BASE_PDF', label: t.certificates.layoutBasePdf },
  ];

  const typeData = [
    { value: 'BAPTISM', label: t.certificates.typeBaptism },
    { value: 'CHILD_PRESENTATION', label: t.certificates.typeChild },
    { value: 'MEMBERSHIP_COURSE', label: t.certificates.typeMembershipCourse },
    { value: 'CUSTOM', label: t.certificates.typeCustom },
  ];

  const currentBgPreview =
    bgFile
      ? URL.createObjectURL(bgFile)
      : editing && !removeBg
        ? editing.background_image_url
        : null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={editing ? t.certificates.editTemplate : t.certificates.newTemplate}
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t.certificates.templateName}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          data-testid="tpl-name"
        />
        <Group grow>
          <Select
            label={t.certificates.templateType}
            data={typeData}
            value={certType}
            onChange={(v) => setCertType((v as CertificateType) || 'CUSTOM')}
            data-testid="tpl-type"
          />
          <Select
            label={t.certificates.layoutMode}
            data={layoutData}
            value={layoutMode}
            onChange={(v) =>
              setLayoutMode((v as 'SYSTEM_DEFAULT' | 'CUSTOM_IMAGE' | 'BASE_PDF') || 'SYSTEM_DEFAULT')
            }
            data-testid="tpl-layout"
          />
        </Group>

        {layoutMode === 'CUSTOM_IMAGE' && (
          <Box>
            <Text size="sm" fw={500} mb={4}>
              {t.certificates.layoutImage}
            </Text>
            {currentBgPreview ? (
              <Box pos="relative" style={{ maxWidth: 320 }}>
                <Image
                  src={currentBgPreview}
                  alt="background"
                  radius="md"
                  height={140}
                  w="100%"
                  fit="cover"
                  style={{ objectFit: 'cover' }}
                />
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  mt={6}
                  leftSection={<IconTrash size={13} />}
                  onClick={() => {
                    setBgFile(null);
                    setRemoveBg(true);
                  }}
                >
                  {t.certificates.bgRemove}
                </Button>
              </Box>
            ) : (
              <Dropzone
                onDrop={(files) => {
                  if (files?.[0]) {
                    setBgFile(files[0]);
                    setRemoveBg(false);
                  }
                }}
                accept={IMAGE_MIME_TYPE}
                maxSize={8 * 1024 * 1024}
                maxFiles={1}
                multiple={false}
                h={120}
                data-testid="tpl-bg-dropzone"
              >
                <Group justify="center" align="center" gap="xs" style={{ height: '100%' }}>
                  <IconUpload size={22} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Box ta="center">
                    <Text size="sm" c="dimmed">
                      {t.certificates.bgUploadHint}
                    </Text>
                  </Box>
                  <ActionIconX />
                </Group>
              </Dropzone>
            )}
            {bgFile ? <Text size="xs" mt={4}>{bgFile.name}</Text> : null}
          </Box>
        )}

        {layoutMode === 'BASE_PDF' && (
          <Box>
            <Text size="sm" fw={500} mb={4}>
              {t.certificates.layoutBasePdf}
            </Text>
            {editing && editing.base_pdf_name && !removeBasePdf && !basePdfFile ? (
              <Group justify="space-between">
                <Text size="sm">{editing.base_pdf_name}</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={13} />}
                  onClick={() => setRemoveBasePdf(true)}
                >
                  {t.certificates.basePdfRemove}
                </Button>
              </Group>
            ) : (
              <Dropzone
                onDrop={(files) => {
                  if (files?.[0]) {
                    setBasePdfFile(files[0]);
                    setRemoveBasePdf(false);
                  }
                }}
                accept={PDF_MIME_TYPE}
                maxSize={10 * 1024 * 1024}
                maxFiles={1}
                multiple={false}
                h={90}
                data-testid="tpl-pdf-dropzone"
              >
                <Group justify="center" align="center" gap="xs" style={{ height: '100%' }}>
                  <IconUpload size={20} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Text size="sm" c="dimmed">
                    {t.certificates.basePdfUploadHint}
                  </Text>
                </Group>
              </Dropzone>
            )}
            {basePdfFile ? <Text size="xs" mt={4}>{basePdfFile.name}</Text> : null}
          </Box>
        )}

        <Textarea
          label={t.certificates.verse}
          placeholder={t.certificates.verseHint}
          value={defaultVerse}
          onChange={(e) => setDefaultVerse(e.currentTarget.value)}
          autosize
          minRows={2}
        />
        <Checkbox
          label={t.certificates.active}
          checked={isActive}
          onChange={(e) => setIsActive(e.currentTarget.checked)}
          data-testid="tpl-active"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button onClick={save} loading={saving} data-testid="tpl-save">
            {t.common.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ActionIconX() {
  return (
    <Box
      component="span"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <IconX size={16} />
    </Box>
  );
}
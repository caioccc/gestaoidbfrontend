import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  ColorInput,
  Grid,
  Group,
  Image,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconArrowsMove, IconUpload, IconX, IconTrash } from '@tabler/icons-react';
import { accountsApi, CertificateTemplatePayload } from '../api/accounts';
import { useLanguage } from '../i18n';
import { CERT_A4_H_MM, CERT_A4_W_MM } from '../utils/certificate';
import type {
  CertificateFieldKey,
  CertificateFieldLayout,
  CertificateTemplate,
  CertificateType,
} from '../types';

const FIELD_KEYS: CertificateFieldKey[] = [
  'recipient_name',
  'event_date',
  'church_name',
  'officiant_name',
  'parents_names',
  'scripture_verse',
  'custom_text',
  'registry_info',
  'certificate_number',
];

const FIELD_DEFAULT: CertificateFieldLayout = {
  enabled: false,
  x: 50,
  y: 50,
  font_size: 16,
  font_weight: '700',
  align: 'center',
  color: '#1a1a1a',
};

const WEIGHT_OPTIONS: { value: CertificateFieldLayout['font_weight']; label: string }[] = [
  { value: '400', label: '400' },
  { value: '600', label: '600' },
  { value: '700', label: '700' },
];

const ALIGN_OPTIONS: { value: CertificateFieldLayout['align']; label: string }[] = [
  { value: 'left', label: 'left' },
  { value: 'center', label: 'center' },
  { value: 'right', label: 'right' },
];

function fieldLabel(key: CertificateFieldKey, t: ReturnType<typeof useLanguage>['t']): string {
  switch (key) {
    case 'recipient_name':
      return t.certificateTemplates.fieldRecipientName;
    case 'event_date':
      return t.certificateTemplates.fieldEventDate;
    case 'church_name':
      return t.certificateTemplates.fieldChurchName;
    case 'officiant_name':
      return t.certificateTemplates.fieldOfficiantName;
    case 'parents_names':
      return t.certificateTemplates.fieldParentsNames;
    case 'scripture_verse':
      return t.certificateTemplates.fieldScriptureVerse;
    case 'custom_text':
      return t.certificateTemplates.fieldCustomText;
    case 'registry_info':
      return t.certificateTemplates.fieldRegistryInfo;
    case 'certificate_number':
      return t.certificateTemplates.fieldCertificateNumber;
    default:
      return key;
  }
}

function fieldPlaceholder(key: CertificateFieldKey, label: string): string {
  if (key === 'event_date') return '[13/09/2026]';
  return `[${label}]`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFields(
  src?: Record<CertificateFieldKey, CertificateFieldLayout> | null,
): Record<CertificateFieldKey, CertificateFieldLayout> {
  const out = {} as Record<CertificateFieldKey, CertificateFieldLayout>;
  for (const key of FIELD_KEYS) {
    out[key] = { ...FIELD_DEFAULT, ...(src?.[key] ?? {}) };
  }
  return out;
}

interface DraggableFieldBoxProps {
  fieldKey: CertificateFieldKey;
  field: CertificateFieldLayout;
  placeholder: string;
  dragHint: string;
  onDown: (k: CertificateFieldKey) => (e: React.PointerEvent<HTMLDivElement>) => void;
  onMove: (k: CertificateFieldKey) => (e: React.PointerEvent<HTMLDivElement>) => void;
  onUp: (k: CertificateFieldKey) => (e: React.PointerEvent<HTMLDivElement>) => void;
}

const DraggableFieldBox = React.memo(function DraggableFieldBox({
  fieldKey,
  field,
  placeholder,
  dragHint,
  onDown,
  onMove,
  onUp,
}: DraggableFieldBoxProps) {
  return (
    <div
      data-testid={`cert-field-${fieldKey}`}
      title={dragHint}
      onPointerDown={onDown(fieldKey)}
      onPointerMove={onMove(fieldKey)}
      onPointerUp={onUp(fieldKey)}
      style={{
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: field.font_size,
        fontWeight: Number(field.font_weight),
        color: field.color,
        textAlign: field.align,
        cursor: 'grab',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px dashed rgba(0,0,0,0.3)',
        background: 'rgba(255,255,255,0.45)',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <span>{placeholder}</span>
      <span
        style={{ marginLeft: 6, display: 'inline-flex', verticalAlign: 'middle', pointerEvents: 'none' }}
      >
        <IconArrowsMove size={12} />
      </span>
    </div>
  );
});

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
  const [fieldLayouts, setFieldLayouts] = useState<
    Record<CertificateFieldKey, CertificateFieldLayout>
  >(() => normalizeFields(editing?.fields_layout));
  const editorRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ key: CertificateFieldKey; offXPct: number; offYPct: number } | null>(
    null,
  );

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
    setFieldLayouts(normalizeFields(editing?.fields_layout));
    dragRef.current = null;
    setSaving(false);
  }, [opened, editing]);

  const updateField = (
    key: CertificateFieldKey,
    patch: Partial<CertificateFieldLayout>,
  ) => {
    setFieldLayouts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const startDrag = React.useCallback(
    (key: CertificateFieldKey) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const canvas = editorRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const el = e.currentTarget.getBoundingClientRect();
      dragRef.current = {
        key,
        offXPct: (e.clientX - (el.left + el.width / 2)) / (rect.width / 100),
        offYPct: (e.clientY - (el.top + el.height / 2)) / (rect.height / 100),
      };
      if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const moveDrag = React.useCallback(
    (key: CertificateFieldKey) => (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const canvas = editorRef.current;
      if (!drag || drag.key !== key || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clamp(((e.clientX - rect.left) / rect.width) * 100 - drag.offXPct, 0, 100);
      const y = clamp(((e.clientY - rect.top) / rect.height) * 100 - drag.offYPct, 0, 100);
      setFieldLayouts((prev) => {
        const cur = prev[key];
        if (!cur) return prev;
        const nx = Math.round(x * 10) / 10;
        const ny = Math.round(y * 10) / 10;
        if (cur.x === nx && cur.y === ny) return prev;
        return { ...prev, [key]: { ...cur, x: nx, y: ny } };
      });
    },
    [],
  );

  const endDrag = React.useCallback(
    (key: CertificateFieldKey) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
    },
    [],
  );

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
        fields_layout: fieldLayouts,
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

  const currentBgPreview = useMemo(
    () =>
      bgFile
        ? URL.createObjectURL(bgFile)
        : editing && !removeBg
          ? editing.background_image_url
          : null,
    [bgFile, editing, removeBg],
  );

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

            {currentBgPreview ? (
              <Box mt="md">
                <Text size="sm" fw={600} mb={2}>
                  {t.certificateTemplates.editorTitle}
                </Text>
                <Text size="xs" c="dimmed" mb={8}>
                  {t.certificateTemplates.editorHint}
                </Text>
                <Group align="flex-start" gap="md" wrap="wrap">
                  <Box
                    ref={editorRef}
                    data-testid="cert-layout-editor"
                    pos="relative"
                    style={{
                      width: '100%',
                      maxWidth: 760,
                      aspectRatio: `${CERT_A4_W_MM} / ${CERT_A4_H_MM}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: 'var(--mantine-shadow-sm)',
                      backgroundImage: `url("${currentBgPreview}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {FIELD_KEYS.filter((k) => fieldLayouts[k]?.enabled).map((k) => (
                      <DraggableFieldBox
                        key={k}
                        fieldKey={k}
                        field={fieldLayouts[k]}
                        placeholder={fieldPlaceholder(k, fieldLabel(k, t))}
                        dragHint={t.certificateTemplates.dragToPosition}
                        onDown={startDrag}
                        onMove={moveDrag}
                        onUp={endDrag}
                      />
                    ))}
                  </Box>

                  <Box data-testid="cert-layout-fields" style={{ flex: 1, minWidth: 260 }}>
                    <Text size="xs" fw={600} c="dimmed" mb={6}>
                      {t.certificateTemplates.showFields}
                    </Text>
                    <Stack gap="xs">
                      {FIELD_KEYS.map((k) => {
                        const f = fieldLayouts[k];
                        return (
                          <Card key={k} withBorder padding="xs" radius="md">
                            <Group justify="space-between" align="center" wrap="nowrap">
                              <Text size="sm" fw={500}>
                                {fieldLabel(k, t)}
                              </Text>
                              <Switch
                                checked={f.enabled}
                                onChange={(e) => updateField(k, { enabled: e.currentTarget.checked })}
                                data-testid={`cert-field-switch-${k}`}
                              />
                            </Group>
                            {f.enabled && (
                              <Grid mt="xs" gap="xs">
                                <Grid.Col span={6}>
                                  <NumberInput
                                    label={t.certificateTemplates.fontSize}
                                    value={f.font_size}
                                    min={1}
                                    max={60}
                                    onChange={(v) => {
                                      const n = typeof v === 'number' ? v : Number(v);
                                      if (Number.isFinite(n)) {
                                        updateField(k, {
                                          font_size: clamp(Math.round(n), 1, 60),
                                        });
                                      }
                                    }}
                                    data-testid={`cert-field-size-${k}`}
                                  />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                  <Select
                                    label={t.certificateTemplates.fontWeight}
                                    data={WEIGHT_OPTIONS}
                                    value={f.font_weight}
                                    onChange={(v) =>
                                      v && updateField(k, { font_weight: v as CertificateFieldLayout['font_weight'] })
                                    }
                                    data-testid={`cert-field-weight-${k}`}
                                  />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                  <Select
                                    label={t.certificateTemplates.align}
                                    data={ALIGN_OPTIONS}
                                    value={f.align}
                                    onChange={(v) =>
                                      v && updateField(k, { align: v as CertificateFieldLayout['align'] })
                                    }
                                    data-testid={`cert-field-align-${k}`}
                                  />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                  <ColorInput
                                    label={t.certificateTemplates.color}
                                    format="hex"
                                    value={f.color}
                                    onChange={(c) => updateField(k, { color: c })}
                                    data-testid={`cert-field-color-${k}`}
                                  />
                                </Grid.Col>
                              </Grid>
                            )}
                          </Card>
                        );
                      })}
                    </Stack>
                  </Box>
                </Group>
              </Box>
            ) : (
              <Text size="sm" c="dimmed" data-testid="cert-layout-unavailable" mt="md">
                {t.certificateTemplates.editorRequiresImage}
              </Text>
            )}
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
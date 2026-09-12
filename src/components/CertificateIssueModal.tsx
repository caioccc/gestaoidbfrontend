import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  CERT_A4_H_PX,
  CERT_A4_W_PX,
  certificateFileName,
  certificateNodeToBlob,
  imageToDataUrl,
} from '../utils/certificate';
import { saveBlob } from '../api/finance';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import { useChurchCardConfig } from '../hooks/useChurchCardConfig';
import { CertificateDocument } from './CertificateDocument';
import type { CertificateIssueData, CertificateTemplate, CertificateType, Member } from '../types';

const PREVIEW_W_PX = 600;
const PREVIEW_SCALE = PREVIEW_W_PX / CERT_A4_W_PX;

interface CertificateIssueModalProps {
  opened: boolean;
  onClose: () => void;
  onIssued: () => void;
}

function firstApiError(e: unknown): string {
  const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return '';
  const firstKey = Object.keys(data)[0];
  const value = data[firstKey];
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === 'string') return value;
  return String(value ?? '');
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToDateLocal(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

export default function CertificateIssueModal({
  opened,
  onClose,
  onIssued,
}: CertificateIssueModalProps) {
  const { t } = useLanguage();
  const { profile } = useChurchCardConfig();

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [step, setStep] = useState(0);

  const [certType, setCertType] = useState<CertificateType>('BAPTISM');
  const [templateId, setTemplateId] = useState<string>('system');
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [recipient, setRecipient] = useState('');
  const [memberId, setMemberId] = useState<number | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [officiant, setOfficiant] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [term, setTerm] = useState('');
  const [verse, setVerse] = useState('');

  const [running, setRunning] = useState<'none' | 'generating' | 'issuing'>('none');
  const [showParents, setShowParents] = useState(true);
  const [previewNode, setPreviewNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!opened) return;
    let active = true;
    setStep(0);
    setTemplates([]);
    setLoadingTemplates(true);
    setBgDataUrl(null);
    setLogoDataUrl(null);
    setTemplateId('system');
    setCertType('BAPTISM');
    setRecipient('');
    setMemberId(null);
    setEventDate(null);
    setVerse('');
    setFatherName('');
    setMotherName('');
    setBook('');
    setPage('');
    setTerm('');
    setRunning('none');
    setShowParents(true);

    const logo = profile?.logo as string | undefined;
    if (logo) {
      imageToDataUrl(logo)
        .then((d) => {
          if (active) setLogoDataUrl(d);
        })
        .catch(() => undefined);
    }

    Promise.all([accountsApi.certificateTemplates(), accountsApi.members()])
      .then(([tpls, mbrs]) => {
        if (!active) return;
        setTemplates(tpls.filter((ts) => ts.is_active));
        setMembers(mbrs);
      })
      .catch(() => {
        if (active) {
          notifications.show({ color: 'red', message: t.certificates.error });
        }
      })
      .finally(() => {
        if (active) setLoadingTemplates(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  useEffect(() => {
    if (opened) setOfficiant((profile?.pastor_name as string | undefined) ?? '');
  }, [opened, profile?.pastor_name]);

  const selectedTemplate = useMemo(
    () =>
      templateId === 'system'
        ? null
        : (templates.find((ts) => `tpl-${ts.id}` === templateId) ?? null),
    [templates, templateId],
  );

  const layoutMode = selectedTemplate?.layout_mode ?? 'SYSTEM_DEFAULT';

  useEffect(() => {
    if (layoutMode === 'CUSTOM_IMAGE' && selectedTemplate?.background_image_url) {
      imageToDataUrl(selectedTemplate.background_image_url)
        .then(setBgDataUrl)
        .catch(() => setBgDataUrl(null));
    } else {
      setBgDataUrl(null);
    }
  }, [layoutMode, selectedTemplate]);

  const typeOptions = useMemo(
    () =>
      [
        { value: 'BAPTISM', label: t.certificates.typeBaptism },
        { value: 'CHILD_PRESENTATION', label: t.certificates.typeChild },
        { value: 'MEMBERSHIP_COURSE', label: t.certificates.typeMembershipCourse },
        { value: 'CUSTOM', label: t.certificates.typeCustom },
      ] as { value: CertificateType; label: string }[],
    [t],
  );

  const templateOptions = useMemo(() => {
    const systemOption = { value: 'system', label: t.certificates.systemDefault };
    const sameType = templates
      .filter((ts) => ts.certificate_type === certType)
      .map((ts) => ({ value: `tpl-${ts.id}`, label: ts.name }));
    const custom = templates
      .filter((ts) => ts.certificate_type === 'CUSTOM' && certType !== 'CUSTOM')
      .map((ts) => ({ value: `tpl-${ts.id}`, label: ts.name }));
    return [systemOption, ...sameType, ...custom];
  }, [templates, certType, t]);

  const pickTemplate = (value: string | null) => {
    if (!value) return;
    setTemplateId(value);
    const found = templates.find((ts) => `tpl-${ts.id}` === value);
    if (found?.default_verse) setVerse(found.default_verse);
  };

  const switchType = (value: CertificateType) => {
    setCertType(value);
    setTemplateId('system');
    setShowParents(value === 'CHILD_PRESENTATION');
  };

  const memberOptions = useMemo(() => members.map((m) => m.name), [members]);

  const pickMember = (name: string) => {
    setRecipient(name);
    const found = members.find((m) => m.name === name);
    if (found) {
      setMemberId(found.id);
      setFatherName(found.father_name || '');
      setMotherName(found.mother_name || '');
    } else {
      setMemberId(null);
    }
  };

  const churchData = {
    name: (profile?.name as string | undefined) ?? '',
    logo: logoDataUrl,
    city: (profile?.city as string | undefined) ?? '',
    state: (profile?.state as string | undefined) ?? '',
  };

  const issueData = {
    certificate_type: certType,
    type_label: typeOptions.find((o) => o.value === certType)?.label ?? '',
    recipient_name: recipient.trim(),
    event_date: eventDate ? toISODate(eventDate) : '',
    officiant_name: officiant.trim(),
    father_name: showParents ? fatherName.trim() : '',
    mother_name: showParents ? motherName.trim() : '',
    scripture_verse: verse.trim(),
    registry_book: book.trim(),
    registry_page: page.trim(),
    registry_number: term.trim(),
  };

  const requiredOk = recipient.trim().length > 0 && !!eventDate && officiant.trim().length > 0;

  const certLabels = t.certificates.certLabels;

  const handleGenerate = async () => {
    if (!requiredOk) return;
    let blob: Blob | null = null;
    try {
      if (layoutMode !== 'BASE_PDF') {
        setRunning('generating');
        if (!previewNode) {
          notifications.show({ color: 'red', message: t.certificates.error });
          return;
        }
        blob = await certificateNodeToBlob(previewNode);
        saveBlob(blob, `${certificateFileName(recipient.trim())}.pdf`);
      }
      setRunning('issuing');
      const payload: CertificateIssueData = {
        certificate_type: certType,
        recipient_name: recipient.trim(),
        member: memberId,
        event_date: issueData.event_date,
        officiant_name: officiant.trim(),
        father_name: issueData.father_name,
        mother_name: issueData.mother_name,
        scripture_verse: issueData.scripture_verse,
        registry_book: book.trim(),
        registry_page: page.trim(),
        registry_number: term.trim(),
      };
      if (layoutMode === 'BASE_PDF') {
        const cert = await accountsApi.issueCertificate(
          { ...payload, member: memberId },
          selectedTemplate?.id ?? null,
          null,
        );
        const pdfBlob = await accountsApi.certificatePdfDownload(cert.id);
        saveBlob(pdfBlob, `${certificateFileName(recipient.trim())}.pdf`);
      } else {
        await accountsApi.issueCertificate(
          { ...payload, member: memberId },
          selectedTemplate?.id ?? null,
          blob ? new File([blob], 'generated.pdf', { type: 'application/pdf' }) : null,
        );
      }
      notifications.show({ color: 'green', message: t.certificates.issuedDone });
      onIssued();
      onClose();
    } catch (e: unknown) {
      notifications.show({
        color: 'red',
        message: firstApiError(e) || t.certificates.error,
      });
    } finally {
      setRunning('none');
    }
  };

  const handleClose = () => {
    if (running !== 'none') return;
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={t.certificates.issue} size="xl" centered>
      <Stepper active={step} onStepClick={(s) => s < step && setStep(s)} size="sm" color="teal">
        <Stepper.Step label={t.certificates.step1} allowStepSelect>
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={500} mb={4}>
                {t.certificates.templateType}
              </Text>
              <SegmentedControl
                fullWidth
                value={certType}
                onChange={(v) => switchType(v as CertificateType)}
                data={typeOptions.map((o) => ({ value: o.value, label: o.label }))}
                data-testid="cert-type"
              />
            </Box>
            <Select
              label={t.certificates.layoutMode}
              placeholder={t.certificates.systemDefault}
              data={templateOptions}
              value={templateId}
              onChange={pickTemplate}
              searchable
              nothingFoundMessage={t.certificates.emptyTemplates}
              loading={loadingTemplates}
              data-testid="cert-template"
            />
            {selectedTemplate && (
              <Text size="xs" c="dimmed">
                {selectedTemplate.layout_mode === 'CUSTOM_IMAGE' &&
                  `${t.certificates.layoutImage} · ${selectedTemplate.name}`}
                {selectedTemplate.layout_mode === 'BASE_PDF' &&
                  `${t.certificates.layoutBasePdf} · ${selectedTemplate.name}`}
                {selectedTemplate.layout_mode === 'SYSTEM_DEFAULT' &&
                  `${t.certificates.layoutSystem} · ${selectedTemplate.name}`}
              </Text>
            )}
          </Stack>
        </Stepper.Step>
        <Stepper.Step label={t.certificates.step2} allowStepSelect>
          <Stack gap="xs">
            <Group grow align="flex-start">
              <Stack gap="xs" style={{ flex: 1.15 }}>
                <Autocomplete
                  label={t.certificates.recipient}
                  placeholder={t.certificates.recipientPlaceholder}
                  data={memberOptions}
                  value={recipient}
                  onChange={(v) => {
                    setRecipient(v);
                    if (!v) setMemberId(null);
                  }}
                  onOptionSubmit={pickMember}
                  limit={20}
                  required
                />
                <Group grow align="flex-end">
                  <DateInput
                    label={t.certificates.eventDate}
                    valueFormat="DD/MM/YYYY"
                    value={eventDate}
                    onChange={(v) => setEventDate(v ? isoToDateLocal(v) : null)}
                    clearable
                    required
                  />
                  <TextInput
                    label={t.certificates.officiant}
                    placeholder={t.certificates.officiantPlaceholder}
                    value={officiant}
                    onChange={(e) => setOfficiant(e.currentTarget.value)}
                    required
                  />
                </Group>
                {showParents && (
                  <Group grow>
                    <TextInput
                      label={t.certificates.father}
                      value={fatherName}
                      onChange={(e) => setFatherName(e.currentTarget.value)}
                    />
                    <TextInput
                      label={t.certificates.mother}
                      value={motherName}
                      onChange={(e) => setMotherName(e.currentTarget.value)}
                    />
                  </Group>
                )}
                <Group grow>
                  <TextInput
                    label={t.certificates.book}
                    value={book}
                    onChange={(e) => setBook(e.currentTarget.value)}
                  />
                  <TextInput
                    label={t.certificates.page}
                    value={page}
                    onChange={(e) => setPage(e.currentTarget.value)}
                  />
                  <TextInput
                    label={t.certificates.term}
                    value={term}
                    onChange={(e) => setTerm(e.currentTarget.value)}
                  />
                </Group>
                <Textarea
                  label={t.certificates.verse}
                  placeholder={t.certificates.verseHint}
                  value={verse}
                  onChange={(e) => setVerse(e.currentTarget.value)}
                  autosize
                  minRows={2}
                />
              </Stack>
              <Card withBorder p="xs" style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" fw={600} c="dimmed" mb={6}>
                  {t.certificates.preview}
                </Text>
                <Box style={{ position: 'relative', overflow: 'hidden', borderRadius: 6 }}>
                  <Box
                    style={{
                      width: PREVIEW_W_PX,
                      height: CERT_A4_H_PX * PREVIEW_SCALE,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Box
                      style={{
                        transform: `scale(${PREVIEW_SCALE})`,
                        transformOrigin: 'top left',
                        width: CERT_A4_W_PX,
                        height: CERT_A4_H_PX,
                      }}
                    >
                      <CertificateDocument
                        innerRef={setPreviewNode}
                        church={churchData}
                        data={issueData}
                        layoutMode={layoutMode}
                        backgroundImage={bgDataUrl}
                        labels={certLabels}
                      />
                    </Box>
                  </Box>
                </Box>
              </Card>
            </Group>
          </Stack>
        </Stepper.Step>
      </Stepper>
      <Group justify="space-between" mt="lg">
        <Button
          variant="default"
          onClick={step === 0 ? handleClose : () => setStep(0)}
          disabled={running !== 'none'}
        >
          {step === 0 ? t.common.cancel : t.common.back}
        </Button>
        {step === 0 ? (
          <Button onClick={() => setStep(1)} data-testid="cert-next">
            {t.common.add}
          </Button>
        ) : (
          <Button
            color="teal"
            loading={running !== 'none'}
            disabled={!requiredOk}
            onClick={handleGenerate}
            data-testid="cert-generate"
          >
            {running === 'generating'
              ? t.certificates.generating
              : running === 'issuing'
                ? t.certificates.issuing
                : t.certificates.generate}
          </Button>
        )}
      </Group>
    </Modal>
  );
}
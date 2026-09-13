import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  FileInput,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCopy,
  IconFileText,
  IconFileTypePdf,
  IconLink,
  IconPencil,
  IconPdf,
  IconPlus,
  IconQrcode,
  IconRefresh,
  IconTrash,
  IconWand,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import AuthGuard from '../components/AuthGuard';
import Layout from '../components/Layout';
import MobileItemCard from '../components/MobileItemCard';
import { RichText } from '../components/RichText';
import ShareLinkModal from '../components/ShareLinkModal';
import AtaTemplateModal from '../components/AtaTemplateModal';
import type { AtaTemplateFormSnapshot } from '../components/AtaTemplateModal';
import { accountsApi, ChurchMinutesPayload } from '../api/accounts';
import { saveBlob } from '../api/finance';
import { useLanguage } from '../i18n';
import { useCurrentChurch } from '../hooks/useCurrentChurch';
import { generateMinutesPdf } from '../utils/minutesPdf';
import { toUpperCamelWords } from '../utils/format';
import type { ChurchMinutes, MeetingType } from '../types';

function formatISODate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function isoToDateLocal(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function publicUrl(minutes: ChurchMinutes): string {
  if (typeof window === 'undefined') return `/ata/${minutes.public_hash}`;
  return `${window.location.origin}/ata/${minutes.public_hash}`;
}

interface MinutesFormValues {
  title: string;
  meeting_type: MeetingType | null;
  meeting_date: string;
  location: string;
  recorder: string;
  participants: string;
  content: string;
}

export default function MinutesPage() {
  const { t, locale } = useLanguage();
  const { church } = useCurrentChurch();
  const [minutes, setMinutes] = useState<ChurchMinutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<ChurchMinutes | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<ChurchMinutes | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toRegenerate, setToRegenerate] = useState<ChurchMinutes | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [toRemovePdf, setToRemovePdf] = useState<ChurchMinutes | null>(null);
  const [removingPdf, setRemovingPdf] = useState(false);
  const [qrMinutes, setQrMinutes] = useState<ChurchMinutes | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    accountsApi
      .minutes()
      .then((items) => setMinutes(items))
      .catch(() => setMinutes([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const emptyValues = (): MinutesFormValues => ({
    title: '',
    meeting_type: null,
    meeting_date: '',
    location: '',
    recorder: '',
    participants: '',
    content: '',
  });

  const form = useForm<MinutesFormValues>({
    initialValues: emptyValues(),
    validate: {
      title: (v) => (v.trim().length ? null : t.minutesPage.minuteTitle),
      meeting_type: (v) => (v ? null : t.minutesPage.meetingType),
      meeting_date: (v) => (v ? null : t.minutesPage.meetingDate),
      content: (v) => (v?.replace(/<[^>]*>/g, '').trim().length ? null : t.minutesPage.content),
    },
  });

  const MEETING_TYPES = (
    Object.keys(t.minutesPage.meetingTypes) as MeetingType[]
  ).map((k) => ({ value: k, label: t.minutesPage.meetingTypes[k] }));

  const openCreate = () => {
    setEditing(null);
    setPdfFile(null);
    form.setValues(emptyValues());
    form.resetDirty();
    setOpened(true);
  };

  const openEdit = (item: ChurchMinutes) => {
    setEditing(item);
    setPdfFile(null);
    form.setValues({
      title: item.title,
      meeting_type: item.meeting_type,
      meeting_date: item.meeting_date.slice(0, 10),
      location: item.location,
      recorder: item.recorder,
      participants: item.participants,
      content: item.content,
    });
    form.resetDirty();
    setOpened(true);
  };

  const submit = form.onSubmit((values) => {
    setSaving(true);
    const payload: ChurchMinutesPayload = {
      title: values.title,
      meeting_type: values.meeting_type as MeetingType,
      meeting_date: values.meeting_date,
      location: toUpperCamelWords(values.location),
      recorder: toUpperCamelWords(values.recorder),
      participants: values.participants,
      content: values.content,
    };

    const request = editing
      ? accountsApi.updateMinutes(editing.id, payload, pdfFile)
      : accountsApi.createMinutes(payload, pdfFile);

    request
      .then(() => {
        notifications.show({ message: t.minutesPage.saved, color: 'green' });
        setOpened(false);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      })
      .finally(() => setSaving(false));
  });

  const handleTemplateApply = (
    html: string,
    backfill: Partial<AtaTemplateFormSnapshot>,
  ) => {
    form.setValues((prev) => ({ ...prev, ...backfill, content: html }));
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    accountsApi
      .deleteMinutes(toDelete.id)
      .then(() => {
        notifications.show({ message: t.minutesPage.deleted, color: 'green' });
        setToDelete(null);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      })
      .finally(() => setDeleting(false));
  };

  const confirmRegenerate = () => {
    if (!toRegenerate) return;
    setRegenerating(true);
    accountsApi
      .regenerateMinutesHash(toRegenerate.id)
      .then(() => {
        notifications.show({ message: t.minutesPage.regenerate, color: 'green' });
        setToRegenerate(null);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      })
      .finally(() => setRegenerating(false));
  };

  const confirmRemovePdf = () => {
    if (!toRemovePdf) return;
    setRemovingPdf(true);
    accountsApi
      .removeMinutesPdf(toRemovePdf.id)
      .then(() => {
        notifications.show({ message: t.minutesPage.saved, color: 'green' });
        setToRemovePdf(null);
        load();
      })
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      })
      .finally(() => setRemovingPdf(false));
  };

  const copyLink = (item: ChurchMinutes) => {
    navigator.clipboard
      .writeText(publicUrl(item))
      .then(() => notifications.show({ message: t.minutesPage.copied, color: 'green' }))
      .catch(() => undefined);
  };

  const downloadPdf = (item: ChurchMinutes) => {
    accountsApi
      .minutesPdfDownload(item.id)
      .then((blob) => saveBlob(blob, item.pdf_name || 'ata.pdf'))
      .catch(() => {
        notifications.show({ message: t.overview, color: 'red' });
      });
  };

  const generatePdf = async (item: ChurchMinutes) => {
    if (generatingId !== null) return;
    setGeneratingId(item.id);
    try {
      await generateMinutesPdf({
        title: item.title,
        meetingTypeDisplay: item.meeting_type_display,
        meetingDate: item.meeting_date,
        location: item.location,
        recorder: item.recorder,
        participants: item.participants,
        content: item.content,
        churchName: church?.name,
        months: t.months,
        dateStyle: locale === 'en' ? 'MDY' : 'DMY',
        labels: {
          docTitle: t.minutesPage.pdfDocTitle,
          meetingDate: t.minutesPage.meetingDate,
          meetingType: t.minutesPage.meetingType,
          location: t.minutesPage.location,
          recorder: t.minutesPage.recorder,
          participants: t.minutesPage.participants,
          signature: t.minutesPage.pdfSignature,
        },
      });
      notifications.show({ message: t.minutesPage.pdfGenerated, color: 'green' });
    } catch {
      notifications.show({ message: t.overview, color: 'red' });
    } finally {
      setGeneratingId(null);
    }
  };

  const minuteActions = (m: ChurchMinutes) => (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Tooltip label={t.minutesPage.generatePdf}>
        <ActionIcon
          variant="subtle"
          loading={generatingId === m.id}
          onClick={() => generatePdf(m)}
          aria-label={t.minutesPage.generatePdf}
          data-testid={`minute-genpdf-${m.id}`}
        >
          <IconFileTypePdf size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t.qrShare.qr}>
        <ActionIcon
          variant="subtle"
          onClick={() => setQrMinutes(m)}
          aria-label={t.qrShare.qr}
          data-testid={`minute-qr-${m.id}`}
        >
          <IconQrcode size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t.minutesPage.copyLink}>
        <ActionIcon
          variant="subtle"
          onClick={() => copyLink(m)}
          aria-label={t.minutesPage.copyLink}
        >
          <IconLink size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t.minutesPage.regenerate}>
        <ActionIcon
          variant="subtle"
          onClick={() => setToRegenerate(m)}
          aria-label={t.minutesPage.regenerate}
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t.common.edit}>
        <ActionIcon
          variant="subtle"
          onClick={() => openEdit(m)}
          aria-label={t.common.edit}
        >
          <IconPencil size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t.common.delete}>
        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => setToDelete(m)}
          aria-label={t.common.delete}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  return (
    <AuthGuard>
      <Layout>
        <PageHeader title={t.minutesPage.title} description={t.minutesPage.subtitle}>
          <Button leftSection={<IconPlus size={18} />} onClick={openCreate} data-testid="add-minute">
            {t.minutesPage.add}
          </Button>
        </PageHeader>

        {loading ? (
          <Center h="40vh">
            <Loader />
          </Center>
        ) : minutes.length === 0 ? (
          <Card withBorder p="xl" ta="center" c="dimmed">
            <ThemeIcon size={48} radius="xl" variant="light" mx="auto" mb="sm">
              <IconFileText size={24} />
            </ThemeIcon>
            <Text>{t.minutesPage.empty}</Text>
          </Card>
        ) : (
          <Card withBorder p={0}>
            <Box visibleFrom="sm">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.minutesPage.minuteTitle}</Table.Th>
                    <Table.Th>{t.minutesPage.meetingDate}</Table.Th>
                    <Table.Th>{t.minutesPage.meetingType}</Table.Th>
                    <Table.Th>{t.common.name}</Table.Th>
                    <Table.Th>{t.minutesPage.pdf}</Table.Th>
                    <Table.Th ta="right">{t.common.actions}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {minutes.map((m) => (
                    <Table.Tr key={m.id} data-testid={`minute-row-${m.id}`}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {m.title}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                          {formatISODate(m.meeting_date)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{m.meeting_type_display}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{m.recorder || '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        {m.pdf_name ? (
                          <Button
                            variant="subtle"
                            size="compact-sm"
                            leftSection={<IconPdf size={16} />}
                            onClick={() => downloadPdf(m)}
                          >
                            PDF
                          </Button>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>{minuteActions(m)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
            <Stack hiddenFrom="sm" gap="xs" p="sm">
              {minutes.map((m) => (
                <MobileItemCard
                  key={m.id}
                  testId={`minute-mobile-${m.id}`}
                  media={
                    <ThemeIcon color="blue" variant="light" radius="md" size="lg">
                      <IconFileText size={20} />
                    </ThemeIcon>
                  }
                  actions={minuteActions(m)}
                >
                  <Stack gap={4}>
                    <Text fw={600} truncate>
                      {m.title}
                    </Text>
                    <Group gap={4} wrap="nowrap" align="center">
                      <Badge variant="light" size="sm">
                        {m.meeting_type_display}
                      </Badge>
                      <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {formatISODate(m.meeting_date)}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {m.recorder || '—'}
                    </Text>
                  </Stack>
                </MobileItemCard>
              ))}
            </Stack>
          </Card>
        )}

        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={editing ? t.minutesPage.editTitle : t.minutesPage.add}
          size="lg"
        >
          <form onSubmit={submit}>
            <Stack gap="sm">
              <TextInput
                label={t.minutesPage.minuteTitle}
                placeholder={t.minutesPage.minuteTitlePlaceholder}
                {...form.getInputProps('title')}
              />
              <Group grow align="flex-end">
                <Select
                  label={t.minutesPage.meetingType}
                  placeholder={t.minutesPage.meetingTypePlaceholder}
                  data={MEETING_TYPES}
                  value={form.values.meeting_type}
                  onChange={(v) =>
                    form.setFieldValue('meeting_type', (v as MeetingType) || null)
                  }
                  error={form.errors.meeting_type}
                />
                <DateInput
                  label={t.minutesPage.meetingDate}
                  valueFormat="DD/MM/YYYY"
                  value={
                    form.values.meeting_date ? isoToDateLocal(form.values.meeting_date) : null
                  }
                  onChange={(v) => form.setFieldValue('meeting_date', v ?? '')}
                  clearable
                  error={form.errors.meeting_date}
                />
              </Group>
              <Group grow>
                <TextInput
                  label={t.minutesPage.location}
                  placeholder={t.minutesPage.locationPlaceholder}
                  {...form.getInputProps('location')}
                />
                <TextInput
                  label={t.minutesPage.recorder}
                  placeholder={t.minutesPage.recorderPlaceholder}
                  {...form.getInputProps('recorder')}
                />
              </Group>
              <Textarea
                label={t.minutesPage.participants}
                rows={3}
                {...form.getInputProps('participants')}
              />
              <div>
                <Group justify="space-between" mb={4} wrap="nowrap">
                  <Text size="sm" fw={500}>
                    {t.minutesPage.content}
                    <span style={{ color: 'var(--mantine-color-red-6)' }}> *</span>
                  </Text>
                  <Tooltip label={t.ataTemplates.chooseTemplateHint} withArrow>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="violet"
                      leftSection={<IconWand size={14} />}
                      onClick={() => setTemplateOpen(true)}
                      data-testid="minutes-template-open"
                    >
                      {t.ataTemplates.chooseTemplate}
                    </Button>
                  </Tooltip>
                </Group>
                <RichText
                  value={form.values.content}
                  onChange={(html) => form.setFieldValue('content', html)}
                  placeholder={t.minutesPage.contentPlaceholder}
                />
                {form.errors.content && (
                  <Text size="xs" c="red" mt={6}>
                    {form.errors.content}
                  </Text>
                )}
              </div>
              <Paper withBorder p="sm">
                <Text size="sm" fw={500} mb={4}>
                  {t.minutesPage.pdf}
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  {t.minutesPage.pdfHint}
                </Text>
                <Stack gap="xs">
                  <FileInput
                    accept="application/pdf,.pdf"
                    value={pdfFile}
                    onChange={setPdfFile}
                    placeholder={
                      editing && editing.pdf_name
                        ? editing.pdf_name
                        : t.minutesPage.attachPdf
                    }
                    clearable
                    leftSection={<IconPdf size={16} />}
                  />
                  {editing && editing.pdf_name && (
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-sm"
                      onClick={() => setToRemovePdf(editing)}
                    >
                      {t.minutesPage.removePdf}
                    </Button>
                  )}
                </Stack>
              </Paper>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setOpened(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" loading={saving} data-testid="save-minute">
                  {t.common.save}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={!!toDelete}
          onClose={() => setToDelete(null)}
          title={t.minutesPage.deleteTitle}
        >
          <Stack gap="lg">
            <Text>
              {t.minutesPage.deleteBody.replace(
                '{title}',
                toDelete ? toDelete.title : '',
              )}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToDelete(null)}>
                {t.common.cancel}
              </Button>
              <Button color="red" loading={deleting} onClick={confirmDelete}>
                {t.common.delete}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!toRegenerate}
          onClose={() => setToRegenerate(null)}
          title={t.minutesPage.regenerateTitle}
        >
          <Stack gap="lg">
            <Text>{t.minutesPage.regenerateBody}</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToRegenerate(null)}>
                {t.common.cancel}
              </Button>
              <Button color="yellow" loading={regenerating} onClick={confirmRegenerate}>
                <IconRefresh size={16} />
                <span style={{ marginLeft: 6 }}>{t.minutesPage.regenerate}</span>
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={!!toRemovePdf}
          onClose={() => setToRemovePdf(null)}
          title={t.minutesPage.removePdf}
        >
          <Stack gap="lg">
            <Text>{t.minutesPage.removePdfBody}</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setToRemovePdf(null)}>
                {t.common.cancel}
              </Button>
              <Button color="red" loading={removingPdf} onClick={confirmRemovePdf}>
                {t.common.confirm}
              </Button>
            </Group>
          </Stack>
        </Modal>

        <ShareLinkModal
          opened={!!qrMinutes}
          onClose={() => setQrMinutes(null)}
          title={t.qrShare.minutesTitle}
          subtitle={t.qrShare.subtitle}
          getUrl={() =>
            qrMinutes ? Promise.resolve(publicUrl(qrMinutes)) : Promise.reject(new Error('no minutes'))
          }
          regenerate={() =>
            accountsApi.regenerateMinutesHash(qrMinutes!.id).then((next) => {
              load();
              return publicUrl(next);
            })
          }
        />

        <AtaTemplateModal
          opened={templateOpen}
          onClose={() => setTemplateOpen(false)}
          church={church}
          values={{
            meeting_type: form.values.meeting_type,
            meeting_date: form.values.meeting_date,
            location: form.values.location,
            recorder: form.values.recorder,
            content: form.values.content,
          }}
          onApply={handleTemplateApply}
        />
      </Layout>
    </AuthGuard>
  );
}
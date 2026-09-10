import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Center,
  Group,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconAlertTriangle, IconArrowLeft, IconCheck, IconFileText } from '@tabler/icons-react';
import MaskedTextInput from './MaskedTextInput';
import { toUpperCamelWords } from '../utils/format';
import { useLanguage } from '../i18n';
import type { CurrentChurch } from '../hooks/useCurrentChurch';
import {
  bodyToHtml,
  HTML_SEPARATOR,
  interpolateMinutesTemplate,
  minutesTemplateById,
  striphtml,
  TEMPLATES,
} from '../features/minutes/templates';
import type { MinutesTemplateLocale } from '../features/minutes/templates';
import type { MeetingType } from '../types';

export interface AtaTemplateFormSnapshot {
  meeting_type: MeetingType | null;
  meeting_date: string;
  location: string;
  recorder: string;
  content: string;
}

interface AtaTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  values: AtaTemplateFormSnapshot;
  church: CurrentChurch | null;
  onApply: (html: string, backfill: Partial<AtaTemplateFormSnapshot>) => void;
}

function isoToDateLocal(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AtaTemplateModal({
  opened,
  onClose,
  values,
  church,
  onApply,
}: AtaTemplateModalProps) {
  const { t, locale } = useLanguage();

  const [step, setStep] = useState<'select' | 'fill'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<'replace' | 'append' | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType | null>(values.meeting_type);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [president, setPresident] = useState('');
  const [recorder, setRecorder] = useState(values.recorder);

  useEffect(() => {
    if (!opened) return;
    setStep('select');
    setSelectedId(null);
    setConfirmMode(null);
    setDate(values.meeting_date ? isoToDateLocal(values.meeting_date) : null);
    setMeetingType(values.meeting_type);
    setRecorder(values.recorder);
    setStartTime('');
    setEndTime('');
    setPresident('');
    setDateError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleClose = () => {
    setConfirmMode(null);
    setStep('select');
    onClose();
  };

  const template = selectedId ? minutesTemplateById(selectedId) : null;
  const dateIso = date ? toISODate(date) : '';

  const churchAddress = useMemo(() => {
    if (!church) return '';
    const base = church.street
      ? church.number
        ? `${church.street}, ${church.number}`
        : church.street
      : church.number || '';
    return [base, church.neighborhood].filter(Boolean).join(' - ');
  }, [church]);

  const cityUf = church?.city
    ? church.state
      ? `${church.city}/${church.state}`
      : church.city
    : '';

  const generatedText = useMemo(() => {
    if (!template) return '';
    const ctx = {
      date: dateIso,
      startTime,
      endTime,
      churchName: church?.name || null,
      churchAddress: churchAddress || null,
      cityUf: cityUf || null,
      president: president ? toUpperCamelWords(president) : null,
      recorder: recorder ? toUpperCamelWords(recorder) : null,
      local: values.location || null,
      months: t.months,
      locale: locale as MinutesTemplateLocale,
    };
    return interpolateMinutesTemplate(template.body[locale as MinutesTemplateLocale], ctx);
  }, [
    template,
    dateIso,
    startTime,
    endTime,
    church,
    churchAddress,
    cityUf,
    president,
    recorder,
    values.location,
    t.months,
    locale,
  ]);

  const generatedHtml = useMemo(() => bodyToHtml(generatedText), [generatedText]);

  const meetingTypes = useMemo(
    () =>
      (Object.keys(t.minutesPage.meetingTypes) as MeetingType[]).map((k) => ({
        value: k,
        label: t.minutesPage.meetingTypes[k],
      })),
    [t],
  );

  const apply = (mode: 'replace' | 'append') => {
    if (!template) return;
    const html =
      mode === 'append' && striphtml(values.content)
        ? `${values.content}${HTML_SEPARATOR}${generatedHtml}`
        : generatedHtml;
    const backfill: Partial<AtaTemplateFormSnapshot> = {};
    if (!values.meeting_type) backfill.meeting_type = meetingType;
    if (!values.meeting_date) backfill.meeting_date = dateIso;
    if (!values.recorder) backfill.recorder = toUpperCamelWords(recorder);
    onApply(html, backfill);
    handleClose();
  };

  const handleInsert = () => {
    if (!date) {
      setDateError(true);
      return;
    }
    if (striphtml(values.content)) {
      setConfirmMode('replace');
    } else {
      apply('replace');
    }
  };

  const timeProps = (value: string, setValue: (v: string) => void) => ({
    value,
    onAccept: (v: string) => setValue(v),
    mask: '00:00',
    placeholder: t.ataTemplates.timePlaceholder,
    inputMode: 'numeric' as const,
  });

  if (confirmMode) {
    return (
      <Modal opened onClose={() => setConfirmMode(null)} title={t.ataTemplates.hasContentTitle} centered>
        <Stack gap="md">
          <AlertTone title={t.ataTemplates.hasContentBody} />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmMode(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="light" color="blue" onClick={() => apply('append')}>
              {t.ataTemplates.appendAction}
            </Button>
            <Button color="orange" onClick={() => apply('replace')} data-testid="template-insert-replace">
              {t.ataTemplates.replaceAction}
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal opened={opened} onClose={handleClose} title={t.ataTemplates.modalTitle} size="xl">
      {step === 'select' ? (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t.ataTemplates.subtitle}
          </Text>
          <Text size="sm" fw={600}>
            {t.ataTemplates.stepSelect}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {TEMPLATES.map((tmpl) => {
              const sel = selectedId === tmpl.id;
              return (
                <Card
                  key={tmpl.id}
                  withBorder
                  padding="md"
                  onClick={() => setSelectedId(tmpl.id)}
                  data-testid={`template-card-${tmpl.id}`}
                  style={{
                    cursor: 'pointer',
                    borderColor: sel ? 'var(--mantine-color-blue-5)' : undefined,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600}>{tmpl.title[locale as MinutesTemplateLocale]}</Text>
                    {sel && <IconCheck size={16} color="var(--mantine-color-blue-6)" />}
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>
                    {tmpl.description[locale as MinutesTemplateLocale]}
                  </Text>
                </Card>
              );
            })}
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => step === 'select' && setStep('fill')}
              disabled={!selectedId}
              data-testid="template-next"
            >
              {t.ataTemplates.next}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t.ataTemplates.subtitle}
          </Text>
          <Text size="sm" fw={600}>
            {t.ataTemplates.stepFill}
          </Text>

          <Group grow align="flex-end">
            <Select
              label={t.minutesPage.meetingType}
              placeholder={t.minutesPage.meetingTypePlaceholder}
              data={meetingTypes}
              value={meetingType}
              onChange={(v) => setMeetingType((v as MeetingType) || null)}
            />
            <DateInput
              label={t.minutesPage.meetingDate}
              valueFormat="DD/MM/YYYY"
              value={date}
              onChange={(v) => {
                const next = typeof v === 'string' ? isoToDateLocal(v) : v;
                setDate(next);
                if (next) setDateError(false);
              }}
              clearable
              error={dateError ? t.ataTemplates.dateRequired : undefined}
            />
          </Group>

          <Group grow>
            <MaskedTextInput
              label={t.ataTemplates.fieldStartTime}
              {...timeProps(startTime, setStartTime)}
            />
            <MaskedTextInput
              label={t.ataTemplates.fieldEndTime}
              {...timeProps(endTime, setEndTime)}
            />
          </Group>

          <Group grow>
            <TextInput
              label={t.ataTemplates.fieldPresident}
              placeholder={t.ataTemplates.presidentPlaceholder}
              value={president}
              onChange={(e) => setPresident(e.currentTarget.value)}
            />
            <TextInput
              label={t.minutesPage.recorder}
              placeholder={t.minutesPage.recorderPlaceholder}
              value={recorder}
              onChange={(e) => setRecorder(e.currentTarget.value)}
            />
          </Group>

          <Card withBorder padding="sm">
            <Group justify="space-between" mb={4} wrap="nowrap">
              <Text size="xs" fw={600} c="dimmed">
                {t.ataTemplates.preview}
              </Text>
              <Button
                size="xs"
                variant="default"
                leftSection={<IconArrowLeft size={14} />}
                onClick={() => setStep('select')}
              >
                {t.ataTemplates.back}
              </Button>
            </Group>
            {generatedHtml ? (
              <ScrollArea.Autosize mah={280} scrollbars="y">
                <Text size="sm" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
              </ScrollArea.Autosize>
            ) : (
              <Center h={120}>
                <Text size="sm" c="dimmed">
                  {t.ataTemplates.chooseTemplateHint}
                </Text>
              </Center>
            )}
          </Card>

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              {t.common.cancel}
            </Button>
            <Button
              leftSection={<IconFileText size={16} />}
              onClick={handleInsert}
              data-testid="template-insert"
            >
              {t.ataTemplates.insertAction}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

function AlertTone({ title }: { title: string }) {
  return (
    <Group gap="xs" align="flex-start" wrap="nowrap">
      <IconAlertTriangle size={18} color="var(--mantine-color-orange-6)" style={{ flexShrink: 0 }} />
      <Text size="sm">{title}</Text>
    </Group>
  );
}
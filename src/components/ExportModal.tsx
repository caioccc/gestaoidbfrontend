import React, { useState } from 'react';
import {
  Modal,
  Stepper,
  Stack,
  Group,
  Button,
  Text,
  Select,
  Alert,
  ThemeIcon,
  Center,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDownload,
  IconCheck,
  IconArrowRight,
  IconFileSpreadsheet,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { saveBlob } from '../api/finance';

export type ExportType = 'entries' | 'exits' | 'closings';

export interface ExportApi {
  exportEntries: (year: number, month: number) => Promise<Blob>;
  exportExits: (year: number, month: number) => Promise<Blob>;
  exportClosings: (
    mode: 'annual' | 'period',
    year: number,
    month?: number
  ) => Promise<Blob>;
}

interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  type: ExportType;
  api: ExportApi;
}

const YEARS = (() => {
  const current = new Date().getFullYear();
  const list: number[] = [];
  for (let y = current + 1; y >= 2022; y -= 1) list.push(y);
  return list;
})();

export default function ExportModal({ opened, onClose, type, api }: ExportModalProps) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<'annual' | 'period'>('annual');
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const isPeriod = mode === 'period';
  const settlementReady =
    type === 'closings'
      ? isPeriod
        ? year != null && month != null
        : year != null
      : year != null && month != null;

  const titleKey =
    type === 'entries'
      ? 'titleEntries'
      : type === 'exits'
      ? 'titleExits'
      : 'titleClosings';

  const reset = () => {
    setActive(0);
    setMode('annual');
    setYear(null);
    setMonth(null);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleNext = () => setActive((c) => Math.min(1, c + 1));
  const handleBack = () => setActive((c) => Math.max(0, c - 1));

  const handleDownload = async () => {
    if (year == null) return;
    if (type === 'closings') {
      if (mode === 'period' && month == null) return;
      const monthArg = mode === 'period' ? month! : undefined;
      setDownloading(true);
      try {
        const blob = await api.exportClosings(mode, year, monthArg);
        const name =
          mode === 'annual'
            ? `fechamento-${year}.xlsx`
            : `fechamento-${year}-${String(monthArg).padStart(2, '0')}.xlsx`;
        saveBlob(blob, name);
        setDone(true);
        notifications.show({ color: 'green', message: t.exportPage.success });
      } catch (err: any) {
        notifications.show({
          color: 'red',
          title: 'Erro',
          message: err?.response?.data?.detail || t.exportPage.error,
        });
      } finally {
        setDownloading(false);
      }
      return;
    }
    if (month == null) return;
    setDownloading(true);
    try {
      const blob =
        type === 'entries'
          ? await api.exportEntries(year, month)
          : await api.exportExits(year, month);
      const prefix = type === 'entries' ? 'entradas' : 'saidas';
      saveBlob(blob, `${prefix}-${year}-${String(month).padStart(2, '0')}.xlsx`);
      setDone(true);
      notifications.show({ color: 'green', message: t.exportPage.success });
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Erro',
        message: err?.response?.data?.detail || t.exportPage.error,
      });
    } finally {
      setDownloading(false);
    }
  };

  const summaryText =
    type === 'entries'
      ? t.exportPage.textEntries
      : type === 'exits'
      ? t.exportPage.textExits
      : isPeriod
      ? t.exportPage.textClosingsPeriod
      : t.exportPage.textClosingsAnnual;

  const periodLabel =
    type === 'closings' && !isPeriod
      ? `${t.exportPage.modeAnnual} — ${year ?? '—'}`
      : month != null
      ? `${t.months[month - 1]}/${year}`
      : `${t.exportPage.modeAnnual} — ${year ?? '—'}`;

  return (
    <Modal opened={opened} onClose={handleClose} title={t.exportPage[titleKey]} centered>
      <Stepper active={active} allowNextStepsSelect={false} size="sm">
        <Stepper.Step label={t.exportPage.stepSetup}>
          <Stack mt="md" gap="md">
            {type === 'closings' && (
              <Select
                label={t.exportPage.modeLabel}
                data-testid="export-mode"
                value={mode}
                onChange={(v) => setMode((v as 'annual' | 'period') || 'annual')}
                data={[
                  { value: 'annual', label: t.exportPage.modeAnnual },
                  { value: 'period', label: t.exportPage.modePeriod },
                ]}
              />
            )}
            <Group grow align="end">
              <Select
                label={t.exportPage.yearLabel}
                data-testid="export-year"
                placeholder={t.exportPage.yearLabel}
                data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                value={year != null ? String(year) : null}
                onChange={(v) => setYear(v ? Number(v) : null)}
                searchable
              />
              {!(type === 'closings' && !isPeriod) && (
                <Select
                  label={t.exportPage.monthLabel}
                  data-testid="export-month"
                  placeholder={t.exportPage.monthLabel}
                  data={t.months.map((m, i) => ({ value: String(i + 1), label: m }))}
                  value={month != null ? String(month) : null}
                  onChange={(v) => setMonth(v ? Number(v) : null)}
                  searchable
                />
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {summaryText}
            </Text>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t.exportPage.stepDownload}>
          <Stack mt="md" align="center" gap="md">
            <ThemeIcon size={56} radius="xl" color="blue" variant="light">
              {done ? <IconCheck size={28} /> : <IconFileSpreadsheet size={28} />}
            </ThemeIcon>
            <Text fw={600}>{periodLabel}</Text>
            {done ? (
              <Alert
                icon={<IconCheck size={16} />}
                color="green"
                w="100%"
                title={t.exportPage.success}
              >
                {summaryText}
              </Alert>
            ) : downloading ? (
              <Center py="md">
                <Loader />
              </Center>
            ) : (
              <Button
                leftSection={<IconDownload size={16} />}
                data-testid="export-download"
                loading={downloading}
                onClick={handleDownload}
              >
                {t.exportPage.downloadButton}
              </Button>
            )}
          </Stack>
        </Stepper.Step>
      </Stepper>

      {!done && (
        <Group justify="space-between" mt="lg">
          <Button
            variant="default"
            onClick={handleBack}
            disabled={active === 0 || downloading}
          >
            {t.registerPage.back}
          </Button>
          {active === 0 ? (
            <Button
              rightSection={<IconArrowRight size={16} />}
              data-testid="export-next"
              disabled={!settlementReady}
              onClick={handleNext}
            >
              {t.registerPage.next}
            </Button>
          ) : (
            <Button variant="light" onClick={handleClose}>
              {t.common.cancel}
            </Button>
          )}
        </Group>
      )}

      {done && (
        <Center mt="lg">
          <Button variant="light" onClick={handleClose}>
            {t.common.cancel}
          </Button>
        </Center>
      )}
    </Modal>
  );
}

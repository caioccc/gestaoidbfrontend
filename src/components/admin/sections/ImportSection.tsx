import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Stepper,
  Stack,
  Text,
  Title,
  Group,
  Button,
  Paper,
  Alert,
  ThemeIcon,
  SimpleGrid,
  Center,
  Loader,
  Select,
  Modal,
  Grid,
} from '@mantine/core';
import {
  IconFileSpreadsheet,
  IconDownload,
  IconUpload,
  IconCheck,
  IconAlertTriangle,
  IconListCheck,
  IconArrowRight,
} from '@tabler/icons-react';
import { Dropzone, MS_EXCEL_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import PageHeader from '../../../components/PageHeader';
import ImportErrorsPanel from '../../../components/ImportErrorsPanel';
import ColumnMatchStep from '../../../components/ColumnMatchStep';
import ColumnPreview from '../../../components/ColumnPreview';
import { useLanguage } from '../../../i18n';
import { ImportResult, ExistingMonthData, SpreadsheetInspection } from '../../../types';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { TEMPLATE_FILES } from '../../../api/finance';

type FileSlot = { name: string; key: 'entries' | 'exits' | 'tithers' };

const SLOTS: { key: 'entries' | 'exits' | 'tithers'; label: string; example: string }[] = [
  { key: 'entries', label: 'Entradas', example: 'Data | Culto/Serviço | Categoria | Valor' },
  { key: 'exits', label: 'Saídas', example: 'Data | Descrição | Categoria | Valor' },
  { key: 'tithers', label: 'Dizimistas', example: 'Nome | Mês | Ano | Valor' },
];

const MONTHS_LOCALE = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const IMPORT_YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

function downloadTemplate(type: 'entries' | 'exits' | 'tithers') {
  const url = TEMPLATE_FILES[type];
  const a = document.createElement('a');
  a.href = url;
  a.download = url.split('/').pop() || 'modelo';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ImportSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [files, setFiles] = useState<Record<'entries' | 'exits' | 'tithers', File | null>>({
    entries: null,
    exits: null,
    tithers: null,
  });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [existing, setExisting] = useState<ExistingMonthData | null>(null);
  const [mapping, setMapping] = useState<Record<string, Record<string, string>>>({});
  const [matchComplete, setMatchComplete] = useState<Record<string, boolean>>({});
  const [inspections, setInspections] = useState<Record<string, SpreadsheetInspection>>({});

  useEffect(() => {
    if (year == null || month == null) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    api
      .importAvailability(year, month)
      .then((data) => {
        if (!cancelled) setExisting(data);
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, year, month]);

  const dropLabels = {
    entries: t.importPage.dropEntries,
    exits: t.importPage.dropExits,
    tithers: t.importPage.dropTithers,
  };

  const selectedCount = [files.entries, files.exits, files.tithers].filter(Boolean).length;
  const hasBlocking = result ? (result.errors?.length ?? 0) > 0 : false;

  const matchKinds = SLOTS.map((s) => s.key).filter((k) => files[k] != null);
  const processIdx = 2 + matchKinds.length;
  const atMatch = active >= 2 && active < processIdx;
  const currentKind = atMatch ? matchKinds[active - 2] : null;
  const allMatchComplete = matchKinds.every((k) => matchComplete[k]);

  const existingEntries = result?.existing_entries ?? existing?.entries ?? 0;
  const existingExits = result?.existing_exits ?? existing?.exits ?? 0;
  const existingTithes = result?.existing_tithe_records ?? existing?.tithe_records ?? 0;
  const hasExistingData = existingEntries > 0 || existingExits > 0 || existingTithes > 0;

  const runImport = async (dryRun: boolean) => {
    if (year == null || month == null) return;
    setError(null);
    setResult(null);
    setProcessing(true);
    try {
      const fd = new FormData();
      if (files.entries) fd.append('entries', files.entries);
      if (files.exits) fd.append('exits', files.exits);
      if (files.tithers) fd.append('tithers', files.tithers);
      fd.append('year', String(year));
      fd.append('month', String(month));
      if (matchKinds.length) fd.append('mapping', JSON.stringify(mapping));
      if (dryRun) fd.append('dry_run', '1');
      const res = await api.importSpreadsheet(fd);
      setResult(res);
      setActive(processIdx);
      if (dryRun) {
        notifications.show({ color: 'blue', message: t.importPage.dryRunDone });
      } else {
        notifications.show({
          color: 'green',
          title: t.importPage.successTitle,
          message: t.importPage.entriesImported,
        });
        const churchId = router.query.churchId;
        if (churchId) {
          router.push(`/admin/churches/${churchId}/dashboard`);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao processar as planilhas.');
      notifications.show({ color: 'red', title: 'Erro', message: err?.response?.data?.detail || 'Falha ao processar.' });
    } finally {
      setProcessing(false);
      setCommitOpen(false);
    }
  };

  const handleValidate = () => runImport(true);
  const handleCommit = () => runImport(false);

  const slotLabel = (key: string) => SLOTS.find((s) => s.key === key)?.label;

  return (
    <>
      <PageHeader title={t.importPage.title} description={churchLabel} />

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size="sm">
        <Stepper.Step label={t.importPage.stepTemplates}>
          <Stack mt="md" gap="md">
            <Text c="dimmed" size="sm">
              Baixe o modelo de cada planilha, preencha com os dados da congregação e retorne
              para fazer o upload. Os cabeçalhos devem ser mantidos.
            </Text>
            <Grid align="flex-start" gap="lg">
              <Grid.Col span={{ base: 12, md: 5 }} maw={{ base: '100%', md: 420 }}>
                <Paper withBorder p="md" radius="md">
                  <Text size="sm" fw={700} mb={4}>
                    {t.importPage.competence}
                  </Text>
                  <Group align="flex-end" grow>
                    <Select
                      data-testid="admin-import-year"
                      label={t.importPage.yearLabel}
                      placeholder={t.importPage.selectingFile}
                      data={IMPORT_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                      value={year != null ? String(year) : null}
                      onChange={(v) => setYear(v ? Number(v) : null)}
                      clearable
                    />
                    <Select
                      data-testid="admin-import-month"
                      label={t.importPage.monthLabel}
                      placeholder={t.importPage.selectingFile}
                      data={MONTHS_LOCALE.map((m, i) => ({ value: String(i + 1), label: m }))}
                      value={month != null ? String(month) : null}
                      onChange={(v) => setMonth(v ? Number(v) : null)}
                      searchable
                    />
                  </Group>
                  <Alert icon={<IconAlertTriangle size={16} />} color="blue" mt="md" variant="light">
                    Os lançamentos importados serão vinculados à competência selecionada:{' '}
                    <b>
                      {month != null ? MONTHS_LOCALE[month - 1] : '—'}/{year ?? '—'}
                    </b>
                    . Certifique-se de que os arquivos enviados correspondem a este período.
                  </Alert>
                  {existing && hasExistingData && (
                    <Alert
                      icon={<IconAlertTriangle size={16} />}
                      color="red"
                      variant="light"
                      title={t.importPage.existingDataTitle}
                      mt="md"
                    >
                      {t.importPage.existingDataBody
                        .replace('{entries}', String(existingEntries))
                        .replace('{exits}', String(existingExits))
                        .replace('{titheRecords}', String(existingTithes))}
                    </Alert>
                  )}
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 7 }}>
                <Paper withBorder p="md" radius="md">
                  <Text size="sm" fw={700} mb={4}>
                    Modelos
                  </Text>
                  <Stack gap="sm">
                    {SLOTS.map((slot) => (
                      <Group key={slot.key} justify="space-between">
                        <Group gap="xs" wrap="nowrap">
                          <ThemeIcon color="blue" variant="light" size="lg">
                            <IconFileSpreadsheet size={20} />
                          </ThemeIcon>
                          <Stack gap={0}>
                            <Text size="sm" fw={600}>
                              {slot.label}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {slot.example}
                            </Text>
                          </Stack>
                        </Group>
                        <Button
                          variant="light"
                          size="md"
                          data-testid={`import-download-${slot.key}`}
                          aria-label={slot.label}
                          onClick={() => downloadTemplate(slot.key)}
                        >
                          <IconDownload size={18} />
                        </Button>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t.importPage.stepUpload}>
          <Stack mt="md" gap="lg">
            <Text c="dimmed" size="sm">
              {t.importPage.dropHint}
            </Text>
            {SLOTS.map((slot) => (
              <Stack key={slot.key} gap={6}>
                <Text size="sm" fw={600}>
                  {dropLabels[slot.key]}
                </Text>
                <Dropzone
                  data-testid={`import-dropzone-${slot.key}`}
                  accept={[...MS_EXCEL_MIME_TYPE, 'application/vnd.ms-excel']}
                  multiple={false}
                  onDrop={(dropped) =>
                    setFiles((prev) => ({ ...prev, [slot.key]: dropped[0] ?? null }))
                  }
                >
                  <Center py="lg">
                    <Stack align="center" gap={6}>
                      <ThemeIcon size={40} radius="xl" color="blue" variant="light">
                        <IconUpload size={20} />
                      </ThemeIcon>
                      {files[slot.key] ? (
                        <>
                          <IconCheck size={18} color="var(--mantine-color-green-6)" />
                          <Text size="sm" fw={600}>
                            {files[slot.key]?.name}
                          </Text>
                        </>
                      ) : (
                        <Text size="sm" c="dimmed">
                          {t.importPage.dropHint}
                        </Text>
                      )}
                    </Stack>
                  </Center>
                </Dropzone>
              </Stack>
            ))}
          </Stack>
        </Stepper.Step>

        {matchKinds.map((kind) => (
          <Stepper.Step key={kind} label={t.importPage.stepMapping}>
            <Stack mt="md" gap="md">
              <ColumnMatchStep
                kind={kind}
                file={files[kind]!}
                label={slotLabel(kind) ?? kind}
                inspect={api.inspectSpreadsheet}
                value={mapping[kind] ?? {}}
                onChange={(m) => setMapping((prev) => ({ ...prev, [kind]: m }))}
                onComplete={(c) => setMatchComplete((prev) => ({ ...prev, [kind]: c }))}
                onInspection={(k, insp) => setInspections((prev) => ({ ...prev, [k]: insp }))}
              />
            </Stack>
          </Stepper.Step>
        ))}

        <Stepper.Step label={t.importPage.stepProcess}>
          <Stack mt="md" gap="md" align="center">
            {matchKinds.length > 0 && (
              <Stack w="100%" gap="md" align="stretch">
                <Stack gap={2} align="center">
                  <Title order={4}>{t.importPage.mappingPreviewTitle}</Title>
                  <Text size="sm" c="dimmed">
                    {t.importPage.mappingPreviewScreenHint}
                  </Text>
                </Stack>
                {matchKinds.map((kind) => (
                  <ColumnPreview
                    key={kind}
                    kind={kind}
                    inspection={inspections[kind] ?? null}
                    mapping={mapping[kind] ?? {}}
                    label={slotLabel(kind) ?? kind}
                  />
                ))}
              </Stack>
            )}
            {processing ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : result ? (
              result.dry_run ? (
                <Stack w="100%" align="center" gap="md">
                  <ThemeIcon size={64} radius="xl" color="blue" variant="light">
                    <IconListCheck size={34} />
                  </ThemeIcon>
                  <Title order={3}>{t.importPage.previewTitle}</Title>
                  <Alert
                    icon={<IconListCheck size={16} />}
                    color={hasBlocking ? 'yellow' : 'green'}
                    w="100%"
                  >
                    {hasBlocking ? t.importPage.commitBlocked : t.importPage.previewNotice}
                  </Alert>
                  {hasExistingData && (
                    <Alert
                      icon={<IconAlertTriangle size={16} />}
                      color="red"
                      variant="light"
                      title={t.importPage.existingDataTitle}
                      w="100%"
                    >
                      {t.importPage.existingDataBody
                        .replace('{entries}', String(existingEntries))
                        .replace('{exits}', String(existingExits))
                        .replace('{titheRecords}', String(existingTithes))}
                    </Alert>
                  )}
                  <SimpleGrid cols={{ base: 1, sm: 3 }} w="100%">
                    <StatBox label={t.importPage.entriesImported} value={result.entries_imported} />
                    <StatBox label={t.importPage.exitsImported} value={result.exits_imported} />
                    <StatBox label={t.importPage.tithesImported} value={result.tithe_records_imported} />
                  </SimpleGrid>
                  <ImportErrorsPanel result={result} />
                  {hasBlocking && (
                    <Alert
                      icon={<IconAlertTriangle size={16} />}
                      color="red"
                      title={t.importPage.blockingErrors}
                      w="100%"
                    >
                      {t.importPage.commitBlocked}
                    </Alert>
                  )}
                </Stack>
              ) : (
                <Stack w="100%" align="center" gap="md">
                  <ThemeIcon size={64} radius="xl" color="green" variant="light">
                    <IconCheck size={34} />
                  </ThemeIcon>
                  <Title order={3}>{t.importPage.successTitle}</Title>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} w="100%">
                    <StatBox label={t.importPage.entriesImported} value={result.entries_imported} />
                    <StatBox label={t.importPage.exitsImported} value={result.exits_imported} />
                    <StatBox label={t.importPage.tithesImported} value={result.tithe_records_imported} />
                  </SimpleGrid>
                  <ImportErrorsPanel result={result} />
                </Stack>
              )
            ) : null}
          </Stack>
        </Stepper.Step>
      </Stepper>

      {error && (
        <Alert icon={<IconAlertTriangle size={16} />} color="red" mt="md">
          {error}
        </Alert>
      )}

      <Group justify="space-between" mt="lg">
        <Button
          variant="default"
          data-testid="import-back"
          onClick={() => setActive((c) => Math.max(0, c - 1))}
          disabled={active === 0 || processing}
        >
          {t.registerPage.back}
        </Button>
        {active <= 1 ? (
          <Button
            rightSection={<IconArrowRight size={16} />}
            data-testid="import-next"
            disabled={
              processing ||
              (active === 0 && (year == null || month == null)) ||
              (active === 1 && selectedCount === 0)
            }
            onClick={() =>
              active === 1
                ? setActive(matchKinds.length ? 2 : processIdx)
                : setActive((c) => c + 1)
            }
          >
            {t.registerPage.next}
          </Button>
        ) : atMatch ? (
          <Button
            rightSection={<IconArrowRight size={16} />}
            data-testid="import-next"
            disabled={processing || !matchComplete[currentKind as string]}
            onClick={() => setActive((c) => Math.min(c + 1, processIdx))}
          >
            {t.registerPage.next}
          </Button>
        ) : result && result.dry_run ? (
          <Button
            data-testid="import-commit"
            leftSection={<IconCheck size={16} />}
            loading={processing}
            disabled={!result || !result.dry_run || hasBlocking}
            onClick={() => setCommitOpen(true)}
          >
            {t.importPage.commitButton}
          </Button>
        ) : (
          <Button
            data-testid="import-validate"
            leftSection={<IconListCheck size={16} />}
            loading={processing}
            disabled={!allMatchComplete || year == null || month == null}
            onClick={handleValidate}
          >
            {t.importPage.validateButton}
          </Button>
        )}
      </Group>

      <Modal
        opened={commitOpen}
        onClose={() => setCommitOpen(false)}
        title={t.importPage.confirmTitle}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t.importPage.confirmBody}</Text>
          {hasExistingData && (
            <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
              {t.importPage.confirmOverwrite}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCommitOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              data-testid="import-commit-confirm"
              color="green"
              leftSection={<IconCheck size={16} />}
              loading={processing}
              onClick={handleCommit}
            >
              {t.importPage.commitButton}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <Paper withBorder p="md" radius="md" ta="center">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={800} size="xl">
        {value}
      </Text>
    </Paper>
  );
}

import React, { useMemo, useState } from 'react';
import {
  Card,
  Group,
  Text,
  Stack,
  Button,
  Select,
  Table,
  Alert,
  Badge,
  Divider,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDownload,
  IconAnalyze,
  IconUpload,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { accountsApi } from '../api/accounts';
import type {
  MemberImportInspection,
  MemberImportResult,
  SpreadsheetExpectedColumn,
} from '../types';

const MEMBER_TEMPLATE = `Nome;Telefone;E-mail;Data de Nascimento;CPF;Escolaridade;Estado Civil;Forma de Entrada;Situação
Maria Silva;(83) 99999-0000;maria@email.com;15/03/1990;123.456.789-00;Ensino Superior;Casada;Batismo;Ativo
João Souza;(83) 88888-0000;joao@email.com;20/07/1985;;Ensino Médio;Solteiro;Aclamação;Ativo`;

export default function MemberImportTab({ onImported }: { onImported?: () => void }) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspection, setInspection] = useState<MemberImportInspection | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<MemberImportResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const inspected = !!inspection;

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + MEMBER_TEMPLATE], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.membersPage.importTemplateFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setInspection(null);
      setMapping({});
      setResult(null);
    }
  };

  const analyze = async () => {
    if (!file) {
      notifications.show({ message: t.membersPage.importNoFile, color: 'red' });
      return;
    }
    setInspecting(true);
    try {
      const insp = await accountsApi.importMembersInspect(file);
      setInspection(insp);
      setMapping(insp.suggested || {});
      setResult(null);
    } catch (e: any) {
      const detail =
        e?.response?.data?.file ||
        e?.response?.data?.detail ||
        'Erro ao analisar a planilha.';
      notifications.show({ message: detail, color: 'red' });
    } finally {
      setInspecting(false);
    }
  };

  const runImport = async (dryRun: boolean) => {
    if (!file) return;
    setExecuting(true);
    try {
      const res = await accountsApi.importMembers(file, mapping, dryRun);
      setResult(res);
      setConfirmOpen(false);
      if (!dryRun && res.imported > 0 && !res.errors.length) {
        notifications.show({
          message: t.membersPage.importSuccess.replace('{imported}', String(res.imported)),
          color: 'green',
        });
        onImported?.();
      }
    } catch (e: any) {
      const errs = e?.response?.data?.errors;
      notifications.show({
        message: Array.isArray(errs) ? errs.join(' | ') : 'Erro ao importar.',
        color: 'red',
      });
    } finally {
      setExecuting(false);
    }
  };

  const allRequiredMapped = useMemo(() => {
    if (!inspection) return false;
    const required: SpreadsheetExpectedColumn[] = inspection.expected.filter(
      (c) => c.required
    );
    return required.every((c) => !!(mapping[c.key] && mapping[c.key].trim()));
  }, [inspection, mapping]);

  const errorsCount = result?.errors?.length ?? 0;
  const canShowEverything = inspected && allRequiredMapped;

  return (
    <>
      <Group gap="xs" mb="md" justify="flex-end">
        <Button
          variant="default"
          leftSection={<IconDownload size={16} />}
          onClick={downloadTemplate}
          data-testid="member-import-template"
        >
          {t.membersPage.importDownloadTemplate}
        </Button>
      </Group>

      <Card withBorder shadow="sm" p="lg">
        <Stack gap="md">
          <Group align="flex-end">
            <Button
              component="label"
              variant="default"
              leftSection={<IconUpload size={16} />}
              data-testid="member-import-file"
            >
              {t.membersPage.importUpload}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
                data-testid="member-import-file-input"
              />
            </Button>
            {file && (
              <Text size="sm" c="dimmed">
                {file.name} ({t.membersPage.importDropHint})
              </Text>
            )}
            <Button
              leftSection={<IconAnalyze size={16} />}
              onClick={analyze}
              loading={inspecting}
              disabled={!file}
              ml="auto"
              data-testid="member-import-analyze"
            >
              {inspecting ? t.membersPage.importAnalyzing : t.membersPage.importAnalyze}
            </Button>
          </Group>

          {inspected && (
            <>
              <Divider />
              <Alert color="blue" icon={<IconCheck size={16} />}>
                {t.membersPage.importSuggestion}
              </Alert>

              <Text fw={600}>
                {t.membersPage.importPreviewTitle} (
                <Text component="span" c="dimmed">
                  {inspection.rows.length} {t.membersPage.importRow.toLowerCase()}
                </Text>
                )
              </Text>

              <Table striped highlightOnHover miw={600}>
                <Table.Thead>
                  <Table.Tr>
                    {inspection.expected.map((col) => {
                      const mapped = mapping[col.key];
                      return (
                        <Table.Th key={col.key} style={{ minWidth: 140 }}>
                          <Group gap="xs" wrap="nowrap">
                            <span>{col.label}</span>
                            {col.required && (
                              <Badge size="xs" color="orange" variant="light">
                                {t.membersPage.importRequired}
                              </Badge>
                            )}
                          </Group>
                          <Select
                            size="xs"
                            placeholder={col.label}
                            data={inspection.headers.map((h, i) => ({
                              value: String(i),
                              label:
                                h || `Coluna ${i + 1}`,
                            }))}
                            value={
                              mapped !== undefined
                                ? String(
                                    inspection.headers.findIndex((h) => h === mapped)
                                  )
                                : null
                            }
                            onChange={(v) => {
                              const next = { ...mapping };
                              if (v === null || v === undefined) {
                                delete next[col.key];
                              } else {
                                const idx = Number(v);
                                next[col.key] =
                                  inspection.headers[idx] || '';
                              }
                              setMapping(next);
                            }}
                            clearable
                            searchable
                            data-testid={`member-import-map-${col.key}`}
                          />
                        </Table.Th>
                      );
                    })}
                    <Table.Th>{t.membersPage.importRow}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {inspection.rows.map((row, ri) => (
                    <Table.Tr key={ri}>
                      {inspection.expected.map((col) => {
                        const mapped = mapping[col.key];
                        const idx = mapped
                          ? inspection.headers.findIndex((h) => h === mapped)
                          : -1;
                        return (
                          <Table.Td key={col.key}>
                            {idx >= 0 && idx < row.length ? row[idx] : ''}
                          </Table.Td>
                        );
                      })}
                      <Table.Td>{ri + 2}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {result && (
                <Stack gap="md">
                  {errorsCount > 0 ? (
                    <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                      {t.membersPage.importErrorSummary.replace(
                        '{n}',
                        String(errorsCount)
                      )}
                      <Stack gap={2} mt="sm">
                        {result.errors.slice(0, 20).map((e, i) => (
                          <Text key={i} size="sm">
                            {e}
                          </Text>
                        ))}
                      </Stack>
                    </Alert>
                  ) : (
                    <Alert color="green" icon={<IconCheck size={16} />}>
                      {t.membersPage.importDryRunSummary.replace(
                        '{imported}',
                        String(result.imported)
                      )}
                    </Alert>
                  )}
                </Stack>
              )}

              <Divider />

              <Group justify="flex-end">
                {canShowEverything && (
                  <Button
                    variant="default"
                    onClick={() => runImport(true)}
                    loading={executing}
                    data-testid="member-import-dryrun"
                  >
                    {t.membersPage.importDryRun}
                  </Button>
                )}
                {canShowEverything && !result?.errors?.length && (
                  <Button
                    leftSection={<IconUpload size={16} />}
                    onClick={() => setConfirmOpen(true)}
                    loading={executing}
                    data-testid="member-import-commit"
                  >
                    {t.membersPage.importExecute}
                  </Button>
                )}
                {result && !result.dry_run && result.imported > 0 && (
                  <Button
                    leftSection={<IconCheck size={16} />}
                    data-testid="member-import-again"
                    onClick={() => {
                      setResult(null);
                      setInspection(null);
                      setFile(null);
                      setMapping({});
                    }}
                  >
                    {t.membersPage.importDone}
                  </Button>
                )}
              </Group>
            </>
          )}
        </Stack>
      </Card>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t.membersPage.importConfirmTitle}
        centered
      >
        <Stack gap="md">
          <Text>
            {t.membersPage.importConfirmBody.replace('{imported}', String(result?.imported ?? 0))}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>
              {t.membersPage.importCancel}
            </Button>
            <Button
              color="teal"
              loading={executing}
              onClick={() => runImport(false)}
              data-testid="member-import-confirm"
            >
              {t.membersPage.importExecute}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

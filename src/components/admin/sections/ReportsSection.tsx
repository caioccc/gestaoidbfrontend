import React, { useEffect, useState } from 'react';
import {
  Group,
  Stack,
  Select,
  Paper,
  Table,
  Skeleton,
  Text,
  Title,
  Button,
  Alert,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import {
  IconDownload,
  IconFileSpreadsheet,
  IconAlertTriangle,
  IconReport,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';
import apiClient from '../../../api/client';
import PageHeader from '../../../components/PageHeader';
import { useLanguage } from '../../../i18n';
import { RegionalReport } from '../../../types';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { saveBlob } from '../../../api/finance';
import { formatBRL, toNumber } from '../../../utils/format';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function ReportsSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t } = useLanguage();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [data, setData] = useState<RegionalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingNational, setDownloadingNational] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .regionalReport(year, month)
      .then((d) => active && setData(d))
      .catch(() => active && setData(null) && setError('Não foi possível carregar o relatório.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year, month]);

  useEffect(() => {
    if (!loading && data) {
      const hasData =
        (data.remittance?.dizimos?.total_dizimos ?? 0) > 0 ||
        data.monthly_balance?.total_entries > 0 ||
        data.monthly_balance?.total_exits > 0;
      if (!hasData) setError('Sem lançamentos neste período.');
    }
  }, [loading, data]);

  const downloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await apiClient.get(api.regionalReportPdfUrl(year, month), { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-regional-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      notifications.show({ color: 'red', title: 'Erro', message: 'Falha ao gerar o PDF.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const exportXlsx = () => {
    if (!data) return;
    const rows: unknown[][] = [];
    rows.push([`Remessa Financeira Regional - ${t.months[month - 1]} ${year}`]);
    rows.push([]);
    rows.push(['DÍZIMOS (15%)', '']);
    rows.push(['Total de Dízimos', toNumber(data.remittance.dizimos.total_dizimos)]);
    rows.push(['Região (11%)', toNumber(data.remittance.dizimos.regiao)]);
    rows.push(['Fundo Ministerial (1%)', toNumber(data.remittance.dizimos.fundo_ministerial)]);
    rows.push(['Distrito (1.5%)', toNumber(data.remittance.dizimos.distrito)]);
    rows.push(['Evangelismo (1.5%)', toNumber(data.remittance.dizimos.evangelismo)]);
    rows.push(['Total Remessa Dízimos', toNumber(data.remittance.dizimos.total_remessa_dizimos)]);
    rows.push([]);
    rows.push(['OFERTAS POR DEPARTAMENTO (10%)', '']);
    Object.values(data.remittance.ofertas_departamentos).forEach((o) => {
      rows.push([o.categoria, toNumber(o.remessa)]);
    });
    rows.push(['Total Remessa Ofertas', toNumber(data.remittance.total_remittance_offers)]);
    rows.push([]);
    rows.push(['TOTAL DA REMESSA', toNumber(data.remittance.total_remittance)]);
    rows.push([]);
    rows.push(['BALANCETE MENSAL', '']);
    rows.push(['Entradas', data.monthly_balance.total_entries]);
    rows.push(['Saídas', data.monthly_balance.total_exits]);
    rows.push(['Saldo', data.monthly_balance.balance]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remessa');
    XLSX.writeFile(wb, `remessa-${year}-${String(month).padStart(2, '0')}.xlsx`);
  };

  const downloadNational = async () => {
    setDownloadingNational(true);
    try {
      const blob = await api.nationalReportXlsx(year, month);
      saveBlob(blob, `relatorio_nacional_${String(month).padStart(2, '0')}_${year}.xlsx`);
    } catch {
      notifications.show({ color: 'red', title: 'Erro', message: 'Falha ao gerar o Relatório Nacional.' });
    } finally {
      setDownloadingNational(false);
    }
  };

  const offers = data ? Object.values(data.remittance.ofertas_departamentos ?? {}) : [];

  return (
    <>
      <PageHeader title={t.reportsPage.title} description={churchLabel}>
        <Group gap="md" wrap="wrap">
          <Select
            data-testid="reports-year"
            label={t.common.year}
            value={String(year)}
            onChange={(v) => v && setYear(Number(v))}
            data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            w={110}
          />
          <Select
            data-testid="reports-month"
            label={t.common.month}
            value={String(month)}
            onChange={(v) => v && setMonth(Number(v))}
            data={t.months.map((m, i) => ({ value: String(i + 1), label: m }))}
            w={180}
          />
        </Group>
      </PageHeader>

      {error && (
        <Alert icon={<IconAlertTriangle size={16} />} color="yellow" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Skeleton height={360} />
      ) : data ? (
        <Stack gap="lg">
          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              data-testid="reports-download-pdf"
              leftSection={<IconDownload size={16} />}
              onClick={downloadPdf}
              loading={downloadingPdf}
            >
              {t.reportsPage.downloadPdf}
            </Button>
            <Button
              variant="light"
              color="teal"
              data-testid="reports-download-xlsx"
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={exportXlsx}
            >
              {t.reportsPage.downloadXlsx}
            </Button>
            <Button
              variant="light"
              color="grape"
              data-testid="reports-download-national"
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={downloadNational}
              loading={downloadingNational}
            >
              {t.reportsPage.downloadNational}
            </Button>
          </Group>

          <Paper withBorder radius="md" p="md">
            <Group mb="md">
              <ThemeIcon color="blue" variant="light" size="lg">
                <IconReport size={20} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={4}>{t.reportsPage.remittance}</Title>
                <Text size="xs" c="dimmed">
                  {t.months[month - 1]} / {year}
                </Text>
              </Stack>
            </Group>
            <Table striped withTableBorder>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={700} colSpan={2}>
                    {t.reportsPage.tithes15}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td pl={40}>{t.common.total}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.remittance.dizimos.total_dizimos)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td pl={40}>{t.reportsPage.region}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.remittance.dizimos.regiao)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td pl={40}>{t.reportsPage.fund}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.remittance.dizimos.fundo_ministerial)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td pl={40}>{t.reportsPage.district}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.remittance.dizimos.distrito)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td pl={40}>{t.reportsPage.evangelism}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.remittance.dizimos.evangelismo)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td pl={40} fw={600}>
                    {t.reportsPage.totalRemittance}
                  </Table.Td>
                  <Table.Td ta="right" fw={600}>
                    {formatBRL(data.remittance.dizimos.total_remessa_dizimos)}
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700} colSpan={2}>
                    {t.reportsPage.offers10}
                  </Table.Td>
                </Table.Tr>
                {offers.map((o) => (
                  <Table.Tr key={o.categoria}>
                    <Table.Td pl={40}>{o.categoria}</Table.Td>
                    <Table.Td ta="right">{formatBRL(o.remessa)}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr>
                  <Table.Td pl={40} fw={600}>
                    {t.reportsPage.totalRemittance}
                  </Table.Td>
                  <Table.Td ta="right" fw={600}>
                    {formatBRL(data.remittance.total_remittance_offers)}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
              <Table.Tfoot>
                <Table.Tr
                  style={{
                    borderTop: '2px solid var(--mantine-color-default-border)',
                    backgroundColor: 'var(--mantine-color-default-hover)',
                  }}
                >
                  <Table.Td fw={800}>{t.reportsPage.totalRemittance}</Table.Td>
                  <Table.Td ta="right" fw={800}>
                    {formatBRL(data.remittance.total_remittance)}
                  </Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Paper>

          <Divider />

          <Paper withBorder radius="md" p="md">
            <Title order={4} mb="md">
              {t.reportsPage.trialBalance}
            </Title>
            <Table striped withTableBorder>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>{t.reportsPage.entries}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.monthly_balance.total_entries)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t.reportsPage.exits}</Table.Td>
                  <Table.Td ta="right">{formatBRL(data.monthly_balance.total_exits)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={700}>{t.reportsPage.balance}</Table.Td>
                  <Table.Td ta="right" fw={700}>
                    {formatBRL(data.monthly_balance.balance)}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      ) : null}
    </>
  );
}

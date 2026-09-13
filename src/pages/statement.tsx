import React, { useEffect, useMemo, useState } from 'react';
import {
  Group,
  Stack,
  Paper,
  Table,
  Skeleton,
  Text,
  Button,
  Badge,
  ScrollArea,
  Box,
  ThemeIcon,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconFileSpreadsheet,
  IconAlertTriangle,
  IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import PageHeader from '../components/PageHeader';
import MobileItemCard from '../components/MobileItemCard';
import { useLanguage } from '../i18n';
import { financeApi, fetchAllPages } from '../api/finance';
import { FinancialEntry, FinancialExit } from '../types';
import { formatBRL, formatDate, toNumber } from '../utils/format';

interface ExtractRow {
  id: string;
  date: string;
  type: 'entry' | 'exit';
  description: string;
  category: string;
  amount: number;
}

export default function StatementPage() {
  const { t, locale } = useLanguage();
  const [range, setRange] = useState<[string | null, string | null]>([
    `${new Date().getFullYear()}-01-01`,
    `${new Date().getFullYear()}-12-31`,
  ]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ExtractRow[]>([]);

  const load = () => {
    setLoading(true);
    const start = range[0] || undefined;
    const end = range[1] || undefined;
    Promise.all([
      fetchAllPages((page) =>
        financeApi.listEntries({
          page,
          start_date: start ?? `2000-01-01`,
          end_date: end ?? `2100-12-31`,
        })
      ).then((r) =>
        r.map((e: FinancialEntry) => ({
          id: `e${e.id}`,
          date: e.date,
          type: 'entry' as const,
          description: e.service_description,
          category: e.category_display || e.category,
          amount: toNumber(e.amount),
        }))
      ),
      fetchAllPages((page) =>
        financeApi.listExits({
          page,
          start_date: start ?? `2000-01-01`,
          end_date: end ?? `2100-12-31`,
        })
      ).then((r) =>
        r.map((e: FinancialExit) => ({
          id: `x${e.id}`,
          date: e.date,
          type: 'exit' as const,
          description: e.description,
          category: e.category_display || e.category,
          amount: toNumber(e.amount),
        }))
      ),
    ])
      .then(([entries, exits]) => {
        const merged = [...entries, ...exits].sort((a, b) =>
          a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        );
        setRows(merged);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    rows.forEach((r) => (r.type === 'entry' ? (totalIn += r.amount) : (totalOut += r.amount)));
    return { totalIn, totalOut, balance: totalIn - totalOut };
  }, [rows]);

  const exportXlsx = () => {
    const data = rows.map((r) => ({
      Data: r.date,
      Tipo: r.type === 'entry' ? t.entriesPage.title : t.exitsPage.title,
      Descrição: r.description,
      Categoria: r.category,
      Valor: r.type === 'entry' ? r.amount : -r.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
    XLSX.writeFile(wb, 'extrato-consolidado.xlsx');
  };

  return (
    <>
      <PageHeader title={t.statementPage.title}>
        <Group gap="md" wrap="wrap" align="flex-end">
          <Box style={{ maxWidth: 320 }}>
            <DatePickerInput
              data-testid="statement-range"
              type="range"
              label={t.entriesPage.range}
              value={range}
              onChange={setRange}
              clearable
              locale={locale}
            />
          </Box>
          <Button variant="default" data-testid="statement-filter" onClick={load}>
            {t.common.filter}
          </Button>
          <Button
            variant="light"
            color="teal"
            data-testid="statement-export"
            leftSection={<IconFileSpreadsheet size={16} />}
            onClick={exportXlsx}
          >
            {t.statementPage.export}
          </Button>
        </Group>
      </PageHeader>

      <Group gap="lg" mb="md">
        <Text size="sm" c="dimmed">
          {t.dashboard.totalEntries}: <Text component="span" fw={700} c="green">{formatBRL(totals.totalIn)}</Text>
        </Text>
        <Text size="sm" c="dimmed">
          {t.dashboard.totalExits}: <Text component="span" fw={700} c="red">{formatBRL(totals.totalOut)}</Text>
        </Text>
        <Text size="sm" c="dimmed">
          {t.reportsPage.balance}: <Text component="span" fw={700}>{formatBRL(totals.balance)}</Text>
        </Text>
      </Group>

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Skeleton height={300} />
        ) : rows.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <IconAlertTriangle size={28} />
            <Text c="dimmed">{t.common.noData}</Text>
          </Stack>
        ) : (
          <>
            <ScrollArea>
              <Box visibleFrom="sm">
                <Table striped withTableBorder highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.common.date}</Table.Th>
                    <Table.Th>{t.common.type || 'Tipo'}</Table.Th>
                    <Table.Th>{t.common.description}</Table.Th>
                    <Table.Th>{t.common.category}</Table.Th>
                    <Table.Th ta="right">{t.common.value}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td>{formatDate(r.date)}</Table.Td>
                      <Table.Td>
                        <Badge color={r.type === 'entry' ? 'green' : 'red'} variant="light" size="sm">
                          {r.type === 'entry' ? t.entries : t.exits}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{r.description}</Table.Td>
                      <Table.Td>{r.category}</Table.Td>
                      <Table.Td ta="right" c={r.type === 'entry' ? 'green' : 'red'} fw={600}>
                        {r.type === 'entry' ? '' : '-'}
                        {formatBRL(r.amount)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </ScrollArea>
          <Stack hiddenFrom="sm" gap="xs" p="sm">
            {rows.map((r) => (
              <MobileItemCard
                key={r.id}
                testId={`statement-mobile-${r.id}`}
                media={
                  <ThemeIcon
                    color={r.type === 'entry' ? 'green' : 'red'}
                    variant="light"
                    radius="md"
                    size="lg"
                  >
                    {r.type === 'entry' ? (
                      <IconArrowUpRight size={20} />
                    ) : (
                      <IconArrowDownRight size={20} />
                    )}
                  </ThemeIcon>
                }
              >
                <Stack gap={4}>
                  <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                    <Text fw={600} truncate>
                      {formatDate(r.date)}
                    </Text>
                    <Badge color={r.type === 'entry' ? 'green' : 'red'} variant="light" size="sm">
                      {r.type === 'entry' ? t.entries : t.exits}
                    </Badge>
                  </Group>
                  <Text size="sm" truncate>
                    {r.description}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {r.category}
                  </Text>
                  <Text fw={700} c={r.type === 'entry' ? 'green' : 'red'}>
                    {r.type === 'entry' ? '+' : '-'}
                    {formatBRL(r.amount)}
                  </Text>
                </Stack>
              </MobileItemCard>
            ))}
          </Stack>
          </>
        )}
      </Paper>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Group,
  Stack,
  Select,
  Paper,
  Table,
  Skeleton,
  Text,
  SimpleGrid,
  Card,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowUpCircle,
  IconArrowDownCircle,
  IconScale,
} from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../i18n';
import { financeApi } from '../api/finance';
import { formatBRL, toNumber } from '../utils/format';
import { DreSummary } from '../types';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function DrePage() {
  const { t } = useLanguage();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DreSummary | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    financeApi
      .dreSummary(year)
      .then((data) => active && setSummary(data))
      .catch(() => active && setSummary(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year]);

  const totalRevenue = summary ? toNumber(summary.total_revenue) : 0;
  const totalExpenses = summary ? toNumber(summary.total_expenses) : 0;
  const netResult = summary ? toNumber(summary.net_result) : 0;

  return (
    <>
      <PageHeader title={t.drePage.title}>
        <Select
          data-testid="dre-year"
          label={t.common.year}
          value={String(year)}
          onChange={(v) => v && setYear(Number(v))}
          data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
          w={110}
        />
      </PageHeader>

      {loading ? (
        <Skeleton height={140} mb="md" />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
          <Card withBorder shadow="sm" padding="lg">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t.drePage.grossRevenue}
                </Text>
                <Text fw={800} size="xl" c="green">
                  {formatBRL(totalRevenue)}
                </Text>
              </Stack>
              <ThemeIcon color="green" variant="light" size="lg">
                <IconArrowUpCircle size={22} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card withBorder shadow="sm" padding="lg">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t.drePage.totalExpenses}
                </Text>
                <Text fw={800} size="xl" c="red">
                  {formatBRL(totalExpenses)}
                </Text>
              </Stack>
              <ThemeIcon color="red" variant="light" size="lg">
                <IconArrowDownCircle size={22} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card withBorder shadow="sm" padding="lg">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text size="sm" c="dimmed">
                  {t.drePage.netResult}
                </Text>
                <Text fw={800} size="xl" c={netResult >= 0 ? 'blue' : 'red'}>
                  {formatBRL(netResult)}
                </Text>
              </Stack>
              <ThemeIcon color="blue" variant="light" size="lg">
                <IconScale size={22} />
              </ThemeIcon>
            </Group>
          </Card>
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="md">
            {t.dashboard.entriesByDepartment}
          </Title>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.common.category}</Table.Th>
                <Table.Th ta="right">{t.common.value}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(summary?.revenue_by_category ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={2} ta="center" c="dimmed">
                    {t.common.noData}
                  </Table.Td>
                </Table.Tr>
              ) : (
                (summary?.revenue_by_category ?? []).map((r) => (
                  <Table.Tr key={r.category}>
                    <Table.Td>{r.label}</Table.Td>
                    <Table.Td ta="right">{formatBRL(toNumber(r.value))}</Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
            <Table.Tfoot>
              <Table.Tr
                style={{
                  borderTop: '2px solid var(--mantine-color-default-border)',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                }}
              >
                <Table.Td fw={700}>{t.common.total}</Table.Td>
                <Table.Td ta="right" fw={700}>
                  {formatBRL(totalRevenue)}
                </Table.Td>
              </Table.Tr>
            </Table.Tfoot>
          </Table>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="md">
            {t.drePage.expensesByNature}
          </Title>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t.common.category}</Table.Th>
                <Table.Th ta="right">{t.common.value}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(summary?.expenses_by_nature ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={2} ta="center" c="dimmed">
                    {t.common.noData}
                  </Table.Td>
                </Table.Tr>
              ) : (
                (summary?.expenses_by_nature ?? []).map((r) => (
                  <Table.Tr key={r.nature}>
                    <Table.Td>{r.label}</Table.Td>
                    <Table.Td ta="right">{formatBRL(toNumber(r.value))}</Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
            <Table.Tfoot>
              <Table.Tr
                style={{
                  borderTop: '2px solid var(--mantine-color-default-border)',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                }}
              >
                <Table.Td fw={700}>{t.common.total}</Table.Td>
                <Table.Td ta="right" fw={700}>
                  {formatBRL(totalExpenses)}
                </Table.Td>
              </Table.Tr>
            </Table.Tfoot>
          </Table>
        </Paper>
      </SimpleGrid>
    </>
  );
}

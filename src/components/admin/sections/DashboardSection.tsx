import React, { useEffect, useMemo, useState } from 'react';
import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Stack,
  Select,
  Title,
  ThemeIcon,
  Paper,
  Skeleton,
  Loader,
  Center,
  Badge,
} from '@mantine/core';
import { BarChart, DonutChart } from '@mantine/charts';
import {
  IconArrowUpCircle,
  IconArrowDownCircle,
  IconScale,
} from '@tabler/icons-react';
import PageHeader from '../../../components/PageHeader';
import { useLanguage } from '../../../i18n';
import { DashboardSummary } from '../../../types';
import { fetchAllPages } from '../../../api/finance';
import { AdminFinanceApi } from '../../../api/adminFinance';
import { formatBRL, toNumber } from '../../../utils/format';

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027];

export default function DashboardSection({ api, churchLabel }: { api: AdminFinanceApi; churchLabel: string }) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptData, setDeptData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .dashboardSummary(year)
      .then((data) => active && setSummary(data))
      .catch(() => active && setSummary(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year]);

  useEffect(() => {
    let active = true;
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    fetchAllPages((page) =>
      api.listEntries({ page, start_date: start, end_date: end })
    )
      .then((rows) => {
        if (!active) return;
        const byCat = new Map<string, number>();
        rows.forEach((r) => {
          const label = r.category_display || r.category || 'Outros';
          byCat.set(label, (byCat.get(label) ?? 0) + toNumber(r.amount));
        });
        const colors = [
          'blue', 'teal', 'orange', 'grape', 'indigo', 'pink',
          'cyan', 'lime', 'yellow', 'red', 'violet',
        ];
        const total = Array.from(byCat.values()).reduce((a, b) => a + b, 0) || 1;
        const data = Array.from(byCat.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([label, value], i) => ({
            name: label,
            value: +(value / total * 100).toFixed(1),
            color: colors[i % colors.length],
          }));
        setDeptData(data);
      })
      .catch(() => active && setDeptData([]));
    return () => {
      active = false;
    };
  }, [year]);

  const barData = useMemo(
    () =>
      (summary?.series ?? []).map((s) => ({
        month: t.months[s.month - 1]?.slice(0, 3) ?? `M${s.month}`,
        Entradas: s.entries,
        Saídas: s.exits,
      })),
    [summary, t.months]
  );

  const statCards = [
    {
      label: t.dashboard.totalEntries,
      value: summary?.total_entries ?? 0,
      color: 'green',
      icon: <IconArrowUpCircle size={22} />,
    },
    {
      label: t.dashboard.totalExits,
      value: summary?.total_exits ?? 0,
      color: 'red',
      icon: <IconArrowDownCircle size={22} />,
    },
    {
      label: t.dashboard.netBalance,
      value: summary?.balance ?? 0,
      color: 'blue',
      icon: <IconScale size={22} />,
    },
  ];

  return (
    <>
      <PageHeader title={t.dashboard.title} description={churchLabel}>
        <Select
          data-testid="dashboard-year"
          label={t.dashboard.yearLabel}
          value={String(year)}
          onChange={(v) => v && setYear(Number(v))}
          data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
          w={130}
        />
      </PageHeader>

      {loading ? (
        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
          {statCards.map((card) => (
            <Card key={card.label} withBorder shadow="sm" padding="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    {card.label}
                  </Text>
                  <Text fw={800} size="xl" c={card.color}>
                    {formatBRL(card.value)}
                  </Text>
                </Stack>
                <ThemeIcon color={card.color} variant="light" size="lg">
                  {card.icon}
                </ThemeIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper withBorder p="md" radius="md">
          <Title order={4} mb="md">
            {t.dashboard.entriesVsExits}
          </Title>
          {loading ? (
            <Center h={280}>
              <Loader />
            </Center>
          ) : (
            <BarChart
              h={280}
              data={barData}
              dataKey="month"
              series={[
                { name: 'Entradas', color: 'green.6' },
                { name: 'Saídas', color: 'red.6' },
              ]}
              withLegend
              tickLine="y"
            />
          )}
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Title order={4} mb="md">
            {t.dashboard.entriesByDepartment}
          </Title>
          {deptData.length === 0 ? (
            <Center h={280}>
              <Text c="dimmed">{t.common.noData}</Text>
            </Center>
          ) : (
            <Stack gap="md" align="center">
              <DonutChart
                h={220}
                data={deptData}
                withLabels
                labelsType="percent"
                paddingAngle={2}
                thickness={30}
              />
              <Group gap="xs" wrap="wrap" justify="center">
                {deptData.map((d) => (
                  <Badge key={d.name} color={d.color} variant="light" size="sm">
                    {d.name} · {d.value}%
                  </Badge>
                ))}
              </Group>
            </Stack>
          )}
        </Paper>
      </SimpleGrid>
    </>
  );
}

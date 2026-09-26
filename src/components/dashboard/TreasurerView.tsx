import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { AreaChart } from '@mantine/charts';
import {
  IconArrowDownCircle,
  IconArrowUpCircle,
  IconCash,
  IconFileText,
  IconLockCheck,
  IconReceipt,
  IconReportMoney,
  IconScale,
  IconUpload,
} from '@tabler/icons-react';
import { financeApi, fetchAllPages } from '../../api/finance';
import { useLanguage } from '../../i18n';
import { formatBRL, toNumber } from '../../utils/format';
import type {
  DashboardSummary,
  FinancialEntry,
  FinancialExit,
  MonthlyClosingsResponse,
  MonthlyValidationResponse,
  Reconciliation,
  Tither,
} from '../../types';
import {
  DashboardTone,
  EmptyState,
  FeedRow,
  KpiCard,
  QuickAction,
  QuickActionsGroup,
  SectionCard,
  SkeletonCards,
} from './primitives';

type CompetenceState = 'OPEN' | 'VALIDATING' | 'CLOSED' | 'REJECTED';

const COMPETENCE_TONE: Record<CompetenceState, DashboardTone> = {
  OPEN: 'blue',
  VALIDATING: 'orange',
  CLOSED: 'teal',
  REJECTED: 'red',
};

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function TreasurerView({ year }: { year: number }) {
  const { t } = useLanguage();
  const router = useRouter();
  const dv = t.dashboardViews;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [closings, setClosings] = useState<MonthlyClosingsResponse | null>(null);
  const [validation, setValidation] = useState<MonthlyValidationResponse | null>(null);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [exits, setExits] = useState<FinancialExit[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [tithers, setTithers] = useState<Tither[]>([]);

  const currentMonth = new Date().getMonth() + 1;
  const monthKey = `${year}-${String(currentMonth).padStart(2, '0')}`;
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(new Date(year, currentMonth, 0).getDate()).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([
      financeApi.dashboardSummary(year),
      financeApi.monthlyClosings(year),
      financeApi.validation(year, currentMonth),
      financeApi.reconciliation(year, currentMonth),
      financeApi.listTithers(),
      fetchAllPages((page) =>
        financeApi.listEntries({ page, start_date: monthStart, end_date: monthEnd })
      ),
      fetchAllPages((page) =>
        financeApi.listExits({ page, start_date: monthStart, end_date: monthEnd })
      ),
    ])
      .then((results) => {
        if (!active) return;
        const [sum, clo, val, rec, tit, ent, ext] = results;
        if (sum.status === 'fulfilled') setSummary(sum.value);
        if (clo.status === 'fulfilled') setClosings(clo.value);
        if (val.status === 'fulfilled') setValidation(val.value);
        if (rec.status === 'fulfilled') setReconciliation(rec.value);
        if (tit.status === 'fulfilled') setTithers(tit.value);
        if (ent.status === 'fulfilled') setEntries(ent.value);
        if (ext.status === 'fulfilled') setExits(ext.value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, currentMonth, monthStart, monthEnd]);

  const monthPoint = useMemo(
    () => summary?.series.find((point) => point.month === currentMonth) ?? null,
    [summary, currentMonth],
  );
  const previousPoint = useMemo(
    () => summary?.series.find((point) => point.month === currentMonth - 1) ?? null,
    [summary, currentMonth],
  );

  const monthEntries = monthPoint?.entries ?? 0;
  const monthExits = monthPoint?.exits ?? 0;
  const monthBalance = monthPoint?.monthly_balance ?? 0;
  const previousBalance = previousPoint?.monthly_balance ?? 0;

  const balanceTrend = useMemo(() => {
    if (!previousBalance) return null;
    return ((monthBalance - previousBalance) / Math.abs(previousBalance)) * 100;
  }, [monthBalance, previousBalance]);

  const competence = useMemo<CompetenceState>(() => {
    const monthClosing = closings?.months.find((item) => item.month === currentMonth);
    if (monthClosing?.is_closed) return 'CLOSED';
    const status = validation?.validation?.status;
    if (status === 'REJECTED') return 'REJECTED';
    if (status === 'TREASURY_APPROVED' || status === 'LEADERSHIP_APPROVED') return 'VALIDATING';
    return 'OPEN';
  }, [closings, validation, currentMonth]);

  const pendingExits = useMemo(() => exits.filter((exit) => !exit.receipt), [exits]);
  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [entries],
  );
  const recentPendingExits = useMemo(
    () => [...pendingExits].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [pendingExits],
  );

  const cashFlowData = useMemo(
    () =>
      (summary?.series ?? []).map((point) => ({
        month: t.months[point.month - 1]?.slice(0, 3) ?? `M${point.month}`,
        [dv.chartEntries]: point.entries,
        [dv.chartExits]: point.exits,
      })),
    [summary, t.months, dv.chartEntries, dv.chartExits],
  );

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: 'new-entry',
        label: dv.tkQuickNewEntry,
        icon: <IconArrowUpCircle size={16} />,
        color: 'teal',
        onClick: () => void router.push('/entries'),
      },
      {
        key: 'new-exit',
        label: dv.tkQuickNewExit,
        icon: <IconArrowDownCircle size={16} />,
        color: 'red',
        onClick: () => void router.push('/exits'),
      },
      {
        key: 'receipt',
        label: dv.tkQuickReceipt,
        icon: <IconReceipt size={16} />,
        color: 'blue',
        onClick: () => void router.push('/receipts'),
      },
      {
        key: 'dre',
        label: dv.tkQuickDre,
        icon: <IconReportMoney size={16} />,
        color: 'grape',
        onClick: () => void router.push('/dre'),
      },
    ],
    [dv, router],
  );

  const competenceLabel =
    competence === 'CLOSED'
      ? dv.tkStateClosed
      : competence === 'VALIDATING'
        ? dv.tkStateValidating
        : competence === 'REJECTED'
          ? dv.tkStateRejected
          : dv.tkStateOpen;

  return (
    <Stack gap="lg">
      <QuickActionsGroup actions={quickActions} />

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg">
          <KpiCard
            label={dv.tkCashBalance}
            value={formatBRL(monthBalance)}
            icon={<IconScale size={24} />}
            color={monthBalance >= 0 ? 'teal' : 'red'}
            trend={balanceTrend}
            hint={dv.tkVsPreviousMonth}
          />
          <KpiCard
            label={dv.tkMonthEntries}
            value={formatBRL(monthEntries)}
            icon={<IconCash size={24} />}
            color="emerald"
            hint={`${tithers.length} ${dv.tkContributors}`}
          />
          <KpiCard
            label={dv.tkMonthExits}
            value={formatBRL(monthExits)}
            icon={<IconArrowDownCircle size={24} />}
            color="rose"
            hint={`${pendingExits.length} ${dv.tkWithoutProof}`}
          />
          <Paper withBorder radius="md" p="lg" shadow="sm" style={{ height: '100%' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} lineClamp={1}>
                  {dv.tkCompetence}
                </Text>
                <Badge
                  color={COMPETENCE_TONE[competence]}
                  variant="light"
                  size="lg"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {competenceLabel}
                </Badge>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {reconciliation
                    ? (reconciliation.is_reconciled ?? reconciliation.status === 'CONCILIADO')
                      ? dv.tkReconciled
                      : `${dv.tkDivergent} ${formatBRL(reconciliation.difference)}`
                    : dv.tkNoReconciliation}
                </Text>
              </Stack>
              <ThemeIcon color={COMPETENCE_TONE[competence]} variant="light" size={44} radius="md">
                <IconLockCheck size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      <SectionCard
        title={dv.tkCashFlow}
        description={dv.tkCashFlowHint}
        icon={<IconReportMoney size={18} />}
        color="blue"
        loading={loading}
        skeletonHeight={300}
      >
        {cashFlowData.length === 0 ? (
          <EmptyState label={t.common.noData} />
        ) : (
          <AreaChart
            h={300}
            data={cashFlowData}
            dataKey="month"
            series={[
              { name: dv.chartEntries, color: 'teal.6' },
              { name: dv.chartExits, color: 'red.6' },
            ]}
            curveType="natural"
            withLegend
            tickLine="y"
            valueFormatter={(value) => formatBRL(Number(value))}
          />
        )}
      </SectionCard>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard
          title={dv.tkPendingExits}
          description={dv.tkPendingExitsHint}
          icon={<IconUpload size={18} />}
          color="red"
          loading={loading}
          skeletonHeight={220}
          minHeight={340}
          action={
            <Button variant="subtle" size="compact-xs" onClick={() => void router.push('/exits')}>
              {dv.viewAll}
            </Button>
          }
        >
          {recentPendingExits.length === 0 ? (
            <EmptyState label={dv.tkNoPendingExits} />
          ) : (
            <Stack gap={2}>
              {recentPendingExits.map((exit) => (
                <FeedRow
                  key={exit.id}
                  icon={<IconFileText size={16} />}
                  color="red"
                  title={exit.description || exit.category_display}
                  description={`${formatShortDate(exit.date)} · ${exit.category_display}`}
                  trailing={
                    <Text size="sm" fw={700} c="red.7" style={{ whiteSpace: 'nowrap' }}>
                      {formatBRL(toNumber(exit.amount))}
                    </Text>
                  }
                  onClick={() => void router.push('/exits')}
                />
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title={dv.tkRecentTithes}
          description={dv.tkRecentTithesHint}
          icon={<IconReceipt size={18} />}
          color="teal"
          loading={loading}
          skeletonHeight={220}
          minHeight={340}
          action={
            <Button variant="subtle" size="compact-xs" onClick={() => void router.push('/entries')}>
              {dv.viewAll}
            </Button>
          }
        >
          {recentEntries.length === 0 ? (
            <EmptyState label={dv.tkNoRecentTithes} />
          ) : (
            <Stack gap={2}>
              {recentEntries.map((entry) => (
                <FeedRow
                  key={entry.id}
                  icon={<IconCash size={16} />}
                  color="teal"
                  title={entry.service_description || entry.category_display}
                  description={`${formatShortDate(entry.date)} · ${entry.category_display}`}
                  trailing={
                    <Text size="sm" fw={700} c="teal.7" style={{ whiteSpace: 'nowrap' }}>
                      {formatBRL(toNumber(entry.amount))}
                    </Text>
                  }
                  onClick={() => void router.push('/entries')}
                />
              ))}
            </Stack>
          )}
        </SectionCard>
      </SimpleGrid>
    </Stack>
  );
}

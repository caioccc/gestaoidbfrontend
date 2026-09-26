import React from 'react';
import { Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconArrowUpCircle, IconArrowDownCircle, IconScale } from '@tabler/icons-react';
import { useLanguage } from '../../i18n';
import { formatBRL } from '../../utils/format';
import { KpiCard, SectionCard } from './primitives';

export default function MonthFinanceCard({
  entries,
  exits,
  balance,
  loading,
  onClickEntries,
  onClickExits,
  onClickBalance,
}: {
  entries: number;
  exits: number;
  balance: number;
  loading?: boolean;
  onClickEntries?: () => void;
  onClickExits?: () => void;
  onClickBalance?: () => void;
}) {
  const { t } = useLanguage();
  const dv = t.dashboardViews;

  return (
    <SectionCard
      title={dv.psFinanceSummary}
      icon={<IconScale size={18} />}
      color="teal"
      loading={loading}
      skeletonHeight={150}
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <KpiCard
            label={dv.chartEntries}
            value={formatBRL(entries)}
            icon={<IconArrowUpCircle size={22} />}
            color="teal"
            loading={loading}
            onClick={onClickEntries}
          />
          <KpiCard
            label={dv.chartExits}
            value={formatBRL(exits)}
            icon={<IconArrowDownCircle size={22} />}
            color="red"
            loading={loading}
            onClick={onClickExits}
          />
          <KpiCard
            label={dv.psBalance}
            value={formatBRL(balance)}
            icon={<IconScale size={22} />}
            color={balance >= 0 ? 'teal' : 'red'}
            loading={loading}
            onClick={onClickBalance}
          />
        </SimpleGrid>
        <Group justify="flex-end">
          <Text size="xs" c="dimmed">
            {dv.psMonthCompetence}
          </Text>
        </Group>
      </Stack>
    </SectionCard>
  );
}

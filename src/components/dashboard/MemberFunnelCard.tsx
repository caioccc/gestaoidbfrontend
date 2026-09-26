import React, { useMemo } from 'react';
import { BarChart } from '@mantine/charts';
import { Button } from '@mantine/core';
import { useRouter } from 'next/router';
import { IconTargetArrow } from '@tabler/icons-react';
import { useLanguage } from '../../i18n';
import type { LifecycleStage, Member } from '../../types';
import { FUNNEL_STAGES } from '../../utils/whatsapp';
import { EmptyState, SectionCard } from './primitives';

const FUNNEL_LABEL_KEY = {
  VISITOR: 'visitor',
  INTEGRATION: 'integration',
  ACTIVE: 'active',
  ABSENT_CARE: 'absentCare',
  TRANSITION: 'transition',
} as const;

export default function MemberFunnelCard({
  members,
  loading,
}: {
  members: Member[];
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const dv = t.dashboardViews;

  const data = useMemo(
    () =>
      FUNNEL_STAGES.map((stage: LifecycleStage) => ({
        stage: t.funnel[FUNNEL_LABEL_KEY[stage]],
        total: members.filter((member) => (member.lifecycle_stage ?? 'ACTIVE') === stage).length,
      })),
    [members, t.funnel],
  );

  const empty = data.every((item) => item.total === 0);

  return (
    <SectionCard
      title={dv.psFunnel}
      description={dv.psFunnelHint}
      icon={<IconTargetArrow size={18} />}
      color="blue"
      loading={loading}
      skeletonHeight={220}
      action={
        <Button
          variant="subtle"
          size="compact-xs"
          onClick={() => void router.push('/visitors')}
        >
          {dv.viewAll}
        </Button>
      }
    >
      {empty ? (
        <EmptyState label={t.common.noData} />
      ) : (
        <BarChart
          h={220}
          data={data}
          dataKey="stage"
          series={[{ name: dv.psMembers, color: 'indigo.6' }]}
          withLegend={false}
          tickLine="y"
        />
      )}
    </SectionCard>
  );
}

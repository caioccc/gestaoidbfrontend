import React, { useMemo } from 'react';
import { Button, Group, Progress, Stack, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { IconTargetArrow } from '@tabler/icons-react';
import { useLanguage } from '../../i18n';
import type { LifecycleStage, Member } from '../../types';
import { EmptyState, SectionCard } from './primitives';

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
    () => {
      const totals = new Map<LifecycleStage, number>();
      members.forEach((member) => {
        const stage = member.lifecycle_stage ?? 'ACTIVE';
        totals.set(stage, (totals.get(stage) ?? 0) + 1);
      });

      return [
        {
          key: 'visitors',
          label: t.funnel.visitor,
          total: (totals.get('VISITOR') ?? 0) + (totals.get('INTEGRATION') ?? 0),
          color: 'violet',
        },
        {
          key: 'active',
          label: t.funnel.active,
          total: totals.get('ACTIVE') ?? 0,
          color: 'teal',
        },
        {
          key: 'transition',
          label: t.funnel.transition,
          total: (totals.get('TRANSITION') ?? 0) + (totals.get('ABSENT_CARE') ?? 0),
          color: 'orange',
        },
      ];
    },
    [members, t.funnel],
  );

  const totalMembers = data.reduce((sum, item) => sum + item.total, 0);

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
      {totalMembers === 0 ? (
        <EmptyState label={t.common.noData} />
      ) : (
        <Stack gap="md" mih={180} justify="center">
          {data.map((item) => (
            <Stack key={item.key} gap={4}>
              <Group justify="space-between" gap="xs">
                <Text size="sm" fw={600}>
                  {item.label}
                </Text>
                <Text size="sm" fw={700} c={item.color}>
                  {item.total}
                </Text>
              </Group>
              <Progress
                value={(item.total / totalMembers) * 100}
                color={item.color}
                size="lg"
                aria-label={`${item.label}: ${item.total}`}
              />
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

import React from 'react';
import { Badge, Tooltip } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconLoader,
  IconMusic,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import type { ChordStatus } from '../types';

const STATUS_META: Record<
  ChordStatus,
  { color: string; labelKey: 'chordPendingBadge' | 'chordProcessing' | 'chordCompletedBadge' | 'chordFailedBadge' | 'chordManualBadge'; Icon: typeof IconClock }
> = {
  PENDING: { color: 'blue', labelKey: 'chordPendingBadge', Icon: IconClock },
  PROCESSING: { color: 'cyan', labelKey: 'chordProcessing', Icon: IconLoader },
  COMPLETED: { color: 'green', labelKey: 'chordCompletedBadge', Icon: IconCheck },
  FAILED: { color: 'red', labelKey: 'chordFailedBadge', Icon: IconAlertTriangle },
  MANUAL: { color: 'gray', labelKey: 'chordManualBadge', Icon: IconMusic },
};

export function isChordReady(status?: ChordStatus | null): boolean {
  return status === 'COMPLETED' || status === 'MANUAL';
}

export default function SongChordStatusBadge({
  status,
  detail,
  size,
}: {
  status?: ChordStatus | null;
  detail?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const { t } = useLanguage();
  if (!status || !STATUS_META[status]) return null;
  const { color, labelKey, Icon } = STATUS_META[status];
  const label = t.music[labelKey];
  const tooltip = detail ? `${label}: ${detail}` : label;
  return (
    <Tooltip label={tooltip} withArrow>
      <Badge variant="light" color={color} size={size}>
        <Icon size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
        {label}
      </Badge>
    </Tooltip>
  );
}
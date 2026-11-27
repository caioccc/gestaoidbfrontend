import React from 'react';
import { Badge, Group, Tooltip } from '@mantine/core';
import {
  IconCheck,
  IconClock,
  IconDeviceMobile,
  IconId,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';

interface MemberCardDeliveryBadgesProps {
  physicalReceived: boolean;
  digitalReceived: boolean;
  size?: 'xs' | 'sm';
  testIdPrefix?: string;
}

export default function MemberCardDeliveryBadges({
  physicalReceived,
  digitalReceived,
  size = 'xs',
  testIdPrefix,
}: MemberCardDeliveryBadgesProps) {
  const { t } = useLanguage();
  const items = [
    {
      key: 'physical',
      label: t.membersPage.cardPhysicalShort,
      received: physicalReceived,
    },
    {
      key: 'digital',
      label: t.membersPage.cardDigitalShort,
      received: digitalReceived,
    },
  ];

  return (
    <Group gap={6} wrap="nowrap">
      {items.map((item) => {
        const status = item.received
          ? t.membersPage.cardReceived
          : t.membersPage.cardPending;
        return (
          <Tooltip
            key={item.key}
            label={`${item.label}: ${status}`}
            withArrow
            openDelay={300}
          >
            <Badge
              radius="sm"
              size={size}
              color={item.received ? 'teal' : 'gray'}
              variant={item.received ? 'light' : 'outline'}
              leftSection={
                item.key === 'physical' ? (
                  <IconId size={12} />
                ) : (
                  <IconDeviceMobile size={12} />
                )
              }
              rightSection={
                item.received ? <IconCheck size={12} /> : <IconClock size={12} />
              }
              aria-label={`${item.label}: ${status}`}
              style={{ flexShrink: 0, textTransform: 'none' }}
              data-testid={testIdPrefix ? `${testIdPrefix}-${item.key}` : undefined}
            >
              {item.label}
            </Badge>
          </Tooltip>
        );
      })}
    </Group>
  );
}

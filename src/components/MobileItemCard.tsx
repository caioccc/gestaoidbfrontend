import React from 'react';
import { Paper, Group, Box, ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';

interface MobileItemCardProps {
  media?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  primaryAction?: React.ReactNode;
  testId?: string;
}

export default function MobileItemCard({
  media,
  children,
  actions,
  primaryAction,
  testId,
}: MobileItemCardProps) {
  return (
    <Paper p="sm" radius="md" withBorder data-testid={testId}>
      <Group align="center" gap="sm" wrap="nowrap">
        <Box style={{ flexShrink: 0 }}>{media}</Box>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Box>{children}</Box>
        </Box>
        {primaryAction ? <Box style={{ flexShrink: 0 }}>{primaryAction}</Box> : null}
        {actions ? (
          <Menu shadow="md" position="bottom-end">
            <Menu.Target>
              <ActionIcon color="gray" size="lg" variant="subtle" aria-label="Ações">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>{actions}</Menu.Dropdown>
          </Menu>
        ) : null}
      </Group>
    </Paper>
  );
}
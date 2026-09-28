import React from 'react';
import { Button, Drawer, ScrollArea, Stack } from '@mantine/core';

interface FilterDrawerProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  clearLabel?: string;
  onClear?: () => void;
  clearDisabled?: boolean;
  testId?: string;
}

/**
 * Gaveta inferior (Bottom Drawer) para filtros complexos em telas compactas.
 * O conteúdo é passado via `children` e deve aplicar os filtros imediatamente;
 * o botão "Limpar" é opcional.
 */
export default function FilterDrawer({
  opened,
  onClose,
  title,
  children,
  clearLabel,
  onClear,
  clearDisabled,
  testId,
}: FilterDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="auto"
      title={title}
      withCloseButton
      data-testid={testId}
    >
      <Stack gap="md">
        <ScrollArea.Autosize mah="62dvh" type="auto" offsetScrollbars>
          <Stack gap="sm" px={2}>
            {children}
          </Stack>
        </ScrollArea.Autosize>
        {onClear && clearLabel && (
          <Button
            variant="default"
            fullWidth
            onClick={onClear}
            disabled={clearDisabled}
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            {clearLabel}
          </Button>
        )}
      </Stack>
    </Drawer>
  );
}
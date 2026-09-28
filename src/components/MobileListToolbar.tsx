import React from 'react';
import { ActionIcon, Group, Indicator, Menu, TextInput } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconDotsVertical, IconSearch } from '@tabler/icons-react';

interface MobileListToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filtersLabel: string;
  onOpenFilters?: () => void;
  filterCount?: number;
  primary?: React.ReactNode;
  menuChildren?: React.ReactNode;
  menuLabel?: string;
  testId?: string;
}

/**
 * Barra superior única para telas compactas (<= lg): busca flexível,
 * gatilho de filtros com badge de contagem, ação primária e menu de
 * opções em overflow (`IconDotsVertical`). Não renderiza nada no desktop —
 * as páginas devem renderizá-la condicionalmente com `useIsCompactList()`.
 */
export default function MobileListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filtersLabel,
  onOpenFilters,
  filterCount = 0,
  primary,
  menuChildren,
  menuLabel,
  testId,
}: MobileListToolbarProps) {
  return (
    <Group gap="xs" wrap="nowrap" align="center" data-testid={testId}>
      {onSearchChange && (
        <TextInput
          value={searchValue ?? ''}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          leftSectionPointerEvents="none"
          size="sm"
          style={{ flex: 1, minWidth: 120 }}
          leftSectionWidth={32}
          aria-label={searchPlaceholder}
          data-testid={testId ? `${testId}-search` : undefined}
        />
      )}
      {onOpenFilters && (
        <Indicator
          inline
          disabled={filterCount === 0}
          label={filterCount}
          size={16}
          color="grape"
          withBorder
        >
          <ActionIcon
            variant="default"
            size="lg"
            onClick={onOpenFilters}
            aria-label={filtersLabel}
            data-testid={testId ? `${testId}-filters` : undefined}
          >
            <IconAdjustmentsHorizontal size={18} />
          </ActionIcon>
        </Indicator>
      )}
      {primary}
      {menuChildren && (
        <Menu shadow="md" width={230} position="bottom-end">
          <Menu.Target>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={menuLabel ?? 'Mais opções'}
              data-testid={testId ? `${testId}-menu` : undefined}
            >
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>{menuChildren}</Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
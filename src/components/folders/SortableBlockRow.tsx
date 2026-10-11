import React from 'react';
import { Group, Paper, Switch, Text, ThemeIcon } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FolderBlockKey } from '../../types';

interface SortableBlockRowProps {
  id: FolderBlockKey;
  label: string;
  checked: boolean;
  icon: React.ReactNode;
  onToggle: (checked: boolean) => void;
}

export default function SortableBlockRow({
  id,
  label,
  checked,
  icon,
  onToggle,
}: SortableBlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : checked ? 1 : 0.5,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      p="sm"
      radius="md"
      mb="xs"
      shadow={isDragging ? 'md' : 'xs'}
      data-testid={`block-row-${id}`}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ cursor: 'grab', touchAction: 'none', display: 'flex' }} {...attributes} {...listeners}>
            <IconGripVertical size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
          </div>
          <ThemeIcon variant="light" color={checked ? 'teal' : 'gray'} size="lg">
            {icon}
          </ThemeIcon>
          <Text
            size="sm"
            fw={600}
            truncate
            style={
              checked
                ? undefined
                : { textDecoration: 'line-through', color: 'var(--mantine-color-dimmed)' }
            }
          >
            {label}
          </Text>
        </Group>
        <Switch
          size="sm"
          checked={checked}
          onChange={(event) => onToggle(event.currentTarget.checked)}
          aria-label={label}
          style={{ flexShrink: 0 }}
        />
      </Group>
    </Paper>
  );
}
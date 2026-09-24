import React from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconGripVertical, IconPencil, IconTrash } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkTypeIcon } from './linkIcons';
import { useLanguage } from '../i18n';
import type { ChurchPublicLink } from '../types';

interface SortableLinkRowProps {
  link: ChurchPublicLink;
  onEdit: (link: ChurchPublicLink) => void;
  onDelete: (link: ChurchPublicLink) => void;
  onToggleActive: (link: ChurchPublicLink, active: boolean) => void;
}

export default function SortableLinkRow({
  link,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableLinkRowProps) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const urlText =
    link.link_type === 'PIX'
      ? `${link.pix_type ? `${link.pix_type}: ` : ''}${link.pix_key || ''}`
      : link.url;

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      p="sm"
      radius="md"
      mb="xs"
      shadow={isDragging ? 'md' : 'xs'}
      data-testid={`link-row-${link.id}`}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Box style={{ cursor: 'grab', touchAction: 'none' }} {...attributes} {...listeners}>
            <IconGripVertical size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
          </Box>

          <ThemeIcon variant="light" size="lg">
            <LinkTypeIcon iconKey={link.icon_key} />
          </ThemeIcon>

          <Stack gap={0} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Text size="sm" fw={600} truncate>
                {link.title}
              </Text>
              {typeof link.click_count === 'number' && link.click_count > 0 ? (
                <Badge size="xs" variant="light" color="gray">
                  {t.linksPage.clickCount.replace('{count}', String(link.click_count))}
                </Badge>
              ) : null}
              {link.highlight && (
                <Badge size="xs" color="yellow" variant="light">
                  {t.linksPage.highlightLabel}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" truncate>
              {link.link_type_display}
              {urlText ? ` · ${urlText}` : ''}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Switch
            size="sm"
            checked={link.is_active}
            onChange={(event) => onToggleActive(link, event.currentTarget.checked)}
            aria-label={t.linksPage.activeLabel}
          />
          <Tooltip label={t.common.edit}>
            <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(link)}>
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.common.delete}>
            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(link)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
}
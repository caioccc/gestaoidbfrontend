import React from 'react';
import {
  Badge,
  Box,
  Card,
  Flex,
  Group,
  Switch,
  Text,
  ThemeIcon,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { IconGripVertical, IconPencil, IconTrash, IconExternalLink } from '@tabler/icons-react';
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
    <Card
      ref={setNodeRef}
      style={style}
      withBorder
      shadow="sm"
      padding="sm"
      data-testid={`link-row-${link.id}`}
    >
      <Flex align="center" gap="sm">
        <Box style={{ cursor: 'grab', touchAction: 'none' }} {...attributes} {...listeners}>
          <IconGripVertical size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
        </Box>

        <ThemeIcon variant="light" size="lg">
          <LinkTypeIcon iconKey={link.icon_key} />
        </ThemeIcon>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6}>
            <Text size="sm" fw={600} truncate>
              {link.title}
            </Text>
            {link.highlight && (
              <Badge size="xs" color="yellow" variant="light">
                {t.linksPage.highlightLabel}
              </Badge>
            )}
            {!link.is_active && (
              <Badge size="xs" variant="light">
                {t.linksPage.pageDisabled}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {link.link_type_display}
            {urlText ? ` · ${urlText}` : ''}
            {link.click_count > 0
              ? ` · ${t.linksPage.clickCount.replace('{count}', String(link.click_count))}`
              : ''}
          </Text>
        </Box>

        <Switch
          size="sm"
          checked={link.is_active}
          onChange={(event) => onToggleActive(link, event.currentTarget.checked)}
          aria-label={t.linksPage.activeLabel}
        />

        {link.url && (
          <Tooltip label={t.linksPage.openPage}>
            <ActionIcon
              variant="subtle"
              component="a"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <IconExternalLink size={16} />
            </ActionIcon>
          </Tooltip>
        )}

        <Tooltip label={t.common.edit}>
          <ActionIcon variant="subtle" onClick={() => onEdit(link)}>
            <IconPencil size={16} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={t.common.delete}>
          <ActionIcon variant="subtle" color="red" onClick={() => onDelete(link)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    </Card>
  );
}
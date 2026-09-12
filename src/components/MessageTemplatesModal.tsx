import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import MessageTemplateFormModal from './MessageTemplateFormModal';
import type { MessageTemplate } from '../types';

interface MessageTemplatesModalProps {
  opened: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function MessageTemplatesModal({
  opened,
  onClose,
  onChanged,
}: MessageTemplatesModalProps) {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [toDelete, setToDelete] = useState<MessageTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    accountsApi
      .messageTemplates()
      .then(setTemplates)
      .catch(() => {
        notifications.show({ color: 'red', message: t.sender.error });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!opened) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSaved = () => {
    load();
    onChanged();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await accountsApi.deleteMessageTemplate(toDelete.id);
      notifications.show({ color: 'green', message: t.sender.deleted });
      setToDelete(null);
      load();
      onChanged();
    } catch {
      notifications.show({ color: 'red', message: t.sender.error });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={t.sender.manageTitle}
        size="lg"
        centered
      >
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {templates.length}
            </Text>
            <Button
              variant="light"
              size="compact-sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              data-testid="template-new"
            >
              {t.sender.newTemplate}
            </Button>
          </Group>
          {loading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : templates.length === 0 ? (
            <Text size="sm" c="dimmed" py="sm">
              {t.sender.emptyTemplates}
            </Text>
          ) : (
            <ScrollArea.Autosize mah={420} type="auto">
              <Stack gap="xs">
                {templates.map((template) => (
                  <Group
                    key={template.id}
                    justify="space-between"
                    wrap="nowrap"
                    gap="sm"
                    p="xs"
                    style={{ borderRadius: 'var(--mantine-radius-md)' }}
                  >
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {template.title}
                      </Text>
                      <Group gap={4}>
                        <Badge size="xs" color="blue" variant="light" radius="sm">
                          {template.category_display}
                        </Badge>
                        {!template.is_active ? (
                          <Badge size="xs" color="gray" variant="light" radius="sm">
                            {t.sender.inactiveLabel}
                          </Badge>
                        ) : null}
                      </Group>
                    </Stack>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => {
                          setEditing(template);
                          setFormOpen(true);
                        }}
                        data-testid={`template-edit-${template.id}`}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => setToDelete(template)}
                        data-testid={`template-delete-${template.id}`}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Modal>

      <MessageTemplateFormModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        editing={editing}
      />

      <Modal
        opened={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t.sender.manageTitle}
        centered
      >
        <Stack>
          <Text size="sm">{t.sender.deleteConfirm}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              {t.common.delete}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
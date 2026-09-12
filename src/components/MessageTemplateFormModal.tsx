import React, { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import type { MessageTemplate, MessageTemplateCategory } from '../types';

interface MessageTemplateFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: MessageTemplate | null;
}

const CATEGORIES: MessageTemplateCategory[] = [
  'BIRTHDAY',
  'WELCOME',
  'CARE',
  'VERSE',
  'CARD_EXPIRING',
  'CUSTOM',
];

export default function MessageTemplateFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: MessageTemplateFormModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MessageTemplateCategory>('CUSTOM');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setTitle(editing?.title ?? '');
    setCategory(editing?.category ?? 'CUSTOM');
    setContent(editing?.content ?? '');
    setIsActive(editing?.is_active ?? true);
    setSaving(false);
  }, [opened, editing]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const categoryData = CATEGORIES.map((c) => ({
    value: c,
    label: categoryLabel(t, c),
  }));

  const save = async () => {
    if (!title.trim()) {
      notifications.show({ color: 'red', message: t.sender.titleRequired });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        content,
        is_active: isActive,
      };
      if (editing) {
        await accountsApi.updateMessageTemplate(editing.id, payload);
      } else {
        await accountsApi.createMessageTemplate(payload);
      }
      notifications.show({ color: 'green', message: t.sender.saved });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const first = data ? Object.values(data)[0] : null;
      notifications.show({
        color: 'red',
        message: first ? String(first) : t.sender.error,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={editing ? t.sender.editTemplate : t.sender.newTemplate}
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t.sender.titleField}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          withAsterisk
          data-autofocus
          required
          data-testid="template-title"
        />
        <Select
          label={t.sender.categoryField}
          data={categoryData}
          value={category}
          onChange={(v) => setCategory((v as MessageTemplateCategory) || 'CUSTOM')}
          searchable
          data-testid="template-category"
        />
        <Textarea
          label={t.sender.contentField}
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          minRows={6}
          autosize
          description={t.sender.tokensHint}
          data-testid="template-content"
        />
        <Switch
          label={t.sender.activeLabel}
          checked={isActive}
          onChange={(e) => setIsActive(e.currentTarget.checked)}
          data-testid="template-active"
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={handleClose}>
            {t.common.cancel}
          </Button>
          <Button loading={saving} onClick={save} data-testid="template-save">
            {t.common.save}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function categoryLabel(t: ReturnType<typeof useLanguage>['t'], c: MessageTemplateCategory): string {
  switch (c) {
    case 'BIRTHDAY':
      return t.sender.categoryBirthday;
    case 'WELCOME':
      return t.sender.categoryWelcome;
    case 'CARE':
      return t.sender.categoryCare;
    case 'VERSE':
      return t.sender.categoryVerse;
    case 'CARD_EXPIRING':
      return t.sender.categoryCardExpiring;
    case 'CUSTOM':
      return t.sender.categoryCustom;
  }
}
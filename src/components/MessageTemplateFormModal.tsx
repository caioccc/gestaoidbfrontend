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
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import type { MessageTemplate, MessageTemplateCategory } from '../types';
import { useFeedback } from '../hooks/useFeedback';

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
  'DISCIPLER_REMINDER',
  'EBD_CLASS_ANNOUNCEMENT',
  'EBD_ABSENCE_RESCUE',
  'EBD_BIRTHDAY',
  'CUSTOM',
];

export default function MessageTemplateFormModal({
  opened,
  onClose,
  onSaved,
  editing,
}: MessageTemplateFormModalProps) {
  const { t } = useLanguage();
  const fb = useFeedback();
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
      fb.error(t.sender.titleRequired);
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
      fb.success(t.sender.saved);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const first = data ? Object.values(data)[0] : null;
      fb.error(first ? String(first) : t.sender.error);
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
    case 'DISCIPLER_REMINDER':
      return t.sender.categoryDisciplerReminder;
    case 'EBD_CLASS_ANNOUNCEMENT':
      return t.sender.categoryEbdClassAnnouncement;
    case 'EBD_ABSENCE_RESCUE':
      return t.sender.categoryEbdAbsenceRescue;
    case 'EBD_BIRTHDAY':
      return t.sender.categoryEbdBirthday;
    case 'CUSTOM':
      return t.sender.categoryCustom;
  }
}


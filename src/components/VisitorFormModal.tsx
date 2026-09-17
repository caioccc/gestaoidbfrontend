import React, { useEffect } from 'react';
import { Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import MaskedTextInput from './MaskedTextInput';
import { useLanguage } from '../i18n';
import { toSentenceCase, toUpperCamelWords } from '../utils/format';
import type { Member } from '../types';

export interface VisitorFormValues {
  name: string;
  phone: string;
  notes: string;
}

interface VisitorFormModalProps {
  opened: boolean;
  onClose: () => void;
  visitor: Member | null;
  onSave: (payload: VisitorFormValues, isEdit: boolean) => Promise<Member>;
}

export default function VisitorFormModal({ opened, onClose, visitor, onSave }: VisitorFormModalProps) {
  const { t } = useLanguage();

  const form = useForm<VisitorFormValues>({
    initialValues: { name: '', phone: '', notes: '' },
    validate: {
      name: (v) => (v.trim().length ? null : t.common.name),
    },
  });

  useEffect(() => {
    if (!opened) return;
    if (visitor) {
      form.setValues({
        name: visitor.name || '',
        phone: visitor.phone || '',
        notes: visitor.notes || '',
      });
    } else {
      form.reset();
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, visitor?.id]);

  const handleSubmit = form.onSubmit(async (values) => {
    await onSave(
      {
        ...values,
        name: toUpperCamelWords(values.name),
        notes: values.notes ? toSentenceCase(values.notes) : '',
      },
      !!visitor,
    );
    onClose();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={visitor ? t.funnel.visitorEditTitle : t.funnel.visitorTitle}
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={t.common.name}
            placeholder={t.common.name}
            withAsterisk
            required
            data-autofocus
            {...form.getInputProps('name')}
            data-testid="visitor-name"
          />
          <MaskedTextInput
            label={t.funnel.visitorPhone}
            placeholder="(00) 00000-0000"
            mask="(00) 00000-0000"
            value={form.values.phone}
            error={form.errors.phone}
            onAccept={(value: string) => form.setFieldValue('phone', value)}
            data-testid="visitor-phone"
          />
          <Textarea
            label={t.funnel.visitorNotes}
            placeholder={t.funnel.visitorNotes}
            minRows={3}
            autosize
            {...form.getInputProps('notes')}
            data-testid="visitor-notes"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" data-testid="visitor-save">
              {t.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
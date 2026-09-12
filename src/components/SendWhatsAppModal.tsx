import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandWhatsapp, IconExternalLink, IconSettings } from '@tabler/icons-react';
import { accountsApi } from '../api/accounts';
import { useLanguage } from '../i18n';
import { normalizeWhatsAppPhone, renderWhatsAppMessage } from '../utils/whatsapp';
import MessageTemplatesModal from './MessageTemplatesModal';
import type { Member, MessageTemplate, MessageTemplateCategory } from '../types';

interface SendWhatsAppModalProps {
  opened: boolean;
  onClose: () => void;
  member: Pick<Member, 'id' | 'name' | 'phone'> | null;
  defaultCategory?: MessageTemplateCategory;
  churchName?: string;
  churchCity?: string;
  onSent?: (memberId: number) => void;
}

export default function SendWhatsAppModal({
  opened,
  onClose,
  member,
  defaultCategory,
  churchName = '',
  churchCity = '',
  onSent,
}: SendWhatsAppModalProps) {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const sender = t.sender;

  const options = useMemo(() => {
    let list = templates.filter((m) => m.is_active);
    if (defaultCategory) {
      list = list.filter((m) => m.category === defaultCategory);
    }
    return list.map((m) => ({
      value: String(m.id),
      label: m.title,
      category: m.category,
    }));
  }, [templates, defaultCategory]);

  const loadTemplates = () => {
    setLoadingTemplates(true);
    accountsApi
      .messageTemplates()
      .then((list) => {
        setTemplates(list);
        const first = list.find(
          (m) => m.is_active && (!defaultCategory || m.category === defaultCategory),
        );
        if (first) {
          setSelectedId(String(first.id));
          setMessage(
            renderWhatsAppMessage(
              first.content,
              member?.name || '',
              churchName,
              churchCity,
            ),
          );
        }
      })
      .catch(() => {
        notifications.show({
          color: 'red',
          message: t.sender.error,
        });
      })
      .finally(() => setLoadingTemplates(false));
  };

  useEffect(() => {
    if (!opened) return;
    setMessage('');
    setDirty(false);
    setSelectedId(null);
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, member?.id]);

  const pickTemplate = (value: string | null) => {
    setSelectedId(value);
    setDirty(false);
    const template = templates.find((m) => String(m.id) === value);
    if (template) {
      setMessage(
        renderWhatsAppMessage(
          template.content,
          member?.name || '',
          churchName,
          churchCity,
        ),
      );
    }
  };

  const validPhone = member ? normalizeWhatsAppPhone(member.phone) : null;
  const canSend = !!member && !!validPhone && !!message.trim();

  const handleSend = async () => {
    if (!member || !validPhone || !message.trim()) return;
    setPreparing(true);
    try {
      const payload: { template_id?: number; custom_text?: string; category: string } = {
        category: defaultCategory ?? 'CUSTOM',
      };
      if (selectedId && !dirty) {
        payload.template_id = Number(selectedId);
      } else {
        payload.custom_text = message;
      }
      const prepared = await accountsApi.prepareWhatsapp(member.id, payload);
      window.open(prepared.whatsapp_url, '_blank', 'noopener,noreferrer');
      notifications.show({ color: 'green', message: t.sender.prepared });
      onSent?.(member.id);
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: Record<string, string[]> } })?.response?.data?.phone ||
        t.sender.error;
      notifications.show({ color: 'red', message: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.sender.sendTo.replace('{name}', member?.name ?? '')}
      size="lg"
    >
      <Stack gap="md">
        {!validPhone ? (
          <Text size="sm" c="red">
            {t.sender.noPhone}
          </Text>
        ) : (
          <>
            <Select
              label={t.sender.template}
              placeholder={t.sender.templatePlaceholder}
              data={options.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={selectedId}
              onChange={pickTemplate}
              searchable
              clearable
              disabled={loadingTemplates || options.length === 0}
              nothingFoundMessage={t.sender.noTemplate}
              data-testid="wa-template"
            />
            {loadingTemplates && options.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t.sender.loading}
              </Text>
            ) : null}
            {!loadingTemplates && options.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t.sender.noTemplate}
              </Text>
            ) : null}
            <Group justify="flex-end" mt={-6}>
              <Button
                variant="subtle"
                size="compact-xs"
                color="gray"
                leftSection={<IconSettings size={14} />}
                onClick={() => setManageOpen(true)}
                data-testid="wa-manage-templates"
              >
                {t.sender.manageTemplates}
              </Button>
            </Group>
            <Textarea
              label={t.sender.message}
              placeholder={t.sender.messagePlaceholder}
              value={message}
              onChange={(event) => {
                setMessage(event.currentTarget.value);
                setDirty(true);
              }}
              minRows={6}
              autosize
              required
              data-testid="wa-message"
            />
            <Group justify="space-between" mt="xs">
              <Text size="xs" c="dimmed">
                {`{{NOME}} {{PRIMEIRO_NOME}} {{IGREJA}} {{CIDADE}}`}
              </Text>
              <Group gap="xs">
                <Button variant="default" onClick={onClose}>
                  {t.common.cancel}
                </Button>
                <Button
                  color="green"
                  leftSection={
                    preparing ? <IconExternalLink size={16} /> : <IconBrandWhatsapp size={16} />
                  }
                  loading={preparing}
                  disabled={!canSend}
                  onClick={handleSend}
                  data-testid="wa-open"
                >
                  {preparing ? t.sender.opening : t.sender.open}
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Stack>

      <MessageTemplatesModal
        opened={manageOpen}
        onClose={() => setManageOpen(false)}
        onChanged={loadTemplates}
      />
    </Modal>
  );
}
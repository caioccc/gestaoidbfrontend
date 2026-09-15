import React, { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandWhatsapp, IconCopy } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from '../utils/whatsapp';
import { maskPhone, onlyDigits } from '../utils/format';
import type { BandSetlist } from '../types';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-');
  const i = Number(m) - 1;
  return `${Number(d)} de ${MONTHS_PT[i] ?? m} de ${y}`;
}

interface SetlistShareModalProps {
  setlist: BandSetlist | null;
  onClose: () => void;
}

export default function SetlistShareModal({ setlist, onClose }: SetlistShareModalProps) {
  const { t } = useLanguage();

  const [phone, setPhone] = useState('');
  const [custom, setCustom] = useState<string | null>(null);

  useEffect(() => {
    if (setlist) {
      setPhone('');
      setCustom(null);
    }
  }, [setlist]);

  const message = useMemo(() => {
    if (!setlist) return '';
    const lines: string[] = [];
    lines.push(`🎶 SETLIST — ${setlist.band_name || t.music.noBand}`);
    lines.push(`📅 ${dateLabel(setlist.date)}`);
    if (setlist.theme) lines.push(`🏷️ ${t.music.setlistTheme}: ${setlist.theme}`);
    if (setlist.description) lines.push(`📝 ${setlist.description}`);
    lines.push('');
    [...setlist.items]
      .sort((a, b) => a.order - b.order)
      .forEach((it, idx) => {
        const tom = it.custom_key || it.song_church_key;
        const title = it.song_artist ? `${it.song_title} — ${it.song_artist}` : it.song_title;
        lines.push(
          `${idx + 1}. ${title} — ${t.music.setlistSongCustomKey}: ${tom || '—'} | ${t.music.bpmLabel}: ${it.song_bpm ?? '—'}`,
        );
      });
    return lines.join('\n');
  }, [setlist, t]);

  const valid = normalizeWhatsAppPhone(phone) !== null && message.trim().length > 0;

  const send = () => {
    const url = buildWhatsAppUrl(phone, message);
    if (!url) {
      notifications.show({ color: 'red', message: t.music.waPhoneInvalid });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      notifications.show({ color: 'green', message: t.music.copyDone });
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao copiar.' });
    }
  };

  return (
    <Modal opened={!!setlist} onClose={onClose} size="lg" centered title={t.music.waTitle}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t.music.waPhonePlaceholder}
        </Text>
        <TextInput
          label={t.music.waPhoneLabel}
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.currentTarget.value))}
          leftSection={<IconBrandWhatsapp size={16} />}
        />
        <Textarea
          label={t.music.waMessageLabel}
          value={custom ?? message}
          onChange={(e) => setCustom(e.currentTarget.value)}
          autosize
          minRows={8}
          maxRows={14}
        />
        <Group justify="flex-end">
          <Button variant="default" leftSection={<IconCopy size={16} />} onClick={() => void copy()} disabled={message.trim().length === 0}>
            {t.music.waCopy}
          </Button>
          <Button
            color="green"
            leftSection={<IconBrandWhatsapp size={16} />}
            disabled={!valid}
            onClick={send}
          >
            {t.music.waSend}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
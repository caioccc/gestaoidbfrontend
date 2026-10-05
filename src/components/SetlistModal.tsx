import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { useFeedback } from '../hooks/useFeedback';
import EmptyState from './EmptyState';
import { musicApi } from '../api/music';
import type { Song, SetlistItem, WorshipSetlist } from '../types';

interface SetlistModalProps {
  opened: boolean;
  onClose: () => void;
  rosterId: number;
  existingSetlist: WorshipSetlist | null;
  onSaved: () => void;
}

interface Row {
  song: number | null;
  notes: string;
}

export default function SetlistModal({ opened, onClose, rosterId, existingSetlist, onSaved }: SetlistModalProps) {
  const { t } = useLanguage();
const fb = useFeedback();
  const [songs, setSongs] = useState<Song[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    musicApi.songs().then((list) => {
      setSongs(list);
      if (existingSetlist && existingSetlist.items.length > 0) {
        setRows(
          existingSetlist.items.map((s) => ({
            song: s.song,
            notes: s.notes,
          }))
        );
      } else {
        setRows([]);
      }
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [opened, existingSetlist]);

  const addRow = () => {
    setRows((prev) => [...prev, { song: null, notes: '' }]);
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setRows((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setRows((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const save = async () => {
    const valid = rows.filter((r) => r.song);
    if (valid.length === 0) {
      try {
        await musicApi.deleteSetlist(rosterId);
      } catch { /* empty */ }
      fb.success(t.music.setlistCleared);
      onSaved();
      onClose();
      return;
    }
    setSaving(true);
    try {
      const payload = valid.map((r, i) => ({
        song: r.song!,
        order: i + 1,
        notes: r.notes.trim(),
      }));
      await musicApi.upsertSetlist(rosterId, payload);
      fb.success(t.music.setlistSaved);
      onSaved();
      onClose();
    } catch (err) {
      fb.fromError(err, t.music.setlistSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  /* MÃºsicas privadas seguem selecionÃ¡veis aqui (o Louvor monta o prÃ³prio
   * repertÃ³rio), mas ficam marcadas com cadeado para nÃ£o haver surpresa
   * quando o fluxo de culto for compartilhado. */
  const songData = songs.map((s) => ({
    value: String(s.id),
    label: `${s.is_private ? 'ðŸ”’ ' : ''}${s.title}${s.artist ? ` â€” ${s.artist}` : ''}`,
  }));

  return (
    <Modal opened={opened} onClose={onClose} size="lg" centered title={t.music.setlistEdit}>
        {loading ? (
          <Stack gap="md" py="xs">
            <Skeleton height={12} width="60%" radius="sm" />
            <Stack gap={6}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Group key={i} gap="xs" align="flex-end" wrap="nowrap">
                  <Skeleton height={28} width={24} radius="sm" />
                  <Group gap={2} wrap="nowrap">
                    <Skeleton height={28} width={28} radius="md" />
                    <Skeleton height={28} width={28} radius="md" />
                  </Group>
                  <Skeleton height={28} width={280} radius="md" />
                  <Skeleton height={28} style={{ flex: 1 }} radius="md" />
                  <Skeleton height={28} width={28} radius="md" />
                </Group>
              ))}
            </Stack>
            <Skeleton height={26} width={140} radius="md" />
            <Divider />
            <Group justify="flex-end">
              <Skeleton height={36} width={110} radius="md" />
            </Group>
          </Stack>
        ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t.music.addToSetlistHint}</Text>

          {rows.length === 0 ? (
            <EmptyState variant="compact" title={t.music.setlistEmpty} />
          ) : (
            <Stack gap={6}>
              {rows.map((row, i) => (
                <Group key={i} gap="xs" align="flex-end">
                  <Text size="xs" fw={600} c="dimmed" w={24} ta="center">
                    {i + 1}
                  </Text>
                  <Group gap={2}>
                    <Tooltip label={t.music.ordering}>
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => moveUp(i)} disabled={i === 0}>
                        â†‘
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t.music.ordering}>
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => moveDown(i)} disabled={i === rows.length - 1}>
                        â†“
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Select
                    data={songData}
                    value={row.song ? String(row.song) : null}
                    onChange={(v) => updateRow(i, { song: v ? Number(v) : null })}
                    searchable
                    w={280}
                    size="xs"
                  />
                  <TextInput
                    placeholder={t.music.setlistNotes}
                    value={row.notes}
                    onChange={(e) => updateRow(i, { notes: e.currentTarget.value })}
                    style={{ flex: 1 }}
                    size="xs"
                  />
                  <Tooltip label={t.common.delete}>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRow(i)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ))}
            </Stack>
          )}

          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={addRow}
          >
            {t.music.addToSetlist}
          </Button>

          <Divider />

          <Group justify="flex-end">
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saving}
              onClick={save}
            >
              {t.common.save}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

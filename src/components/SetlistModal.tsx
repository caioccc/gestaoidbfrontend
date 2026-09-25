import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
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
          })),
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
      notifications.show({ color: 'green', message: t.music.setlistCleared });
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
      notifications.show({ color: 'green', message: t.music.setlistSaved });
      onSaved();
      onClose();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao salvar setlist.' });
    } finally {
      setSaving(false);
    }
  };

  const songData = songs.map((s) => ({ value: String(s.id), label: `${s.title}${s.artist ? ` — ${s.artist}` : ''}` }));

  return (
    <Modal opened={opened} onClose={onClose} size="lg" centered title={t.music.setlistEdit}>
      {loading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t.music.addToSetlistHint}</Text>

          {rows.length === 0 ? (
            <Text size="sm" c="dimmed">{t.music.setlistEmpty}</Text>
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
                        ↑
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t.music.ordering}>
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => moveDown(i)} disabled={i === rows.length - 1}>
                        ↓
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

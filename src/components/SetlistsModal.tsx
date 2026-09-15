import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowUp,
  IconDeviceFloppy,
  IconMusic,
  IconTrash,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { musicApi } from '../api/music';
import { toSentenceCase, toUpperCamelWords } from '../utils/format';
import type { Band, BandSetlist, Song } from '../types';

interface SetlistsModalProps {
  opened: boolean;
  onClose: () => void;
  editing: BandSetlist | null;
  onSaved: () => void;
}

interface Row {
  songId: string;
  customKey: string;
}

export default function SetlistsModal({ opened, onClose, editing, onSaved }: SetlistsModalProps) {
  const { t } = useLanguage();

  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [bandId, setBandId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [addValue, setAddValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    void musicApi.songs().then(setSongs).catch(() => setSongs([]));
    void musicApi.bands().then(setBands).catch(() => setBands([]));
    setDate(editing?.date ?? null);
    setBandId(editing?.band ? String(editing.band) : null);
    setDescription(editing?.description ?? '');
    setTheme(editing?.theme ?? '');
    setRows(
      (editing?.items ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((it) => ({ songId: String(it.song), customKey: it.custom_key })),
    );
    setAddValue(null);
  }, [opened, editing]);

  const remainingSongs = useMemo(
    () => songs.filter((s) => !rows.some((r) => r.songId === String(s.id))),
    [songs, rows],
  );

  const onAdd = (value: string | null) => {
    if (!value) return;
    setRows((prev) => (prev.some((r) => r.songId === value) ? prev : [...prev, { songId: value, customKey: '' }]));
    setAddValue(null);
  };

  const move = (index: number, delta: number) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!date || !description.trim() || rows.length === 0) return;
    setSaving(true);
    const payload = {
      band: bandId ? Number(bandId) : null,
      date,
      description: toSentenceCase(description),
      theme: toUpperCamelWords(theme),
      items: rows.map((r, i) => ({
        song: Number(r.songId),
        order: i + 1,
        custom_key: r.customKey.trim(),
      })),
    };
    try {
      if (editing) {
        await musicApi.updateBandSetlist(editing.id, payload);
      } else {
        await musicApi.createBandSetlist(payload);
      }
      notifications.show({ color: 'green', message: t.music.setlistSaved });
      onSaved();
      onClose();
    } catch {
      notifications.show({ color: 'red', message: 'Erro ao salvar setlist.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      title={editing ? t.music.editSetlist : t.music.newSetlist}
    >
      <Stack gap="md">
        <Group gap="md" grow align="flex-end">
          <DateInput
            label={t.music.setlistDate}
            placeholder="DD/MM/AAAA"
            value={date}
            onChange={setDate}
            valueFormat="DD/MM/YYYY"
            required
          />
          <Select
            label={t.music.setlistBand}
            placeholder={t.music.noBand}
            data={bands.map((b) => ({ value: String(b.id), label: b.name }))}
            value={bandId}
            onChange={setBandId}
            clearable
            searchable
          />
        </Group>

        <TextInput
          label={t.music.setlistDescription}
          placeholder={t.music.setlistDescriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          required
        />

        <TextInput
          label={t.music.setlistTheme}
          placeholder={t.music.setlistThemePlaceholder}
          value={theme}
          onChange={(e) => setTheme(e.currentTarget.value)}
        />

        <Stack gap="xs">
          <Select
            label={t.music.setlistSongs}
            placeholder={t.music.setlistSongPlaceholder}
            data={remainingSongs.map((s) => ({ value: String(s.id), label: `${s.title}${s.artist ? ` — ${s.artist}` : ''}` }))}
            value={addValue}
            onChange={onAdd}
            searchable
          />

          {rows.length === 0 ? (
            <Text size="sm" c="dimmed">{t.music.setlistEmpty}</Text>
          ) : (
            <Stack gap={4}>
              {rows.map((row, i) => {
                const song = songs.find((s) => s.id === Number(row.songId));
                return (
                  <Group key={row.songId} gap={6} wrap="nowrap">
                    <Text size="sm" fw={600} w={26} c="dimmed">{i + 1}.</Text>
                    <IconMusic size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {song?.title ?? ''}
                      <Text span size="xs" c="dimmed"> {song?.artist ? `— ${song.artist}` : ''}</Text>
                    </Text>
                    <TextInput
                      placeholder={t.music.setlistSongCustomKey}
                      value={row.customKey}
                      onChange={(e) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, customKey: e.currentTarget.value } : r)))}
                      w={92}
                      size="xs"
                    />
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                      <IconArrowUp size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
                      <IconArrowDown size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRow(i)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Stack>

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={() => void save()}
            disabled={!date || !description.trim() || rows.length === 0}
          >
            {t.music.saveSetlist}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
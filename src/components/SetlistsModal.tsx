import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconDeviceFloppy,
  IconLock,
  IconMusic,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { musicApi } from '../api/music';
import { toSentenceCase, toUpperCamelWords } from '../utils/format';
import type { Band, BandSetlist, BandSetlistItem, Song } from '../types';

interface SetlistsModalProps {
  opened: boolean;
  onClose: () => void;
  editing: BandSetlist | null;
  onSaved: () => void;
}

interface Row {
  songId: string;
  /** Título desnormalizado do item, usado quando a música não está mais no
   *  repertório visível (ex.: privada de outra pessoa) — evita linha vazia. */
  fallbackTitle: string;
  fallbackArtist: string;
}

export default function SetlistsModal({ opened, onClose, editing, onSaved }: SetlistsModalProps) {
  const { t } = useLanguage();

  const toRow = (it: BandSetlistItem): Row => ({
    songId: String(it.song),
    fallbackTitle: it.song_title ?? '',
    fallbackArtist: it.song_artist ?? '',
  });

  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [bandId, setBandId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [addValue, setAddValue] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) return;
    void musicApi.songs().then(setSongs).catch(() => setSongs([]));
    void musicApi.bands().then(setBands).catch(() => setBands([]));
    setDate(editing?.date ?? null);
    setBandId(editing?.band ? String(editing.band) : null);
    setDescription(editing?.description ?? '');
    setTheme(editing?.theme ?? '');
    setIsPrivate(editing?.is_private ?? false);
    setRows(
      (editing?.items ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((it) => toRow(it)),
    );
    setAddValue(null);
    setAddSearch('');
  }, [opened, editing]);

  const remainingSongs = useMemo(
    () => songs.filter((s) => !rows.some((r) => r.songId === String(s.id))),
    [songs, rows],
  );

  /** Músicas privadas já selecionadas — combinadas com setlist público o
   *  backend recusa, então avisamos antes e travamos o botão de salvar. */
  const privateSelected = useMemo(
    () => rows.filter((r) => songs.find((s) => String(s.id) === r.songId)?.is_private),
    [rows, songs],
  );
  const blockedByPrivacy = !isPrivate && privateSelected.length > 0;

  const onAdd = (value: string | null) => {
    if (!value) return;
    setRows((prev) => (
      prev.some((r) => r.songId === value)
        ? prev
        : [...prev, { songId: value, fallbackTitle: '', fallbackArtist: '' }]
    ));
    setAddValue(null);
    setAddSearch('');
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
    if (blockedByPrivacy) {
      notifications.show({ color: 'yellow', message: t.music.setlistPrivateSongBlocked });
      return;
    }
    setSaving(true);
    const payload = {
      band: bandId ? Number(bandId) : null,
      date,
      description: toSentenceCase(description),
      theme: toUpperCamelWords(theme),
      is_private: isPrivate,
      items: rows.map((r, i) => ({
        song: Number(r.songId),
        order: i + 1,
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
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const detail = (data?.detail ?? data?.items) as string | string[] | undefined;
      notifications.show({
        color: 'red',
        message: Array.isArray(detail) ? detail[0] : (detail ?? t.music.setlistSaveError),
      });
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

        <Box>
          <Text size="sm" fw={500} mb={6}>{t.music.visibilityLabel}</Text>
          <SegmentedControl
            fullWidth
            value={isPrivate ? 'private' : 'public'}
            onChange={(value) => setIsPrivate(value === 'private')}
            data={[
              {
                value: 'public',
                label: (
                  <Center component="span" style={{ gap: 6 }}>
                    <IconWorld size={15} />
                    {t.music.visibilityPublic}
                  </Center>
                ),
              },
              {
                value: 'private',
                label: (
                  <Center component="span" style={{ gap: 6 }}>
                    <IconLock size={15} />
                    {t.music.visibilityPrivate}
                  </Center>
                ),
              },
            ]}
          />
          <Text size="xs" c="dimmed" mt={6}>
            {isPrivate ? t.music.visibilitySetlistTip : t.music.visibilitySongTip}
          </Text>
        </Box>

        <Stack gap="xs">
          <Select
            label={t.music.setlistSongs}
            placeholder={t.music.setlistSongPlaceholder}
            data={remainingSongs.map((s) => ({
              value: String(s.id),
              label: `${s.is_private ? '🔒 ' : ''}${s.title}${s.artist ? ` — ${s.artist}` : ''}`,
            }))}
            value={addValue}
            onChange={onAdd}
            searchValue={addSearch}
            onSearchChange={setAddSearch}
            searchable
          />

          {blockedByPrivacy ? (
            <Alert
              color="yellow"
              icon={<IconAlertTriangle size={18} />}
              data-testid="setlist-private-song-alert"
            >
              {t.music.setlistPrivateSongBlocked}
            </Alert>
          ) : null}

          {rows.length === 0 ? (
            <Text size="sm" c="dimmed">{t.music.setlistEmpty}</Text>
          ) : (
            <Stack gap={4}>
              {rows.map((row, i) => {
                const song = songs.find((s) => s.id === Number(row.songId));
                const title = song?.title || row.fallbackTitle;
                const artist = song?.artist || row.fallbackArtist;
                return (
                  <Group key={row.songId} gap={6} wrap="nowrap">
                    <Text size="sm" fw={600} w={26} c="dimmed">{i + 1}.</Text>
                    <IconMusic size={16} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
                    {song?.is_private ? (
                      <Tooltip label={t.music.privateSetlistBadgeTip}>
                        <IconLock
                          size={15}
                          data-testid={`setlist-row-private-${row.songId}`}
                          style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }}
                        />
                      </Tooltip>
                    ) : null}
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {title}
                      <Text span size="xs" c="dimmed"> {artist ? `— ${artist}` : ''}</Text>
                    </Text>
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
            disabled={!date || !description.trim() || rows.length === 0 || blockedByPrivacy}
          >
            {t.music.saveSetlist}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
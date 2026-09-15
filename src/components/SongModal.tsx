import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Grid,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconMusic,
  IconSearch,
  IconBrandYoutube,
  IconExternalLink,
  IconTrash,
} from '@tabler/icons-react';
import { musicApi } from '../api/music';
import { useLanguage } from '../i18n';
import type { Band, Song, YouTubeSearchResult } from '../types';

interface SongModalProps {
  opened: boolean;
  onClose: () => void;
  editing: Song | null;
  onSaved: () => void;
}

export default function SongModal({ opened, onClose, editing, onSaved }: SongModalProps) {
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [churchKey, setChurchKey] = useState('');
  const [originalKey, setOriginalKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState('');
  const [chordsJson, setChordsJson] = useState<Song['chords_json']>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [bandId, setBandId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchAlert, setSearchAlert] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [chordsAlert, setChordsAlert] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) {
      setSearchAlert(false);
      setChordsAlert(false);
      setResults([]);
      return;
    }
    void musicApi.bands().then(setBands).catch(() => setBands([]));
    setSearchAlert(false);
    setChordsAlert(false);
    setResults([]);
    setTitle(editing?.title ?? '');
    setArtist(editing?.artist ?? '');
    setYoutubeId(editing?.youtube_id ?? '');
    setYoutubeUrl(
      editing?.youtube_id
        ? `https://www.youtube.com/watch?v=${editing.youtube_id}`
        : '',
    );
    setThumbnailUrl(editing?.thumbnail_url ?? '');
    setChurchKey(editing?.church_key ?? '');
    setOriginalKey(editing?.original_key ?? '');
    setBpm(editing?.bpm ? String(editing.bpm) : '');
    setTimeSignature(editing?.time_signature ?? '4/4');
    setLyrics(editing?.lyrics ?? '');
    setTags(editing?.tags ?? '');
    setChordsJson(editing?.chords_json ?? []);
    setBandId(editing ? String(editing.band ?? '') : null);
    setQuery(editing?.youtube_title || editing?.title || '');
  }, [opened, editing]);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchAlert(false);
    setResults([]);
    try {
      const data = await musicApi.youtubeSearch(q);
      if (data.status === 'unavailable') {
        setSearchAlert(true);
        return;
      }
      setResults(data.results);
    } catch {
      setSearchAlert(true);
    } finally {
      setSearching(false);
    }
  };

  const useResult = (r: YouTubeSearchResult) => {
    setTitle(r.title);
    setYoutubeId(r.youtube_id);
    setYoutubeUrl(`https://www.youtube.com/watch?v=${r.youtube_id}`);
    setThumbnailUrl(r.thumbnail_url);
    setQuery(r.title);
    setArtist((prev) => prev || r.channel_name);
    void enrichFromYoutubeId(r.youtube_id);
  };

  const pickByUrl = () => {
    const raw = youtubeUrl.trim();
    if (!raw) return;
    const m = raw.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    const id = m ? m[1] : raw;
    if (!/^[\w-]{11}$/.test(id)) {
      notifications.show({ color: 'red', message: 'Link do YouTube inválido.' });
      return;
    }
    setYoutubeId(id);
    setYoutubeUrl(`https://www.youtube.com/watch?v=${id}`);
    if (!title.trim()) {
      setTitle(id.replace(/-/g, ' '));
    }
    setThumbnailUrl(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    void enrichFromYoutubeId(id);
  };

  const enrichFromYoutubeId = async (id: string) => {
    if (!id) return;
    setEnriching(true);
    setChordsAlert(false);
    try {
      const data = await musicApi.chordify(id);
      if (data.status === 'unavailable') {
        setChordsAlert(true);
        return;
      }
      if (data.format_key) {
        setOriginalKey((prev) => prev || data.format_key);
        setChurchKey((prev) => prev || data.format_key);
      }
      if (data.derivedBpm) setBpm(String(Math.round(data.derivedBpm)));
      const chords = data.chords_formatada ?? [];
      if (chords.length > 0) {
        setChordsJson(chords);
        notifications.show({ color: 'green', message: t.music.chordsReady });
      } else {
        setChordsAlert(true);
      }
    } catch {
      setChordsAlert(true);
    } finally {
      setEnriching(false);
    }
  };

  const save = async () => {
    if (!title.trim() || !youtubeId.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      artist: artist.trim(),
      band: bandId ? Number(bandId) : null,
      youtube_id: youtubeId.trim(),
      youtube_title: '',
      thumbnail_url: thumbnailUrl.trim(),
      duration_seconds: undefined,
      original_key: originalKey.trim(),
      church_key: churchKey.trim(),
      bpm: bpm ? Number(bpm) : undefined,
      time_signature: timeSignature.trim() || '4/4',
      chords: '',
      chords_json: chordsJson,
      lyrics,
      tags: tags.trim(),
    };
    try {
      if (editing) {
        await musicApi.updateSong(editing.id, payload);
      } else {
        await musicApi.createSong(payload);
      }
      notifications.show({ color: 'green', message: t.music.songSaved });
      onSaved();
      onClose();
    } catch {
      notifications.show({ color: 'red', message: t.music.chordsUnavailable });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      title={editing ? t.music.editSong : t.music.addSong}
    >
      <Stack gap="md">
        <TextInput
          label={t.music.searchYoutube}
          placeholder={t.music.searchYoutubePlaceholder}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
          leftSection={<IconBrandYoutube size={16} />}
          rightSection={
            searching ? <Loader size={18} /> : null
          }
        />
        <Button
          variant="light"
          leftSection={<IconSearch size={16} />}
          loading={searching}
          onClick={() => void doSearch()}
          fullWidth={false}
        >
          {t.music.searchYoutube}
        </Button>

        {searchAlert ? (
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
            {t.music.searchUnavailable}
          </Alert>
        ) : null}

        {results.length > 0 ? (
          <Box mah={300} style={{ overflowY: 'auto' }}>
            <Stack gap={4}>
              {results.map((r) => (
                <UnstyledButton
                  key={r.youtube_id}
                  onClick={() => useResult(r)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    borderRadius: 8,
                  }}
                >
                  <Box
                    style={{
                      width: 96,
                      height: 54,
                      borderRadius: 6,
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: 'var(--mantine-color-gray-2)',
                    }}
                  >
                    {r.thumbnail_url ? (
                      <img
                        src={r.thumbnail_url}
                        alt={r.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </Box>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {r.title}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {r.channel_name} {r.duration ? `• ${r.duration}` : ''}
                    </Text>
                  </Stack>
                </UnstyledButton>
              ))}
            </Stack>
          </Box>
        ) : null}

        <TextInput
          label={t.music.youtubeUrlLabel}
          placeholder={t.music.youtubeUrlPlaceholder}
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.currentTarget.value)}
          rightSection={
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={pickByUrl}
              disabled={!youtubeUrl.trim()}
            >
              Ok
            </Button>
          }
        />

        {chordsAlert ? (
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
            {t.music.chordsUnavailable}
          </Alert>
        ) : null}

        <TextInput
          label={t.music.youtubeIdLabel}
          placeholder="dQw4w9WgXcQ"
          value={youtubeId}
          onChange={(e) => setYoutubeId(e.currentTarget.value.replace(/\s/g, ''))}
          leftSection={<IconBrandYoutube size={15} />}
          rightSection={
            /^[\w-]{11}$/.test(youtubeId.trim()) ? (
              <Tooltip label={t.music.openYoutube}>
                <ActionIcon
                  variant="subtle"
                  component="a"
                  href={`https://www.youtube.com/watch?v=${youtubeId.trim()}`}
                  target="_blank"
                  rel="noreferrer"
                  size="sm"
                >
                  <IconExternalLink size={16} />
                </ActionIcon>
              </Tooltip>
            ) : null
          }
        />

        {enriching ? (
          <Group gap={6}>
            <Loader size={18} />
            <Text size="sm" c="dimmed">
              {t.music.enrichingChords}
            </Text>
          </Group>
        ) : null}

        {thumbnailUrl ? (
          <Group gap={12} align="flex-start">
            <Box
              style={{
                width: 160,
                height: 90,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: 'var(--mantine-color-gray-2)',
              }}
            >
              <img
                src={thumbnailUrl}
                alt={t.music.thumbnailPreview}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Stack gap={2}>
              <Text size="sm" fw={600}>
                {t.music.thumbnailPreview}
              </Text>
              <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                {thumbnailUrl}
              </Text>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                mt={4}
                onClick={() => setThumbnailUrl('')}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Stack>
          </Group>
        ) : null}

        {chordsJson.length > 0 ? (
          <Text size="xs" c="dimmed">
            {chordsJson.length} {t.music.chordsReady.toLowerCase()}
          </Text>
        ) : null}

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label={t.music.songTitleLabel}
              placeholder={t.music.songTitlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              leftSection={<IconMusic size={15} />}
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label={t.music.songArtistLabel}
              placeholder={t.music.songArtistPlaceholder}
              value={artist}
              onChange={(e) => setArtist(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 4 }}>
            <TextInput
              label={t.music.churchKeyLabel}
              placeholder="C"
              value={churchKey}
              onChange={(e) => setChurchKey(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 4 }}>
            <TextInput
              label={t.music.originalKeyLabel}
              placeholder="C"
              value={originalKey}
              onChange={(e) => setOriginalKey(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 4 }}>
            <TextInput
              label={t.music.bpmLabel}
              placeholder="72"
              value={bpm}
              onChange={(e) => setBpm(e.currentTarget.value.replace(/\D/g, ''))}
            />
          </Grid.Col>
        </Grid>

        <Select
          label={t.music.bandForSong}
          placeholder={t.music.noBand}
          data={bands.map((b) => ({ value: String(b.id), label: b.name }))}
          value={bandId}
          onChange={setBandId}
          clearable
          searchable
        />

        <Textarea
          label={t.music.lyricsLabel}
          value={lyrics}
          onChange={(e) => setLyrics(e.currentTarget.value)}
          minRows={3}
          maxRows={6}
        />

        <TextInput
          label={t.music.tagsLabel}
          placeholder="louvor, cifra, clássico"
          value={tags}
          onChange={(e) => setTags(e.currentTarget.value)}
        />

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={save}
            disabled={!title.trim() || !youtubeId.trim()}
          >
            {editing ? t.common.save : t.music.addSong}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Drawer,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconListCheck,
  IconMaximize,
  IconMinimize,
} from '@tabler/icons-react';
import AuthGuard from '../../../components/AuthGuard';
import ChordSyncPlayer, {
  type ChordSyncPlayerControls,
} from '../../../components/ChordSyncPlayer';
import Layout from '../../../components/Layout';
import LyricsSheet from '../../../components/LyricsSheet';
import { useLanguage } from '../../../i18n';
import { musicApi } from '../../../api/music';
import { formatMusicalKey } from '../../../utils/format';
import { dedupeChords, keyDistance, transposeChordsJson } from '../../../utils/chords';
import type { BandSetlist, BandSetlistItem, ChordItem, Song } from '../../../types';

interface QueueEntry {
  item: BandSetlistItem;
  song: Song | null;
}

type View = 'player' | 'chords' | 'plain';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDuration(seconds?: number | null): string {
  const total = Math.max(0, Math.floor((seconds ?? 0) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-');
  const i = Number(m) - 1;
  return `${Number(d)} de ${MONTHS_PT[i] ?? m} de ${y}`;
}

function baseKeyOf(song: Song): string {
  return song.original_key?.trim() || song.church_key?.trim() || '';
}

function itemKeyOf(item: BandSetlistItem, song: Song): string {
  return (
    item.custom_key?.trim() ||
    song.church_key?.trim() ||
    song.original_key?.trim() ||
    ''
  );
}

function ChordStrip({ chords }: { chords: ChordItem[] }) {
  const { t } = useLanguage();
  const notes = useMemo(
    () => chords.map((c) => formatMusicalKey(c.note_fmt || c.note)),
    [chords],
  );
  if (!notes.length) {
    return <Text c="dimmed" size="sm">{t.music.noChordsForSync}</Text>;
  }
  return (
    <Group gap={6} wrap="wrap">
      {notes.map((n, i) => (
        <Badge key={`${n}-${i}`} variant="light">
          {n}
        </Badge>
      ))}
    </Group>
  );
}

export default function SetlistPlayerPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const id = Number(router.query.id);

  const [setlist, setSetlist] = useState<BandSetlist | null>(null);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState<View>('player');
  const [stageMode, setStageMode] = useState(false);
  const [queueOpen, { open: openQueue, close: closeQueue }] = useDisclosure(false);
  const controlsRef = useRef<ChordSyncPlayerControls | null>(null);
  const currentRef = useRef(0);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const sl = await musicApi.bandSetlist(id);
      setSetlist(sl);
      const sorted = [...sl.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const loaded = await Promise.all(
        sorted.map(async (item): Promise<QueueEntry> => {
          try {
            const song = await musicApi.song(item.song);
            return { item, song };
          } catch {
            return { item, song: null };
          }
        }),
      );
      setEntries(loaded);
    } catch {
      notifications.show({ color: 'red', message: 'Setlist não encontrada.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const goTo = useCallback(
    (index: number) => {
      if (entries.length === 0) return;
      const clamped = Math.max(0, Math.min(entries.length - 1, index));
      setCurrent(clamped);
      setView('player');
    },
    [entries.length],
  );

  const goPrev = useCallback(() => {
    goTo(currentRef.current - 1);
  }, [goTo]);

  const goNext = useCallback(() => {
    goTo(currentRef.current + 1);
  }, [goTo]);

  const handleEnded = useCallback(
    (entry: QueueEntry) => {
      const hasNext = currentRef.current < entries.length - 1;
      const name = entry.song?.title ?? entry.item.song_title ?? '—';
      notifications.show({
        color: hasNext ? 'green' : 'teal',
        autoClose: 3500,
        message: name
          ? hasNext
            ? `${t.music.songEnded}: ${name}`
            : `${t.music.setlistFinished} — ${name}`
          : hasNext
            ? t.music.songEnded
            : t.music.setlistFinished,
      });
      if (hasNext) goNext();
    },
    [entries.length, goNext, t],
  );

  useHotkeys([
    ['space', (event) => {
      event.preventDefault();
      controlsRef.current?.togglePlay();
    }],
    ['ArrowRight', (event) => {
      event.preventDefault();
      goNext();
    }],
    ['shift+n', goNext],
    ['ArrowLeft', (event) => {
      event.preventDefault();
      goPrev();
    }],
    ['shift+p', goPrev],
    ['f', (event) => {
      event.preventDefault();
      setStageMode((s) => !s);
    }],
  ]);

  const entry = entries[current];
  const title = setlist?.description || setlist?.theme || (setlist ? formatDateLabel(setlist.date) : '');
  const displayKey = entry?.song
    ? formatMusicalKey(itemKeyOf(entry.item, entry.song))
    : '';

  const staticChords = useMemo(() => {
    if (!entry?.song) return [];
    const base = baseKeyOf(entry.song);
    const target = itemKeyOf(entry.item, entry.song);
    const offset = base ? keyDistance(base, target) : 0;
    return transposeChordsJson(dedupeChords(entry.song.chords_json ?? []), offset);
  }, [entry]);

  if (loading) {
    return (
      <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
        <Layout>
          <Center py="xl"><Loader /></Center>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard roles={['PASTOR', 'SECRETARIA', 'LOUVOR', 'MUSICO']}>
      <Layout expanded={stageMode}>
        {setlist ? (
          <>
            <Card withBorder p="md" mb="md">
              <Stack gap="md">
                <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                  <Group gap="xs" wrap="wrap">
                    <Button
                      variant="default"
                      size="sm"
                      leftSection={<IconArrowLeft size={16} />}
                      onClick={() => void router.push('/setlists')}
                    >
                      {t.music.setlistsTitle}
                    </Button>
                    <Box>
                      <Text fw={700} size="lg" truncate maw="100%">
                        {title}
                      </Text>
                      <Badge variant="light" size="sm">
                        {entries.length} {t.music.songCountLabel}
                      </Badge>
                    </Box>
                  </Group>

                  <Group gap={6} wrap="nowrap">
                    <Tooltip label={t.music.playerQueue}>
                      <ActionIcon
                        variant="light"
                        size="lg"
                        aria-label={t.music.playerQueue}
                        onClick={openQueue}
                      >
                        <IconListCheck size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip
                      label={stageMode ? t.music.playerExitFullscreen : t.music.playerFullscreen}
                    >
                      <ActionIcon
                        variant="light"
                        size="lg"
                        aria-label={stageMode ? t.music.playerExitFullscreen : t.music.playerFullscreen}
                        onClick={() => setStageMode((s) => !s)}
                      >
                        {stageMode ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                <Group justify="center" align="center" gap="md" wrap="wrap">
                  <Tooltip label={t.music.playerPrev}>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="xl"
                      disabled={current === 0}
                      aria-label={t.music.playerPrev}
                      onClick={goPrev}
                    >
                      <IconChevronLeft size={22} />
                    </ActionIcon>
                  </Tooltip>

                  <Box ta="center" miw={240} maw={560} style={{ flex: 1 }}>
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                      {t.music.playerSongOf
                        .replace('{current}', String(current + 1))
                        .replace('{total}', String(Math.max(entries.length, 1)))}
                    </Text>
                    <Text fw={700} size="lg" truncate>
                      {entry?.song?.title ?? entry?.item.song_title ?? '—'}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {entry?.song?.artist ?? ''}
                    </Text>
                    {entry?.song && displayKey ? (
                      <Badge variant="light" color="grape" size="sm">
                        {t.music.transposeLabel}: {displayKey}
                      </Badge>
                    ) : null}
                  </Box>

                  <Tooltip label={t.music.playerNext}>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="xl"
                      disabled={entries.length === 0 || current === entries.length - 1}
                      aria-label={t.music.playerNext}
                      onClick={goNext}
                    >
                      <IconChevronRight size={22} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Stack>
            </Card>

            {entries.length === 0 ? (
              <Card withBorder p="xl">
                <Text c="dimmed" ta="center">{t.music.setlistEmpty}</Text>
              </Card>
            ) : (
              <>
                <Group justify="center" mb="md">
                  <SegmentedControl
                    value={view}
                    onChange={(v) => setView(v as View)}
                    data={[
                      { value: 'player', label: t.music.playerTab },
                      { value: 'chords', label: t.music.lyricsWithChordsLabel },
                      { value: 'plain', label: t.music.lyricsPlainLabel },
                    ]}
                  />
                </Group>

                {entry?.song ? (
                  view === 'player' ? (
                    entry.song.youtube_id ? (
                      <ChordSyncPlayer
                        key={entry.song.id}
                        youtubeId={entry.song.youtube_id}
                        chords={entry.song.chords_json ?? []}
                        title={entry.song.title}
                        originalKey={entry.song.original_key}
                        churchKey={entry.song.church_key}
                        bpm={entry.song.bpm}
                        timeSignature={entry.song.time_signature}
                        stageMode={stageMode}
                        initialTranspose={
                          entry.song.original_key || entry.song.church_key
                            ? keyDistance(
                                baseKeyOf(entry.song),
                                itemKeyOf(entry.item, entry.song),
                              )
                            : 0
                        }
                        onEnded={() => handleEnded(entry)}
                        controlsRef={controlsRef}
                      />
                    ) : (
                      <Card withBorder p="md">
                        <Stack gap="sm">
                          <Text size="sm" c="dimmed">
                            {t.music.noYoutubeInSetlist}
                          </Text>
                          <ChordStrip chords={staticChords} />
                          <Divider />
                          <LyricsSheet lyrics={entry.song.lyrics ?? ''} />
                        </Stack>
                      </Card>
                    )
                  ) : view === 'chords' ? (
                    <Card withBorder p="md">
                      <Stack gap="sm">
                        <Text fw={600} size="sm">
                          {t.music.lyricsWithChordsLabel}
                        </Text>
                        <ChordStrip chords={staticChords} />
                        <Divider />
                        <LyricsSheet lyrics={entry.song.lyrics ?? ''} />
                      </Stack>
                    </Card>
                  ) : (
                    <LyricsSheet lyrics={entry.song.lyrics ?? ''} />
                  )
                ) : (
                  <Card withBorder p="xl">
                    <Stack gap="sm" align="center">
                      <Text c="dimmed" ta="center">
                        {t.music.songErrorInSetlist}
                      </Text>
                      <Text size="sm" fw={600}>
                        {entry?.item.song_title ?? '—'}
                      </Text>
                    </Stack>
                  </Card>
                )}
              </>
            )}
          </>
        ) : null}
      </Layout>

      <Drawer
        opened={queueOpen}
        onClose={closeQueue}
        title={t.music.setlistQueue}
        position="right"
        size="md"
      >
        <Stack gap="xs">
          {entries.map((e, i) => {
            const key = e.song ? formatMusicalKey(itemKeyOf(e.item, e.song)) : '';
            const active = i === current;
            return (
              <UnstyledButton
                key={e.item.id}
                onClick={() => {
                  goTo(i);
                  closeQueue();
                }}
                style={{
                  width: '100%',
                  borderRadius: 'var(--mantine-radius-md)',
                  border: active
                    ? '1px solid var(--mantine-primary-color-filled)'
                    : '1px solid var(--mantine-color-default-border)',
                  backgroundColor: active
                    ? 'var(--mantine-primary-color-light)'
                    : 'transparent',
                  padding: '8px 10px',
                }}
              >
                <Group gap="sm" wrap="nowrap" align="center">
                  <Badge variant={active ? 'filled' : 'light'} color={active ? 'blue' : 'gray'} size="lg">
                    {i + 1}
                  </Badge>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={active ? 700 : 500} truncate>
                      {e.song?.title ?? e.item.song_title ?? '—'}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {e.song?.artist ?? ''}
                    </Text>
                  </Box>
                </Group>
                <Group gap={4} mt={6} wrap="wrap">
                  {key ? (
                    <Badge variant="light" color="violet" size="sm">
                      {key}
                    </Badge>
                  ) : null}
                  {e.song && e.song.bpm ? (
                    <Badge variant="light" size="sm">
                      {e.song.bpm} {t.music.bpmLabel}
                    </Badge>
                  ) : null}
                  {e.song && e.song.duration_seconds != null ? (
                    <Badge variant="light" size="sm">
                      {t.music.queueDuration}: {formatDuration(e.song.duration_seconds)}
                    </Badge>
                  ) : null}
                </Group>
              </UnstyledButton>
            );
          })}
          {entries.length === 0 ? (
            <Text c="dimmed" ta="center">
              {t.music.setlistEmpty}
            </Text>
          ) : null}
        </Stack>
      </Drawer>
    </AuthGuard>
  );
}
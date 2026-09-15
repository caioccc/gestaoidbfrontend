import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Card,
  Grid,
  Group,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-react';
import ReactPlayer from 'react-player';
import { useLanguage } from '../i18n';
import { chordAt } from '../utils/chords';
import type { ChordItem } from '../types';

interface ChordSyncPlayerProps {
  youtubeId: string;
  chords: ChordItem[];
  title?: string;
}

function formatTime(s: number): string {
  const total = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function ChordSyncPlayer({ youtubeId, chords, title }: ChordSyncPlayerProps) {
  const { t } = useLanguage();
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [active, setActive] = useState(-1);

  const canSync = chords.length > 0;
  const currentMatch = useMemo(() => chordAt(chords, progress), [chords, progress]);

  useEffect(() => {
    if (canSync) setActive(currentMatch);
  }, [canSync, currentMatch]);

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    setProgress(e.currentTarget.currentTime || 0);
  }, []);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    setDuration(Number.isFinite(d) ? d : 0);
  }, []);

  const handleEnded = useCallback(() => setPlaying(false), []);

  const seekTo = useCallback((value: number) => {
    if (playerRef.current) playerRef.current.currentTime = value;
    setProgress(value);
  }, []);

  const skip = useCallback((delta: number) => {
    seekTo(Math.max(0, Math.min(duration || 0, progress + delta)));
  }, [progress, duration, seekTo]);

  const currentIdx = active >= 0 ? active : 0;

  const focusCards = useMemo(() => {
    if (!chords.length) return [];
    const slots: { chord: ChordItem; index: number; role: 'focus' | 'small' }[] = [];
    const prev = currentIdx - 1;
    if (prev >= 0) slots.push({ chord: chords[prev], index: prev, role: 'small' });
    if (currentIdx < chords.length) {
      slots.push({ chord: chords[currentIdx], index: currentIdx, role: 'focus' });
    }
    for (let i = currentIdx + 1; i <= currentIdx + 2 && i < chords.length; i += 1) {
      slots.push({ chord: chords[i], index: i, role: 'small' });
    }
    return slots;
  }, [chords, currentIdx]);

  const chordCard = ({ chord, index, role }: {
    chord: ChordItem;
    index: number;
    role: 'focus' | 'small';
  }) => (
    <button
      key={`${index}-${chord.note_fmt}`}
      type="button"
      data-chord-index={index}
      onClick={() => {
        if (chord.start != null) seekTo(chord.start);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: role === 'focus' ? 10 : 6,
        width: role === 'focus' ? 176 : 104,
        minHeight: role === 'focus' ? 200 : 132,
        border: role === 'focus'
          ? '2px solid var(--mantine-color-violet-5)'
          : '1px solid var(--mantine-color-gray-3)',
        background: role === 'focus'
          ? 'color-mix(in srgb, var(--mantine-color-violet-2) 40%, white)'
          : 'var(--mantine-color-gray-0)',
        borderRadius: 12,
        padding: role === 'focus' ? 12 : 8,
        cursor: canSync ? 'pointer' : 'default',
        opacity: role === 'focus' ? 1 : 0.55,
        boxShadow: role === 'focus' ? '0 6px 18px rgba(102, 16, 242, 0.25)' : 'none',
        transition: 'transform 150ms ease, opacity 150ms ease',
      }}
    >
      <Text
        fw={700}
        size={role === 'focus' ? 'xl' : 'sm'}
        c={index === active ? 'violet' : undefined}
      >
        {chord.note_fmt || chord.note}
      </Text>
      {chord.image ? (
        <Box
          style={{
            width: role === 'focus' ? 96 : 64,
            height: role === 'focus' ? 72 : 48,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: 'var(--mantine-color-gray-2)',
          }}
        >
          <img
            src={chord.image}
            alt={chord.note_fmt || chord.note}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Box>
      ) : null}
      <Text size={role === 'focus' ? 'xs' : 'xs'} c="dimmed" style={{ fontSize: role === 'focus' ? undefined : 10 }}>
        {formatTime(chord.start ?? 0)}
      </Text>
    </button>
  );

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, md: 5 }} order={{ base: 2, md: 1 }}>
        <Stack gap="xs">
          <Box
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%',
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#000',
            }}
          >
            <ReactPlayer
              ref={playerRef}
              src={`https://www.youtube.com/watch?v=${youtubeId}`}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
              playing={playing}
              controls={false}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />
          </Box>

          <Group gap={4} justify="center">
            <Tooltip label={t.music.back10}>
              <ActionIcon variant="light" size="lg" onClick={() => skip(-10)}>
                <IconPlayerSkipBack size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={playing ? t.music.playerPause : t.music.playerPlay}>
              <ActionIcon
                variant="filled"
                color="violet"
                size="lg"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t.music.forward10}>
              <ActionIcon variant="light" size="lg" onClick={() => skip(10)}>
                <IconPlayerSkipForward size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap="sm" px={4}>
            <Text size="xs" c="dimmed" w={44}>{formatTime(progress)}</Text>
            <Slider
              style={{ flex: 1 }}
              size="xs"
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              value={Math.min(progress, Math.max(duration, 1))}
              onChange={seekTo}
              onChangeEnd={seekTo}
            />
            <Text size="xs" c="dimmed" w={44} ta="right">{formatTime(duration)}</Text>
          </Group>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 7 }} order={{ base: 1, md: 2 }}>
        <Card withBorder p="md">
          {canSync ? (
            <Stack gap="md">
              <Box
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                  overflowX: 'auto',
                  padding: '4px 2px',
                }}
              >
                {focusCards.map(chordCard)}
              </Box>
              <Text size="xs" c="dimmed" ta="center" truncate>
                {title ? `${title} — ` : ''}{t.music.transposeHint}
              </Text>
            </Stack>
          ) : (
            <Text c="dimmed" p="lg" ta="center">{t.music.noChordsForSync}</Text>
          )}
        </Card>
      </Grid.Col>
    </Grid>
  );
}
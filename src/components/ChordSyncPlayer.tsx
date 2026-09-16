import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconMaximize,
  IconMinimize,
  IconMinus,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlus,
  IconRotate2,
} from '@tabler/icons-react';
import ReactPlayer from 'react-player';
import { useLanguage } from '../i18n';
import {
  chordAt,
  keyDistance,
  transposeChordsJson,
  transposeKey,
} from '../utils/chords';
import type { ChordItem } from '../types';
import ChordTimeline from './ChordTimeline';
import PlayerToolsBar from './PlayerToolsBar';

interface ChordSyncPlayerProps {
  youtubeId: string;
  chords: ChordItem[];
  title?: string;
  originalKey?: string;
  churchKey?: string;
  bpm?: number | null;
  timeSignature?: string;
  stageMode?: boolean;
  onToggleStageMode?: () => void;
}

function formatTime(s: number): string {
  const total = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

type InstrumentMode = 'diagrams' | 'simple';

export default function ChordSyncPlayer({
  youtubeId,
  chords,
  title,
  originalKey,
  churchKey,
  bpm,
  timeSignature,
  stageMode = false,
  onToggleStageMode,
}: ChordSyncPlayerProps) {
  const { t } = useLanguage();
  const playerRef = React.useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [active, setActive] = useState(-1);
  const [transpose, setTranspose] = useState(0);
  const [instrument, setInstrument] = useState<InstrumentMode>('diagrams');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [metronomeOn, setMetronomeOn] = useState(false);

  const transposedChords = useMemo(
    () => transposeChordsJson(chords, transpose),
    [chords, transpose],
  );
  const canSync = transposedChords.length > 0;
  const baseKey = (originalKey || churchKey || '').trim();
  const targetOriginal = keyDistance(baseKey, originalKey || '');
  const targetChurch = keyDistance(baseKey, churchKey || '');
  const displayedKey = transposeKey(baseKey, transpose);

  const currentMatch = useMemo(
    () => chordAt(transposedChords, progress),
    [transposedChords, progress],
  );

  useEffect(() => {
    if (canSync) setActive(currentMatch);
  }, [canSync, currentMatch]);

  const seekTo = useCallback((value: number) => {
    const el = playerRef.current;
    if (el) {
      try {
        el.currentTime = value;
      } catch {
        /* ignore */
      }
    }
    setProgress(value);
  }, []);

  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const now = e.currentTarget.currentTime || 0;
      setProgress(now);
      if (loopA != null && loopB != null && loopB > loopA && now >= loopB) {
        seekTo(loopA + 0.02);
      }
    },
    [loopA, loopB, seekTo],
  );

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    setDuration(Number.isFinite(d) ? d : 0);
  }, []);

  const handleEnded = useCallback(() => setPlaying(false), []);

  const handlePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    const el = playerRef.current;
    if (el) {
      try {
        el.playbackRate = rate;
      } catch {
        /* ignore */
      }
    }
  }, []);

  const skip = useCallback(
    (delta: number) => {
      seekTo(Math.max(0, Math.min(duration || 0, progress + delta)));
    },
    [progress, duration, seekTo],
  );

  const markLoopA = useCallback(() => {
    setLoopA(progress);
    setLoopB(null);
  }, [progress]);

  const markLoopB = useCallback(() => {
    if (loopA != null) setLoopB(progress);
  }, [loopA, progress]);

  const clearLoop = useCallback(() => {
    setLoopA(null);
    setLoopB(null);
  }, []);

  const currentIdx = active >= 0 ? active : 0;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="xs">
        <Group gap={6} wrap="wrap">
          <Button
            size="xs"
            variant={transpose === targetOriginal && !!originalKey ? 'filled' : 'light'}
            color={transpose === targetOriginal ? 'grape' : undefined}
            disabled={!originalKey}
            onClick={() => setTranspose(targetOriginal)}
          >
            {t.music.originalKeyLabel}
          </Button>
          {/* <Button
            size="xs"
            variant={transpose === targetChurch && !!churchKey ? 'filled' : 'light'}
            color={transpose === targetChurch ? 'violet' : undefined}
            disabled={!churchKey}
            onClick={() => setTranspose(targetChurch)}
          >
            {t.music.churchKeyLabel}
          </Button> */}
          <Tooltip label={t.music.transposeDown}>
            <ActionIcon
              variant="light"
              onClick={() => setTranspose((x) => Math.max(x - 1, -7))}
              disabled={transpose <= -7}
            >
              <IconMinus size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t.music.transposeUp}>
            <ActionIcon
              variant="light"
              onClick={() => setTranspose((x) => Math.min(x + 1, 7))}
              disabled={transpose >= 7}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
          <Badge variant="light" color="grape" size="lg" tt="none">
            {t.music.transposeLabel}: {displayedKey || '—'}
            {transpose !== 0
              ? ` (${transpose > 0 ? '+' : ''}${transpose} ${t.music.semitones})`
              : ''}
          </Badge>
          {transpose !== 0 ? (
            <Tooltip label={t.music.transposeReset}>
              <ActionIcon variant="subtle" color="gray" onClick={() => setTranspose(0)}>
                <IconRotate2 size={16} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>

        <Group gap={6} wrap="nowrap">
          <SegmentedControl
            size="xs"
            value={instrument}
            onChange={(v) => setInstrument(v as InstrumentMode)}
            data={[
              { value: 'diagrams', label: t.music.guitarDiagrams },
              { value: 'simple', label: t.music.simpleChords },
            ]}
          />
          {onToggleStageMode ? (
            <Tooltip label={stageMode ? t.music.exitStageMode : t.music.stageMode}>
              <ActionIcon
                variant={stageMode ? 'filled' : 'light'}
                color="blue"
                size="lg"
                onClick={onToggleStageMode}
              >
                {stageMode ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>
      </Group>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: stageMode ? 12 : 5 }}>
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
                playbackRate={playbackRate}
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
              <Text size="xs" c="dimmed" w={44} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(progress)}
              </Text>
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
              <Text size="xs" c="dimmed" w={44} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(duration)}
              </Text>
            </Group>

            <PlayerToolsBar
              progress={progress}
              playbackRate={playbackRate}
              onPlaybackRateChange={handlePlaybackRate}
              loopA={loopA}
              loopB={loopB}
              onMarkA={markLoopA}
              onMarkB={markLoopB}
              onClearLoop={clearLoop}
              bpm={bpm ?? null}
              timeSignature={timeSignature}
              metronomeOn={metronomeOn}
              onToggleMetronome={() => setMetronomeOn((s) => !s)}
            />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: stageMode ? 12 : 7 }}>
          <Card withBorder p="md">
            {canSync ? (
              <Stack gap={8}>
                <ChordTimeline
                  chords={transposedChords}
                  activeIndex={currentIdx}
                  progress={progress}
                  simpleMode={instrument === 'simple'}
                  onSeek={seekTo}
                />
                <Text size="xs" c="dimmed" ta="center" truncate>
                  {title ? `${title} — ` : ''}
                  {t.music.transposeHint}
                </Text>
              </Stack>
            ) : (
              <Text c="dimmed" p="lg" ta="center">
                {t.music.noChordsForSync}
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
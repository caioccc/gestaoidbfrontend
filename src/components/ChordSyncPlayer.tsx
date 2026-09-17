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
} from '@tabler/icons-react';
import ReactPlayer from 'react-player';
import { useLanguage } from '../i18n';
import {
  chordAt,
  dedupeChords,
  transposeChordsJson,
  transposeKey,
} from '../utils/chords';
import type { ChordItem } from '../types';
import { formatMusicalKey } from '../utils/format';
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
  initialTranspose?: number;
  onEnded?: () => void;
  controlsRef?: React.RefObject<ChordSyncPlayerControls | null>;
}

export interface ChordSyncPlayerControls {
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  skip: (delta: number) => void;
  seekTo: (time: number) => void;
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
  initialTranspose = 0,
  onEnded,
  controlsRef,
}: ChordSyncPlayerProps) {
  const { t } = useLanguage();
  const playerRef = React.useRef<HTMLVideoElement | null>(null);
  const progressRef = React.useRef(0);
  const loopSeekAtRef = React.useRef(0);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [active, setActive] = useState(-1);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [instrument, setInstrument] = useState<InstrumentMode>('diagrams');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [metronomeOn, setMetronomeOn] = useState(false);

  const transposedChords = useMemo(
    () => transposeChordsJson(chords, transpose),
    [chords, transpose],
  );
  const displayChords = useMemo(() => dedupeChords(transposedChords), [transposedChords]);
  const canSync = displayChords.length > 0;
  const baseKey = (originalKey || churchKey || '').trim();
  const isOriginalKey = !!originalKey && transpose === 0;
  const displayedKey = formatMusicalKey(transposeKey(baseKey, transpose));

  const currentMatch = useMemo(
    () => chordAt(displayChords, progress),
    [displayChords, progress],
  );

  useEffect(() => {
    if (canSync) setActive(currentMatch);
  }, [canSync, currentMatch]);

  const seekTo = useCallback((value: number) => {
    progressRef.current = value;
    setProgress(value);
    const el = playerRef.current;
    if (el) {
      try {
        el.currentTime = value;
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    const tick = () => {
      const el = playerRef.current;
      if (el) {
        const now = el.currentTime || 0;
        if (Math.abs(now - progressRef.current) >= 0.03) {
          progressRef.current = now;
          setProgress(now);
        }
        setDuration((d) => (d > 0 ? d : Number.isFinite(el.duration) ? el.duration : 0));
        if (loopA != null && loopB != null && loopB > loopA && now >= loopB) {
          const stamp = Date.now();
          if (stamp - loopSeekAtRef.current > 800) {
            loopSeekAtRef.current = stamp;
            seekTo(loopA + 0.02);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loopA, loopB, seekTo]);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    setDuration(Number.isFinite(d) ? d : 0);
  }, []);

  const syncFromElement = useCallback(() => {
    const el = playerRef.current;
    if (el) {
      const now = el.currentTime || 0;
      progressRef.current = now;
      setProgress(now);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    syncFromElement();
    onEnded?.();
  }, [syncFromElement, onEnded]);

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
    loopSeekAtRef.current = 0;
    setLoopA(progressRef.current);
    setLoopB(null);
  }, []);

  const markLoopB = useCallback(() => {
    loopSeekAtRef.current = 0;
    if (loopA != null) setLoopB(progressRef.current);
  }, [loopA]);

  const clearLoop = useCallback(() => {
    loopSeekAtRef.current = 0;
    setLoopA(null);
    setLoopB(null);
  }, []);

  const currentIdx = active >= 0 ? active : 0;

  useEffect(() => {
    if (!controlsRef) return undefined;
    controlsRef.current = {
      togglePlay: () => setPlaying((p) => !p),
      setPlaying,
      skip,
      seekTo,
    };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, skip, seekTo]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="xs">
        <Group gap={6} wrap="wrap">
          <Button
            size="xs"
            variant={isOriginalKey ? 'filled' : 'light'}
            color={isOriginalKey ? 'grape' : undefined}
            disabled={!originalKey}
            onClick={() => setTranspose(0)}
          >
            {t.music.originalKeyLabel}
          </Button>
          <Group gap={0} wrap="nowrap">
            <Tooltip label={t.music.transposeDown}>
              <ActionIcon
                variant="light"
                size="lg"
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                onClick={() => setTranspose((x) => Math.max(x - 1, -7))}
                disabled={transpose <= -7}
              >
                <IconMinus size={16} />
              </ActionIcon>
            </Tooltip>
            <Badge
              variant="light"
              color="grape"
              size="lg"
              tt="none"
              radius={0}
              styles={{ root: { height: 34, display: 'flex', alignItems: 'center' } }}
            >
              <Tooltip label={transpose !== 0 ? `${t.music.transposeLabel}: ${transpose > 0 ? '+' : ''}${transpose} ${t.music.semitones}` : t.music.transposeLabel}>
                <span>
                  {displayedKey || '—'}
                  {transpose !== 0 ? ` (${transpose > 0 ? '+' : ''}${transpose})` : ''}
                </span>
              </Tooltip>
            </Badge>
            <Tooltip label={t.music.transposeUp}>
              <ActionIcon
                variant="light"
                size="lg"
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                onClick={() => setTranspose((x) => Math.min(x + 1, 7))}
                disabled={transpose >= 7}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
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
                onPause={() => {
                  setPlaying(false);
                  syncFromElement();
                }}
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
                  chords={displayChords}
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
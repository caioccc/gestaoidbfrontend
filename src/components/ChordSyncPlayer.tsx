import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Drawer,
  Grid,
  Group,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
  getDefaultZIndex,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustmentsHorizontal,
  IconMaximize,
  IconMinimize,
  IconMinus,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlus,
  IconVideo,
  IconVideoOff,
} from '@tabler/icons-react';
import ReactPlayer from 'react-player';
import { useLanguage } from '../i18n';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  chordAt,
  dedupeChords,
  transposeChordsJson,
  transposeKey,
} from '../utils/chords';
import type { ChordItem } from '../types';
import { formatMusicalKey } from '../utils/format';
import ChordTimeline from './ChordTimeline';
import SongChordsTimeline from './SongChordsTimeline';
import PlayerToolsBar, { TOUCH_TARGET, touchStyles } from './PlayerToolsBar';

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

type DisplayMode = 'diagrams' | 'simple' | 'grade';

/**
 * Padding horizontal do `AppShell.Main` (`padding="md"` = 1rem).
 *
 * O mini player usa esse valor para encostar nas bordas da tela em vez de
 * deixar uma "franja" de 16px dos dois lados.
 */
const APP_SHELL_PADDING_PX = 16;

const TABULAR_NUMS = { fontVariantNumeric: 'tabular-nums' } as const;

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
  const isMobile = useIsMobile();
  const playerRef = React.useRef<HTMLVideoElement | null>(null);
  const progressRef = React.useRef(0);
  const loopSeekAtRef = React.useRef(0);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [active, setActive] = useState(-1);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('diagrams');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [toolsOpen, { open: openTools, close: closeTools }] = useDisclosure(false);

  // No celular o video 16:9 come metade da viewport e empurra os controles de
  // audio para fora da tela, entao ele inicia recolhido (modo "so audio"). No
  // desktop o espaco sobra e ele inicia aberto. A decisao fica no primeiro
  // effect porque `useIsMobile` devolve `false` durante o SSR.
  const videoInitRef = useRef(false);
  useEffect(() => {
    if (videoInitRef.current) return;
    videoInitRef.current = true;
    setVideoOpen(!isMobile);
  }, [isMobile]);

  const transposedChords = useMemo(
    () => transposeChordsJson(chords, transpose),
    [chords, transpose],
  );
  const displayChords = useMemo(() => dedupeChords(transposedChords), [transposedChords]);
  const canSync = displayChords.length > 0;
  const baseKey = (originalKey || churchKey || '').trim();
  const isOriginalKey = !!originalKey && transpose === 0;
  const displayedKey = formatMusicalKey(transposeKey(baseKey, transpose));

  const beatsPerBar = useMemo(() => {
    const num = Number.parseInt((timeSignature || '').trim().split('/')[0] || '', 10);
    return Number.isFinite(num) && num > 0 ? num : 4;
  }, [timeSignature]);

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

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const activeChordLabel =
    canSync && currentMatch >= 0
      ? displayChords[currentMatch]?.note_fmt || displayChords[currentMatch]?.note || ''
      : '';

  const durationMax = Math.max(duration, 1);
  const progressClamped = Math.min(progress, durationMax);

  /**
   * O iframe fica sempre montado: esconder o video com `Collapse` (altura zero)
   * e nao com `display: none` evita que o ReactPlayer remonte e reinicie a
   * reproducao a cada toque no botao de mostrar/ocultar.
   */
  const videoFrame = (
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
  );

  const seekSlider = (
    <Slider
      style={{ flex: 1, minWidth: 0 }}
      size={isMobile ? 'md' : 'xs'}
      min={0}
      max={durationMax}
      step={0.1}
      value={progressClamped}
      onChange={seekTo}
      onChangeEnd={seekTo}
      aria-label={t.music.playerTransport}
    />
  );

  const timeLabel = (value: number, align: 'left' | 'right') => (
    <Text
      size="xs"
      c="dimmed"
      w={44}
      ta={align}
      style={TABULAR_NUMS}
    >
      {formatTime(value)}
    </Text>
  );

  const chordsCard = (
    <Card withBorder p={isMobile ? 6 : 'md'} style={{ width: '100%' }}>
      {canSync ? (
        <Stack gap={8}>
          {displayMode === 'grade' ? (
            <SongChordsTimeline
              chords={displayChords}
              currentTime={progress}
              bpm={bpm ?? null}
              beatsPerBar={beatsPerBar}
              onSeek={seekTo}
            />
          ) : (
            <ChordTimeline
              chords={displayChords}
              activeIndex={currentIdx}
              progress={progress}
              simpleMode={displayMode === 'simple'}
              onSeek={seekTo}
            />
          )}
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
  );

  const transportButtonSize = isMobile ? TOUCH_TARGET : 'lg';

  const transportControls = (
    <Group gap={4} justify="center" wrap="nowrap">
      <Tooltip label={t.music.back10}>
        <ActionIcon
          variant="light"
          size={transportButtonSize}
          onClick={() => skip(-10)}
          aria-label={t.music.back10}
        >
          <IconPlayerSkipBack size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={playing ? t.music.playerPause : t.music.playerPlay}>
        <ActionIcon
          variant="filled"
          color="violet"
          size={isMobile ? TOUCH_TARGET + 8 : 'lg'}
          onClick={togglePlay}
          aria-label={playing ? t.music.playerPause : t.music.playerPlay}
        >
          {playing ? <IconPlayerPause size={22} /> : <IconPlayerPlay size={22} />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t.music.forward10}>
        <ActionIcon
          variant="light"
          size={transportButtonSize}
          onClick={() => skip(10)}
          aria-label={t.music.forward10}
        >
          <IconPlayerSkipForward size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  const stageModeButton = (compact: boolean) =>
    onToggleStageMode ? (
      <Tooltip label={stageMode ? t.music.exitStageMode : t.music.stageMode}>
        <Button
          fullWidth={compact}
          variant={stageMode ? 'filled' : 'light'}
          color="blue"
          size={compact ? 'md' : 'sm'}
          style={compact ? touchStyles.root : undefined}
          onClick={onToggleStageMode}
          aria-pressed={stageMode}
          leftSection={
            stageMode ? <IconMinimize size={18} /> : <IconMaximize size={18} />
          }
        >
          {stageMode ? t.music.exitStageMode : t.music.stageMode}
        </Button>
      </Tooltip>
    ) : null;

  // Stepper de tom: [Tom original] [−] [TOM] [+]. No celular os quatro
  // alvos disputam a largura da tela, entao os dois botoes de texto/badge
  // esticam (flex: 1) e os de seta ficam em 44px fixos.
  const keyStepper = (compact: boolean) => (
    <Stack gap={4} style={compact ? { width: '100%' } : undefined}>
      <Text size="xs" c="dimmed" fw={600}>
        {t.music.playerKeyLabel}
      </Text>
      <Group gap={compact ? 4 : 0} wrap="nowrap">
        <Tooltip label={t.music.transposeReset}>
          <Button
            size={compact ? 'md' : 'xs'}
            variant={isOriginalKey ? 'filled' : 'light'}
            color={isOriginalKey ? 'grape' : undefined}
            disabled={!originalKey}
            onClick={() => setTranspose(0)}
            style={compact ? { ...touchStyles.root, flex: 1, minWidth: 0 } : undefined}
          >
            <Text size="xs" fw={700} truncate style={{ minWidth: 0 }}>
              {t.music.originalKeyLabel}
            </Text>
          </Button>
        </Tooltip>
        <Tooltip label={t.music.transposeDown}>
          <ActionIcon
            variant="light"
            size={compact ? TOUCH_TARGET : 'lg'}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            onClick={() => setTranspose((x) => Math.max(x - 1, -7))}
            disabled={transpose <= -7}
            aria-label={t.music.transposeDown}
          >
            <IconMinus size={18} />
          </ActionIcon>
        </Tooltip>
        <Badge
          variant="light"
          color="grape"
          size="lg"
          tt="none"
          radius={0}
          styles={{
            root: {
              height: compact ? TOUCH_TARGET : 34,
              minWidth: compact ? 56 : undefined,
              flex: compact ? 1 : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          }}
        >
          <Tooltip
            label={
              transpose !== 0
                ? `${t.music.transposeLabel}: ${transpose > 0 ? '+' : ''}${transpose} ${t.music.semitones}`
                : t.music.transposeLabel
            }
          >
            <span>
              {displayedKey || '—'}
              {transpose !== 0 ? ` (${transpose > 0 ? '+' : ''}${transpose})` : ''}
            </span>
          </Tooltip>
        </Badge>
        <Tooltip label={t.music.transposeUp}>
          <ActionIcon
            variant="light"
            size={compact ? TOUCH_TARGET : 'lg'}
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
            onClick={() => setTranspose((x) => Math.min(x + 1, 7))}
            disabled={transpose >= 7}
            aria-label={t.music.transposeUp}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );

  const viewControl = (compact: boolean) => (
    <Stack gap={4} style={compact ? { width: '100%' } : undefined}>
      <Text size="xs" c="dimmed" fw={600}>
        {t.music.playerViewLabel}
      </Text>
      <SegmentedControl
        fullWidth={compact}
        size={compact ? 'md' : 'xs'}
        value={displayMode}
        onChange={(v) => setDisplayMode(v as DisplayMode)}
        styles={compact ? touchStyles : undefined}
        aria-label={t.music.playerViewLabel}
        data={[
          { value: 'diagrams', label: t.music.guitarDiagrams },
          { value: 'simple', label: t.music.simpleChords },
          { value: 'grade', label: t.music.gradeRhythm },
        ]}
      />
    </Stack>
  );

  const toolsBar = (compact: boolean) => (
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
      isMobile={compact}
    />
  );

  const videoToggle = (
    <Button
      fullWidth
      variant={videoOpen ? 'light' : 'default'}
      size="md"
      style={touchStyles.root}
      onClick={() => setVideoOpen((v) => !v)}
      aria-expanded={videoOpen}
      leftSection={videoOpen ? <IconVideoOff size={18} /> : <IconVideo size={18} />}
    >
      {videoOpen ? t.music.hideVideo : t.music.showVideo}
    </Button>
  );

  /**
   * Mini player do rodape.
   *
   * `position: sticky` e nao `fixed`: ele gruda no rodape da viewport apenas
   * enquanto o player esta em tela e nunca cobre o conteudo, porque continua
   * ocupando espaco no fluxo normal.
   */
  const miniPlayer = (
    <Paper
      withBorder
      radius={0}
      p="xs"
      // Leitores de tela nao anunciam "12:34 / Am" sem um rotulo: o acorde
      // atual e a informacao principal do musicianista durante o culto.
      aria-label={`${t.music.playerTransport} — ${t.music.playerCurrentChord}: ${
        activeChordLabel || displayedKey || '—'
      }`}
      style={{
        position: 'sticky',
        bottom: 0,
        // `getDefaultZIndex('app')` (100) e o mesmo nivel do `AppShell.Header`.
        // Com 30 a barra "vaza" para fora do Main e o rodape do AppShell
        // (mesmo nivel 100, porem declarado antes no DOM) a cobre.
        zIndex: getDefaultZIndex('app'),
        marginInline: -APP_SHELL_PADDING_PX,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        backgroundColor: 'var(--mantine-color-body)',
        boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.14)',
      }}
    >
      <Group gap={6} wrap="nowrap" align="center">
        <Tooltip label={t.music.back10}>
          <ActionIcon
            variant="subtle"
            size={TOUCH_TARGET}
            onClick={() => skip(-10)}
            aria-label={t.music.back10}
          >
            <IconPlayerSkipBack size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={playing ? t.music.playerPause : t.music.playerPlay}>
          <ActionIcon
            variant="filled"
            color="violet"
            size={TOUCH_TARGET + 8}
            onClick={togglePlay}
            aria-label={playing ? t.music.playerPause : t.music.playerPlay}
          >
            {playing ? <IconPlayerPause size={24} /> : <IconPlayerPlay size={24} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t.music.forward10}>
          <ActionIcon
            variant="subtle"
            size={TOUCH_TARGET}
            onClick={() => skip(10)}
            aria-label={t.music.forward10}
          >
            <IconPlayerSkipForward size={20} />
          </ActionIcon>
        </Tooltip>

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap={6}>
            {timeLabel(progress, 'left')}
            <Text
              size="sm"
              fw={800}
              c={activeChordLabel ? 'grape' : 'dimmed'}
              truncate
              maw="45%"
              // `minWidth: 0` e obrigatorio para o `truncate` funcionar dentro
              // de um flex container sem estourar a barra.
              style={{ minWidth: 0 }}
            >
              {activeChordLabel || displayedKey || '—'}
            </Text>
            {timeLabel(duration, 'right')}
          </Group>
          {seekSlider}
        </Stack>

        <Tooltip label={t.music.playerMoreControls}>
          <ActionIcon
            variant="light"
            size={TOUCH_TARGET}
            onClick={openTools}
            aria-label={t.music.playerMoreControls}
          >
            <IconAdjustmentsHorizontal size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );

  return (
    <>
      <Stack gap="md">
        {isMobile ? (
          <Stack gap="sm">
            <Stack gap="xs">
              <Collapse
                expanded={videoOpen || stageMode}
                keepMounted
                keepMountedMode="display-none"
              >
                {videoFrame}
              </Collapse>
              {!stageMode ? videoToggle : null}
            </Stack>
            {chordsCard}
            {miniPlayer}
          </Stack>
        ) : (
          <>
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="xs">
              {keyStepper(false)}
              <Group gap="xs" wrap="nowrap" align="flex-end">
                {viewControl(false)}
                {stageModeButton(false)}
              </Group>
            </Group>

            <Grid gap="md">
              <Grid.Col span={{ base: 12, md: stageMode ? 12 : 5 }}>
                <Stack gap="xs">
                  {videoFrame}
                  {transportControls}
                  <Group gap="sm" px={4} wrap="nowrap">
                    {timeLabel(progress, 'left')}
                    {seekSlider}
                    {timeLabel(duration, 'right')}
                  </Group>
                  {toolsBar(false)}
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: stageMode ? 12 : 7 }}>
                {chordsCard}
              </Grid.Col>
            </Grid>
          </>
        )}
      </Stack>

      <Drawer
        opened={isMobile && toolsOpen}
        onClose={closeTools}
        position="bottom"
        title={t.music.playerMoreControls}
        // `size` so resolve chaves de tema; a altura vem do `--drawer-height`
        // para acompanhar a viewport do celular (dvh) em vez de um px fixo.
        vars={() => ({ root: { '--drawer-height': 'min(80dvh, 620px)' } })}
        styles={{
          body: { paddingBottom: 'max(12px, env(safe-area-inset-bottom))' },
        }}
      >
        <Stack gap="md">
          {keyStepper(true)}
          {viewControl(true)}
          {toolsBar(true)}
          {stageModeButton(true)}
          <Button
            fullWidth
            variant="default"
            size="md"
            style={touchStyles.root}
            onClick={closeTools}
          >
            {t.common.close}
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}


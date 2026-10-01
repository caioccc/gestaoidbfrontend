import React from 'react';
import { ActionIcon, Box, Button, Group, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { useMetronome } from '../hooks/useMetronome';

/**
 * Alvo minimo de toque (WCAG 2.5.5 / Material): 44x44px.
 *
 * O `size` do Mantine resolve para `var(--ai-size-xl)` / `var(--button-height-xl)`
 * e para dezoito/VARCHAR px, bem abaixo do minimo. Passar um numero cru no
 * `size` cai no `getSize()` do Mantine, que transforma em rem — por isso o
 * override vai por `styles`, e nao por `size`.
 */
export const TOUCH_TARGET = 44;

/**
 * `min-height` compartilhado por `ActionIcon`, `Button` e `SegmentedControl`
 * no layout compacto. Aplicado via `styles` porque o `size` desses
 * componentes so aceita as chaves de tema do Mantine (`xs`..`xl`).
 */
export const touchStyles = {
  root: { minHeight: TOUCH_TARGET },
  control: { minHeight: TOUCH_TARGET },
  label: { minHeight: TOUCH_TARGET, display: 'flex', alignItems: 'center', justifyContent: 'center' },
} as const;

interface PlayerToolsBarProps {
  progress: number;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  loopA: number | null;
  loopB: number | null;
  onMarkA: () => void;
  onMarkB: () => void;
  onClearLoop: () => void;
  bpm: number | null;
  timeSignature?: string;
  metronomeOn: boolean;
  onToggleMetronome: () => void;
  /**
   * Layout compacto (<= 768px): cada ferramenta vira uma linha de largura total
   * em vez de tres colulas espremidas lado a lado.
   */
  isMobile?: boolean;
}

function formatTime(s: number | null): string {
  const total = Math.max(0, Math.floor((s ?? 0) || 0));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

/** Marcas de tempo de loop (`A 0:32`) precisam delargura monoespacada. */
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export default function PlayerToolsBar({
  playbackRate,
  onPlaybackRateChange,
  loopA,
  loopB,
  onMarkA,
  onMarkB,
  onClearLoop,
  bpm,
  timeSignature,
  metronomeOn,
  onToggleMetronome,
  isMobile = false,
}: PlayerToolsBarProps) {
  const { t } = useLanguage();
  const loopActive = loopA != null && loopB != null && loopB > loopA;

  const beatsPerBar = (() => {
    const num = Number.parseInt((timeSignature || '').trim().split('/')[0] || '', 10);
    return Number.isFinite(num) && num > 0 ? num : 4;
  })();

  const { beat, measureBeat } = useMetronome({
    enabled: metronomeOn,
    bpm,
    beatsPerBar,
  });

  const speedData = SPEED_OPTIONS.map((r) => ({
    value: String(r),
    label: `${r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}x`,
  }));

  const blockStyle = isMobile ? { width: '100%' } : undefined;

  const speedBlock = (
    <Box style={blockStyle}>
      <Text size="xs" c="dimmed" mb={isMobile ? 6 : 2} fw={600}>
        {t.music.playbackSpeed}
      </Text>
      <SegmentedControl
        fullWidth={isMobile}
        size={isMobile ? 'md' : 'xs'}
        value={String(playbackRate)}
        onChange={(v) => onPlaybackRateChange(Number(v))}
        data={speedData}
        styles={isMobile ? touchStyles : undefined}
        aria-label={t.music.playbackSpeed}
      />
    </Box>
  );

  const loopBlock = (
    <Box style={blockStyle}>
      <Text size="xs" c="dimmed" mb={isMobile ? 6 : 2} fw={600}>
        {loopActive ? t.music.loopActive : 'A-B'}
      </Text>
      <Group gap={6} wrap="nowrap">
        <Tooltip label={t.music.loopPointA}>
          <Button
            size={isMobile ? 'md' : 'xs'}
            variant={loopA != null ? 'filled' : 'light'}
            color={loopA != null ? 'blue' : undefined}
            onClick={onMarkA}
            style={isMobile ? { ...touchStyles.root, flex: 1 } : undefined}
            styles={{ label: { fontFamily: MONO_FONT } }}
          >
            {loopA != null ? `A ${formatTime(loopA)}` : 'A'}
          </Button>
        </Tooltip>
        <Tooltip label={t.music.loopPointB}>
          <Button
            size={isMobile ? 'md' : 'xs'}
            variant={loopB != null ? 'filled' : 'light'}
            color={loopB != null ? 'grape' : undefined}
            onClick={onMarkB}
            disabled={loopA == null}
            style={isMobile ? { ...touchStyles.root, flex: 1 } : undefined}
            styles={{ label: { fontFamily: MONO_FONT } }}
          >
            {loopB != null ? `B ${formatTime(loopB)}` : 'B'}
          </Button>
        </Tooltip>
        {loopActive ? (
          <Tooltip label={t.music.loopClear}>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={onClearLoop}
              size={isMobile ? TOUCH_TARGET : 'md'}
              aria-label={t.music.loopClear}
            >
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
        ) : null}
      </Group>
    </Box>
  );

  const metronomeBlock = (
    <Box style={blockStyle}>
      <Text size="xs" c="dimmed" mb={isMobile ? 6 : 2} fw={600}>
        {bpm ? `${bpm} ${t.music.bpmLabel}` : t.music.metronome}
      </Text>
      <Tooltip label={t.music.metronome}>
        <ActionIcon
          variant={metronomeOn ? 'filled' : 'light'}
          color={metronomeOn ? 'red' : undefined}
          size="xl"
          onClick={onToggleMetronome}
          disabled={!bpm}
          aria-label={t.music.metronome}
          style={isMobile ? { width: TOUCH_TARGET, height: TOUCH_TARGET } : undefined}
        >
          <Box
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor:
                metronomeOn && beat
                  ? 'var(--mantine-color-red-5)'
                  : 'var(--mantine-color-default-border)',
              boxShadow:
                metronomeOn && beat ? '0 0 10px 2px var(--mantine-color-red-4)' : 'none',
              transition: 'background-color 90ms ease, box-shadow 90ms ease',
              transform: measureBeat === 0 && metronomeOn ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        </ActionIcon>
      </Tooltip>
    </Box>
  );

  if (isMobile) {
    return (
      <Stack gap="md">
        {speedBlock}
        {loopBlock}
        {metronomeBlock}
      </Stack>
    );
  }

  return (
    <Group gap="md" wrap="wrap" align="center">
      {speedBlock}
      {loopBlock}
      {metronomeBlock}
    </Group>
  );
}

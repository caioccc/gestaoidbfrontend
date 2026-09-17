import React from 'react';
import { ActionIcon, Box, Button, Group, SegmentedControl, Text, Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import { useMetronome } from '../hooks/useMetronome';

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
}

function formatTime(s: number | null): string {
  const total = Math.max(0, Math.floor((s ?? 0) || 0));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export default function PlayerToolsBar({
  progress,
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

  return (
    <Group gap="md" wrap="wrap" align="center">
      <Box>
        <Text size="xs" c="dimmed" mb={2}>
          {t.music.playbackSpeed}
        </Text>
        <SegmentedControl
          size="xs"
          value={String(playbackRate)}
          onChange={(v) => onPlaybackRateChange(Number(v))}
          data={speedData}
        />
      </Box>

      <Box>
        <Text size="xs" c="dimmed" mb={2}>
          {loopActive ? t.music.loopActive : 'A-B'}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Tooltip label={t.music.loopPointA}>
            <Button
              size="xs"
              variant={loopA != null ? 'filled' : 'light'}
              color={loopA != null ? 'blue' : undefined}
              onClick={onMarkA}
              styles={{ label: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
            >
              {loopA != null ? `A ${formatTime(loopA)}` : 'A'}
            </Button>
          </Tooltip>
          <Tooltip label={t.music.loopPointB}>
            <Button
              size="xs"
              variant={loopB != null ? 'filled' : 'light'}
              color={loopB != null ? 'grape' : undefined}
              onClick={onMarkB}
              disabled={loopA == null}
              styles={{ label: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
            >
              {loopB != null ? `B ${formatTime(loopB)}` : 'B'}
            </Button>
          </Tooltip>
          {loopActive ? (
            <Tooltip label={t.music.loopClear}>
              <ActionIcon variant="subtle" color="red" onClick={onClearLoop}>
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>
      </Box>

      <Box>
        <Text size="xs" c="dimmed" mb={2}>
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
    </Group>
  );
}
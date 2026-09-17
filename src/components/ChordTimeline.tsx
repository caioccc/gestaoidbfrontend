import React, { useEffect, useRef } from 'react';
import { Box, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import type { ChordItem } from '../types';

interface ChordTimelineProps {
  chords: ChordItem[];
  activeIndex: number;
  progress?: number;
  simpleMode: boolean;
  onSeek: (seconds: number) => void;
}

function formatTime(s: number | null | undefined): string {
  const total = Math.max(0, Math.floor((s ?? 0) || 0));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function ChordTimeline({
  chords,
  activeIndex,
  progress = 0,
  simpleMode,
  onSeek,
}: ChordTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>('[data-timeline-active="true"]');
    if (!el) return;
    const target = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeIndex, chords]);

  if (!chords.length) return null;

  return (
    <Box
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '12px 4px 10px',
        scrollbarWidth: 'thin',
        scrollSnapType: 'x proximity',
      }}
    >
      {chords.map((chord, i) => {
        const isActive = i === activeIndex;
        const distance = Math.abs(i - activeIndex);
        const opacity = isActive ? 1 : Math.max(0.25, 1 - distance * 0.24);
        const scaled = isActive ? 1.08 : 1;
        const activeWidth = simpleMode ? 100 : 108;
        const cardWidth = isActive ? activeWidth : simpleMode ? 78 : 84;
        const start = chord.start ?? 0;
        const end = chord.end != null ? chord.end : start + 1;
        const pct = end > start ? clamp(((progress - start) / (end - start)) * 100, 0, 100) : 0;

        return (
          <button
            key={`${i}-${chord.note_fmt || chord.note}`}
            type="button"
            data-timeline-active={isActive ? 'true' : undefined}
            onClick={() => onSeek(start)}
            aria-label={`${chord.note_fmt || chord.note} ${formatTime(start)}`}
            style={{
              position: 'relative',
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: simpleMode ? 2 : 6,
              width: cardWidth,
              height: simpleMode ? 54 : undefined,
              minHeight: simpleMode ? 54 : 116,
              padding: simpleMode ? '6px 8px' : '10px 6px',
              border: isActive
                ? '2px solid var(--mantine-primary-color-filled)'
                : '1px solid var(--mantine-color-default-border)',
              background: isActive
                ? 'var(--mantine-primary-color-light)'
                : 'var(--mantine-color-default)',
              borderRadius: 10,
              cursor: 'pointer',
              opacity,
              transform: `scale(${scaled})`,
              boxShadow: isActive
                ? '0 6px 16px var(--mantine-primary-color-light-hover)'
                : 'none',
              transition: 'transform 180ms ease, opacity 180ms ease, border-color 180ms ease',
              scrollSnapAlign: 'center',
              overflow: 'hidden',
            }}
          >
            {isActive ? (
              <Box
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '1px 5px',
                  borderRadius: 99,
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--mantine-primary-color-filled)',
                  backgroundColor: 'var(--mantine-primary-color-light)',
                  lineHeight: '16px',
                }}
              >
                <IconClock size={10} />
                {formatTime(start)}
              </Box>
            ) : null}
            <Text
              fw={800}
              size={simpleMode ? undefined : isActive ? 'xl' : 'sm'}
              c={isActive ? 'var(--mantine-primary-color-filled)' : undefined}
              style={{
                fontSize: simpleMode ? (isActive ? 24 : 18) : undefined,
                lineHeight: 1.1,
                whiteSpace: simpleMode ? 'nowrap' : undefined,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {chord.note_fmt || chord.note}
            </Text>
            {!simpleMode && chord.image ? (
              <Box
                style={{
                  width: isActive ? 76 : 60,
                  height: isActive ? 54 : 42,
                  borderRadius: 6,
                  overflow: 'hidden',
                  backgroundColor: 'var(--mantine-color-gray-2)',
                }}
              >
                <img
                  src={chord.image}
                  alt={chord.note_fmt || chord.note}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
            ) : null}
            {!isActive ? (
              <Text size="xs" c="dimmed">
                {formatTime(start)}
              </Text>
            ) : null}
            {isActive ? (
              <Box
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 3,
                  width: `${pct}%`,
                  backgroundColor: 'var(--mantine-primary-color-filled)',
                  transition: 'width 120ms linear',
                }}
              />
            ) : null}
          </button>
        );
      })}
    </Box>
  );
}
import React, { useEffect, useRef, useState } from 'react';
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
  const [compact, setCompact] = useState(false);

  // Cards menores no celular: o de diagrama tem 84px + a capa 60px, e a fileira
  // precisa caber ~2.5 cards numa tela de 360px para o "dedo" alcançar o acorde
  // ativo sem arrastar a esteira antes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>('[data-timeline-active="true"]');
    if (!el) return;
    const target = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeIndex, chords]);

  if (!chords.length) return null;

  const inactiveWidth = compact ? (simpleMode ? 66 : 70) : simpleMode ? 78 : 84;
  const activeWidth = compact ? (simpleMode ? 86 : 92) : simpleMode ? 100 : 108;

  return (
    <Box
      ref={containerRef}
      // `w-full` explicito: o pai (`Card`/`Stack`) pode ter largura colapsada
      // por `align-items`, e sem isso a esteira ficava estreita e cortava o
      // primeiro/last acorde em vez de rolar.
      w="100%"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        // O padding lateral vive no container, e nao no parent, para o card
        // ativo nunca encostar na borda da tela durante o scroll.
        padding: compact ? '10px 2px 8px' : '12px 4px 10px',
        scrollbarWidth: 'thin',
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
        // Impede que o container estoure a largura do Card quando o texto do
        // acorde e longo.
        minWidth: 0,
      }}
    >
      {chords.map((chord, i) => {
        const isActive = i === activeIndex;
        const distance = Math.abs(i - activeIndex);
        const opacity = isActive ? 1 : Math.max(0.25, 1 - distance * 0.24);
        const scaled = isActive ? 1.08 : 1;
        const cardWidth = isActive ? activeWidth : inactiveWidth;
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
              // Alvo de toque: nenhum acorde deve ficar abaixo de 44px.
              minHeight: simpleMode ? 54 : compact ? 100 : 116,
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
              WebkitTapHighlightColor: 'transparent',
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
                  width: isActive ? (compact ? 60 : 76) : compact ? 48 : 60,
                  height: isActive ? (compact ? 44 : 54) : compact ? 36 : 42,
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
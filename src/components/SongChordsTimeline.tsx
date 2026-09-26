'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ChordItem } from '../types';
import styles from '../styles/rhythmTimeline.module.css';

const MIN_BEAT_SECONDS = 0.05;
const MAX_BEAT_SECONDS = 4;
const MIN_BEATS_PER_BAR = 1;
const MAX_BEATS_PER_BAR = 16;
const FALLBACK_BEAT_SECONDS = 0.5;
const FALLBACK_BEATS_PER_BAR = 4;
const REST_SYMBOL = '\u2014';
const REST_TOKENS = new Set(['N', 'R', 'r', '-', 'rest', 'Rest', 'REST']);

export interface BeatCell {
  beatIndex: number;
  measureIndex: number;
  chordText: string;
  rawChord: string;
  start: number;
  end: number;
  isMeasureStart: boolean;
  isRest: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toSeconds(value: number | null | undefined, fallback: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(0, numeric);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isRestChord(chord: ChordItem) {
  return REST_TOKENS.has((chord?.note ?? '').trim()) || REST_TOKENS.has((chord?.note_fmt ?? '').trim());
}

/**
 * Duração de um tempo em segundos.
 *
 * A API do Chordify emite uma linha por acorde, e `tempo` sempre incrementa de
 * 1 em 1. Logo o número de linhas por compasso não diz nada sobre a métrica:
 * um acorde de dois tempos gera uma única linha, não duas. A contagem tem de
 * vir da duração real de cada linha, nunca da contagem de linhas.
 *
 * O BPM declarado é a fonte preferencial, mas só quando concorda com o menor
 * intervalo observado entre ataques — BPM de metadado desatualizado (metade ou
 * o dobro do tempo real) inverteria toda a grade.
 */
export function resolveBeatDuration(chords: ChordItem[], bpm?: number | null) {
  const gaps: number[] = [];
  for (let index = 1; index < chords.length; index += 1) {
    const gap = toSeconds(chords[index].start, 0) - toSeconds(chords[index - 1].start, 0);
    if (gap > 0.01) gaps.push(gap);
  }

  let dataBeat: number | null = null;
  if (gaps.length) {
    const sorted = [...gaps].sort((a, b) => a - b);
    const smallest = sorted[0];
    const cluster = sorted.filter((gap) => gap <= smallest * 1.35);
    dataBeat = median(cluster) ?? smallest;
  }

  let bpmBeat: number | null = null;
  if (typeof bpm === 'number' && Number.isFinite(bpm) && bpm > 0) {
    const candidate = 60 / bpm;
    if (candidate >= MIN_BEAT_SECONDS && candidate <= MAX_BEAT_SECONDS) bpmBeat = candidate;
  }

  if (bpmBeat && dataBeat) {
    const ratio = bpmBeat / dataBeat;
    return ratio >= 0.55 && ratio <= 1.8 ? bpmBeat : dataBeat;
  }
  return bpmBeat ?? dataBeat ?? FALLBACK_BEAT_SECONDS;
}

/**
 * Expande a lista de acordes em células de tempo, agrupadas em compassos.
 *
 * Cada acorde vira `round(duração / duração_do_tempo)` células, no mínimo uma.
 * O texto só aparece na célula de ataque; as demais ficam vazias para marcar
 * a sustentação. As células são repartidas igualmente dentro do span real do
 * acorde, então a primeira começa em `start` e a última termina em `end` — sem
 * deriva de arredondamento ao longo de uma música de dez minutos.
 */
export function buildBeatCells(
  chords: ChordItem[],
  beatsPerBar: number,
  beatDuration: number,
): BeatCell[] {
  const bar = Math.round(clamp(beatsPerBar, MIN_BEATS_PER_BAR, MAX_BEATS_PER_BAR)) || FALLBACK_BEATS_PER_BAR;
  const beat = beatDuration > 0 ? beatDuration : FALLBACK_BEAT_SECONDS;
  const cells: BeatCell[] = [];
  let beatCursor = 0;
  let cursor: number | null = null;

  const pushSpan = (spanStart: number, spanEnd: number, label: string, rawChord: string, rest: boolean) => {
    const count = Math.max(1, Math.round((spanEnd - spanStart) / beat));
    const step = (spanEnd - spanStart) / count;

    for (let offset = 0; offset < count; offset += 1) {
      const absolute = beatCursor + offset;
      const beatIndex = (absolute % bar) + 1;
      cells.push({
        beatIndex,
        measureIndex: Math.floor(absolute / bar) + 1,
        chordText: offset === 0 ? label : '',
        rawChord,
        start: spanStart + step * offset,
        end: offset === count - 1 ? spanEnd : spanStart + step * (offset + 1),
        isMeasureStart: beatIndex === 1,
        isRest: rest,
      });
    }

    beatCursor += count;
    cursor = spanEnd;
  };

  for (const chord of chords) {
    if (!chord) continue;

    const start = toSeconds(chord.start, 0);
    const declaredEnd = toSeconds(chord.end, start);
    const end = declaredEnd > start + 0.001 ? declaredEnd : start + beat;

    // Buraco real entre dois acordes (intro solo, ponte instrumental): sem
    // célula o cursor congelaria e a esteira perderia a contagem. Só conta
    // lacunas acima de meio tempo, para não tratar ruído de arredondamento
    // como silêncio. A pré-entrada antes do primeiro acorde não é preenchida.
    if (cursor !== null && start > cursor + beat * 0.5) {
      pushSpan(cursor, start, REST_SYMBOL, '', true);
    }

    const rest = isRestChord(chord);
    const rawChord = (chord.note ?? '').trim();
    const attackLabel = rest ? REST_SYMBOL : ((chord.note_fmt ?? '').trim() || rawChord);
    pushSpan(start, end, attackLabel, rawChord, rest);
  }

  return cells;
}

function findActiveBeat(cells: BeatCell[], time: number) {
  if (!cells.length) return -1;
  if (!Number.isFinite(time) || time < cells[0].start) return -1;

  let low = 0;
  let high = cells.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (cells[mid].start <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}

interface SongChordsTimelineProps {
  chords: ChordItem[];
  currentTime: number;
  bpm?: number | null;
  beatsPerBar?: number;
  onSeek?: (time: number) => void;
}

export default function SongChordsTimeline({
  chords,
  currentTime,
  bpm,
  beatsPerBar,
  onSeek,
}: SongChordsTimelineProps) {
  const cells = useMemo(
    () => buildBeatCells(chords, beatsPerBar ?? FALLBACK_BEATS_PER_BAR, resolveBeatDuration(chords, bpm)),
    [chords, beatsPerBar, bpm],
  );
  const activeBeatIndex = useMemo(() => findActiveBeat(cells, currentTime), [cells, currentTime]);

  const activeBeatRef = useRef<HTMLButtonElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const active = activeBeatRef.current;
    const strip = stripRef.current;
    if (!active || !strip) return;

    const viewport = strip.clientWidth;
    if (!viewport) return;
    const left = active.offsetLeft;
    const offset = strip.scrollLeft;
    const inComfortBand = left >= offset + viewport * 0.34 && left <= offset + viewport * 0.66;
    if (inComfortBand) return;

    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeBeatIndex]);

  return (
    <div className={styles.strip} ref={stripRef}>
      <div className={styles.track}>
        {cells.map((cell, index) => {
          const isActive = index === activeBeatIndex;
          const className = [
            styles.beat,
            cell.isMeasureStart ? styles.measureStart : '',
            isActive ? styles.active : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={index}
              type="button"
              ref={isActive ? activeBeatRef : undefined}
              className={className}
              onClick={() => onSeek?.(cell.start)}
              title={cell.rawChord ? `${cell.rawChord} — compasso ${cell.measureIndex}, tempo ${cell.beatIndex}` : undefined}
            >
              {isActive ? <span className={styles.pulse} /> : null}
              <span className={styles.label}>{cell.chordText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

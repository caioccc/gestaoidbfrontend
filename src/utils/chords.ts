import type { ChordItem } from '../types';

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const ENHARMONIC: Record<string, string> = {
  Db: 'C#',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

const ROOT_RE = /^([A-G])([#b]?)/;

function normalizeRoot(root: string): string {
  if (root in ENHARMONIC && ENHARMONIC[root]) return ENHARMONIC[root];
  return root;
}

export function transposeChord(chord: string, semitones: number): string {
  const match = ROOT_RE.exec(chord);
  if (!match) return chord;
  const root = normalizeRoot(`${match[1]}${match[2]}`);
  const idx = ROOTS.indexOf(root as (typeof ROOTS)[number]);
  if (idx === -1) return chord;
  const suffix = chord.slice(match[0].length);
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  return ROOTS[newIdx] + suffix;
}

export function transposeKey(key: string, semitones: number): string {
  const clean = key.trim();
  if (!clean) return clean;
  return transposeChord(clean, semitones);
}

export function keyDistance(from: string, to: string): number {
  const a = normalizeRoot(from.trim());
  const b = normalizeRoot(to.trim());
  const ia = ROOTS.indexOf(a as (typeof ROOTS)[number]);
  const ib = ROOTS.indexOf(b as (typeof ROOTS)[number]);
  if (ia === -1 || ib === -1) return 0;
  return (((ib - ia) % 12) + 12) % 12;
}

function transposeRawNote(note: string, semitones: number): string {
  const match = /^([A-G][#b]?)([:A-Za-z0-9]*)$/.exec((note || '').trim());
  if (!match) return note;
  return transposeChord(match[1], semitones) + match[2];
}

function chordImage(note: string, instrument: string): string {
  const clean = (note || '').replace(':', '_').replace('#', 's');
  return `https://chordify.net/img/diagrams/${instrument === 'piano' ? 'piano' : 'guitar'}/${clean}.png`;
}

export function transposeChordsJson(
  chords: ChordItem[],
  semitones: number,
): ChordItem[] {
  if (semitones === 0 || !chords.length) return chords;
  return chords.map((c) => {
    const transposed = transposeChord(c.note_fmt || c.note, semitones);
    return {
      ...c,
      note_fmt: transposed,
      image: c.image
        ? chordImage(transposeRawNote(c.note || c.note_fmt, semitones), c.instrument)
        : c.image,
    };
  });
}

export function chordAt(chords: ChordItem[], time: number): number {
  if (!chords.length) return -1;
  for (let i = 0; i < chords.length; i += 1) {
    const chord = chords[i];
    if (time >= chord.start && time < (chord.end ?? chord.start + 1)) {
      return i;
    }
  }
  return -1;
}

export function dedupeChords(chords: ChordItem[]): ChordItem[] {
  const out: ChordItem[] = [];
  for (const chord of chords) {
    const prev = out[out.length - 1];
    if (prev && (prev.note_fmt || prev.note) === (chord.note_fmt || chord.note)) {
      if (chord.end != null || chord.tempo != null) {
        out[out.length - 1] = {
          ...prev,
          end: chord.end != null ? chord.end : prev.end,
          tempo: chord.tempo != null ? chord.tempo : prev.tempo,
        };
      }
      continue;
    }
    out.push({ ...chord });
  }
  return out;
}
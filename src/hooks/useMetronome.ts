import { useEffect, useRef, useState } from 'react';

interface UseMetronomeOptions {
  enabled: boolean;
  bpm: number | null;
  beatsPerBar?: number;
  volume?: number;
}

interface MetronomeState {
  beat: boolean;
  measureBeat: number;
}

function scheduleClick(
  ctx: AudioContext,
  time: number,
  accent: boolean,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = accent ? 880 : 880;
  const peak = Math.max(0.0001, volume * (accent ? 0.5 : 0.32));
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

export function useMetronome({
  enabled,
  bpm,
  beatsPerBar = 4,
  volume = 0.6,
}: UseMetronomeOptions): MetronomeState {
  const [beat, setBeat] = useState(false);
  const [measureBeat, setMeasureBeat] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !bpm || bpm <= 0) {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setBeat(false);
      setMeasureBeat(0);
      return undefined;
    }

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;

    if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') void ctx.resume();

    const secondsPerBeat = 60 / bpm;
    const lookaheadMs = 25;
    const scheduleAheadTime = 0.1;
    nextNoteTimeRef.current = ctx.currentTime + 0.06;
    beatIndexRef.current = 0;

    const scheduler = () => {
      while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        const time = nextNoteTimeRef.current;
        const idx = beatIndexRef.current % beatsPerBar;
        scheduleClick(ctx, time, idx === 0, volume);
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        window.setTimeout(() => {
          setBeat((b) => !b);
          setMeasureBeat(idx);
        }, delay);
        nextNoteTimeRef.current += secondsPerBeat;
        beatIndexRef.current = idx + 1;
      }
    };

    scheduler();
    timerRef.current = window.setInterval(scheduler, lookaheadMs);

    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, bpm, beatsPerBar, volume]);

  useEffect(
    () => () => {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    },
    [],
  );

  return { beat, measureBeat };
}

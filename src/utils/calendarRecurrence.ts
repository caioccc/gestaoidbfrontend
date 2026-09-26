// Converte "YYYY-MM-DD" em um Date no horário LOCAL (evita deslocamento de fuso).
export function dateFromApi(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Formata um Date local como "YYYY-MM-DD" (evita toISOString/UTC).
export function dateToApi(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Dia da semana ISO: 0=Seg .. 6=Dom (getDay(): 0=Dom).
export function isoWeekday(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

// Campos mínimos que a resolução de recorrência consome. Satisfeito tanto por
// `CalendarEvent` (tela administrativa) quanto por `PublicCalendarEvent` (página
// pública), que expõe a mesma recorrência sem os dados internos.
export interface RecurringEventLike {
  repeat_monthly: boolean;
  repeat_weekly: boolean;
  weekdays: number[];
  repeat_interval: number;
  repeat_end_date: string | null;
  date: string | null;
  day: number | null;
  repeat_monthly_weekday: number | null;
  repeat_monthly_ordinal: number | null;
}

// Resolve se um evento do calendário ocorre em uma data específica.
// Cobre os três modos de recorrência: mensal (fixo no dia ou "n-ésimo dia da semana"),
// semanal (intervalo em semanas a partir da âncora) e evento único.
export function eventOccursOn(ev: RecurringEventLike, d: Date): boolean {
  const cursor = dateToApi(d) ?? '';

  if (ev.repeat_monthly) {
    const nthWd = ev.repeat_monthly_weekday;
    const nthOrd = ev.repeat_monthly_ordinal;
    if (nthWd != null && nthOrd != null) {
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const occ: number[] = [];
      const dim = new Date(yr, mo + 1, 0).getDate();
      for (let k = 1; k <= dim; k++) {
        if (isoWeekday(new Date(yr, mo, k).getDay()) === nthWd) occ.push(k);
      }
      const target = nthOrd === -1 ? occ[occ.length - 1] : occ[nthOrd - 1];
      return target === d.getDate();
    }
    return ev.day === d.getDate();
  }

  if (ev.repeat_weekly) {
    const wd = isoWeekday(d.getDay());
    if (!(ev.weekdays || []).includes(wd)) return false;
    if (ev.repeat_end_date && cursor > ev.repeat_end_date) return false;
    if (ev.date) {
      const anchor = dateFromApi(ev.date);
      if (d.getTime() < anchor.getTime()) return false;
      const interval = ev.repeat_interval || 1;
      const diffDays = Math.round((d.getTime() - anchor.getTime()) / 86400000);
      if (diffDays % (7 * interval) !== 0) return false;
    }
    return true;
  }

  if (ev.date) {
    const dd = dateFromApi(ev.date);
    return (
      dd.getFullYear() === d.getFullYear() &&
      dd.getMonth() === d.getMonth() &&
      dd.getDate() === d.getDate()
    );
  }

  return false;
}

// Expande uma lista de eventos nas ocorrências da janela que começa em `start`
// (inclusive) e vai até `start + days` (inclusive), em ordem cronológica.
export function expandEvents<T extends RecurringEventLike>(
  events: T[],
  start: Date,
  days: number
): { date: Date; event: T }[] {
  const out: { date: Date; event: T }[] = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(start, i);
    for (const ev of events) {
      if (eventOccursOn(ev, d)) out.push({ date: d, event: ev });
    }
  }
  return out;
}

export interface IcalEvent {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

// DTSTART/DTEND/DTSTAMP em ICS são sempre instantes absolutos em UTC. Ler os
// getters locais e apenas acrescentar "Z" deslocaria o evento pelo offset do
// fuso de quem exportou (um culto às 19:00 viraria 16:00Z em UTC-3).
export function icsDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

export function buildIcs(event: IcalEvent): string {
  const uid = `${event.start.getTime()}-${Math.abs(hashCode(event.title))}@idbfinance`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//idbfinance//Agenda da Igreja//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : '',
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function icsFilename(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${slug || 'evento'}.ics`;
}

export function downloadIcs(event: IcalEvent): void {
  const blob = new Blob([buildIcs(event)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = icsFilename(event.title);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(event: IcalEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${icsDate(event.start)}/${icsDate(event.end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function whatsappInviteUrl(
  message: string,
  phone?: string | null
): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const base = `https://wa.me/?text=${encodeURIComponent(message)}`;
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : base;
}

export function mapsUrl(
  address: string,
  latitude: number | null,
  longitude: number | null
): string {
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

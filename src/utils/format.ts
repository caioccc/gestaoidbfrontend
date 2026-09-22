// Formatadores de valores monetários e datas em pt-BR
const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(num)) return BRL.format(0);
  return BRL.format(num);
}

export function toNumber(value: string | number | null | undefined): number {
  const num = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return Number.isNaN(num) ? 0 : num;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';

  // Se for string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';

    // Se vier no padrão YYYY-MM-DD (ex.: "2026-09-21" ou "2026-09-21T00:00:00...")
    const match = trimmed.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`; // Retorna 21/09/2026 direto, imune a fuso horário
    }

    // Se for outro formato de string com hora, converte
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return value;
    value = parsed;
  }

  // Se for instância de Date
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const d = String(value.getDate()).padStart(2, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const y = value.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return '—';
}

export function formatMusicalKey(key: string | null | undefined): string {
  if (!key) return '—';
  const trimmed = key.trim();
  if (!trimmed) return '—';
  return trimmed.replace(/^([a-gA-G])([#bB]?)(m|M)?(.*)$/, (_, note, acc, minor, rest) => {
    const formattedNote = note.toUpperCase();
    const formattedAcc = acc ? (acc.toLowerCase() === 'b' ? 'b' : '#') : '';
    const formattedMinor = minor && minor.toLowerCase() === 'm' ? 'm' : '';
    return `${formattedNote}${formattedAcc}${formattedMinor}${rest}`;
  });
}

export function formatDateTime(value: string | null | undefined, locale = 'pt-BR'): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = d.toLocaleDateString(locale);
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

// src/utils/format.ts

export function toISO(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;

  // 1. Se já for string
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return undefined;

    // Se já começa com YYYY-MM-DD, corta direto os 10 primeiros caracteres
    // Isso NÃO passa pelo motor de fuso horário e nunca perde o dia
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }

    // Se for string em formato BR (DD/MM/YYYY)
    const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return undefined;
    date = parsed;
  }

  // 2. Se for objeto Date
  if (date instanceof Date && !isNaN(date.getTime())) {
    // Usamos getFullYear, getMonth e getDate locais
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return undefined;
}

export function parseISODate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = dateStr.slice(0, 10).split('-');
  if (match.length !== 3) return new Date(dateStr);
  const [y, m, d] = match.map(Number);
  // Cria a data no meio-dia (12:00) local para ficar imune a qualquer desvio de timezone
  return new Date(y, m - 1, d, 12, 0, 0);
}


export function formatMoneyInput(value: number | null | undefined): string {
  const num = toNumber(value);
  if (num === 0) return '';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrency(value: string | number | null | undefined): number {
  const t = String(value ?? '').replace(/[^\d.,-]/g, '');
  if (!t) return 0;
  const normalized = t.includes(',')
    ? t.replace(/\./g, '').replace(',', '.')
    : t.replace(/\./g, '');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? 0 : num;
}

export function toUpperCamelWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word;
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(' ');
}

export function toSentenceCase(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) return '';

  const words = normalized.split(' ').map((word) => {
    if (word === word.toUpperCase() && /[A-Z]/.test(word)) {
      return word;
    }
    return word.toLowerCase();
  });

  const combined = words.join(' ');
  return `${combined.charAt(0).toUpperCase()}${combined.slice(1)}`;
}

export function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(String(value ?? '').trim());
}

export function onlyDigits(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function maskTime(value: string): string {
  const d = onlyDigits(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let length = 9; length <= 10; length += 1) {
    let total = 0;
    for (let i = 0; i < length; i += 1) {
      total += Number(d[i]) * (length + 1 - i);
    }
    const check = (total * 10) % 11;
    const expected = check === 10 ? 0 : check;
    if (expected !== Number(d[length])) return false;
  }
  return true;
}

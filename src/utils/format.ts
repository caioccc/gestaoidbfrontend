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

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function toISO(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

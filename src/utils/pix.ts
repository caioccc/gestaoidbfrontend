export const PIX_TYPES = [
  'CNPJ',
  'CPF',
  'Telefone',
  'E-mail',
  'Chave Aleatória',
] as const;

export type PixType = (typeof PIX_TYPES)[number];

export type PixKeyValidationError =
  | 'required'
  | 'type'
  | 'invalid'
  | 'tooLong'
  | null;

export interface BuildPixPayloadArgs {
  key: string;
  pixType?: string | null;
  name: string;
  city: string;
  amount?: string | number | null;
  txid?: string;
}

const PIX_GUI = 'br.gov.bcb.pix';
const PIX_KEY_MAX_LENGTH = 77;

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

function emv(id: string, value: string): string {
  const length = utf8Length(value);
  if (length > 99) {
    throw new Error(`Campo EMV ${id} excede 99 bytes.`);
  }
  return `${id}${String(length).padStart(2, '0')}${value}`;
}

function crc16(payload: string): string {
  const bytes = new TextEncoder().encode(payload);
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function normalizePixKey(key: string, pixType?: string | null): string {
  const trimmed = (key || '').trim();
  if (pixType === 'CPF') {
    return trimmed.replace(/\D/g, '');
  }
  if (pixType === 'CNPJ') {
    return trimmed.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  }
  if (pixType === 'Telefone') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('55')) {
      return `+55${digits.slice(2)}`;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    return `+${digits}`;
  }
  return trimmed;
}

export function validatePixKey(
  key: string,
  pixType?: string | null
): PixKeyValidationError {
  const trimmed = (key || '').trim();
  if (!trimmed) return 'required';
  if (!PIX_TYPES.includes(pixType as PixType)) return 'type';

  let valid = false;
  if (pixType === 'CPF') {
    valid = trimmed.replace(/\D/g, '').length === 11;
  } else if (pixType === 'CNPJ') {
    valid = /^[0-9A-Z]{14}$/i.test(trimmed.replace(/[^0-9A-Z]/gi, ''));
  } else if (pixType === 'Telefone') {
    const digits = trimmed.replace(/\D/g, '');
    valid = digits.length === 10 || digits.length === 11 ||
      (digits.length === 12 && digits.startsWith('55')) ||
      (digits.length === 13 && digits.startsWith('55'));
  } else if (pixType === 'E-mail') {
    valid = trimmed.length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  } else if (pixType === 'Chave Aleatória') {
    valid = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i.test(trimmed);
  }

  if (!valid) return 'invalid';
  if (utf8Length(normalizePixKey(trimmed, pixType)) > PIX_KEY_MAX_LENGTH) {
    return 'tooLong';
  }
  return null;
}

export function sanitizePixText(value: string, maxLength: number): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength) || 'NA';
}

function normalizeTxid(txid: string | undefined): string {
  if (!txid || txid === '***') return '***';
  return (txid || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 25) || '***';
}

export function buildPixPayload({
  key,
  pixType,
  name,
  city,
  amount,
  txid,
}: BuildPixPayloadArgs): string {
  if (validatePixKey(key, pixType)) return '';

  const accountInfo =
    emv('00', PIX_GUI) + emv('01', normalizePixKey(key, pixType));
  const numericAmount = Number(amount);
  const amountTlv =
    amount !== undefined && amount !== null && amount !== '' &&
    Number.isFinite(numericAmount) && numericAmount > 0
      ? emv('54', numericAmount.toFixed(2))
      : '';

  const body =
    emv('00', '01') +
    emv('26', accountInfo) +
    emv('52', '0000') +
    emv('53', '986') +
    amountTlv +
    emv('58', 'BR') +
    emv('59', sanitizePixText(name, 25)) +
    emv('60', sanitizePixText(city, 15)) +
    emv('62', emv('05', normalizeTxid(txid))) +
    '6304';

  return body + crc16(body);
}

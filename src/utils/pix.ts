const PIX_KEY_CODES: Record<string, string> = {
  CNPJ: '02',
  CPF: '01',
  Telefone: '03',
  'E-mail': '04',
  'Chave Aleatória': '05',
};

export interface BuildPixPayloadArgs {
  key: string;
  pixType?: string | null;
  name: string;
  city: string;
  amount?: string | number | null;
  txid?: string;
}

function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function normalizePixKey(key: string, pixType?: string | null): string {
  const trimmed = (key || '').trim();
  if (pixType === 'CPF' || pixType === 'CNPJ') {
    return trimmed.replace(/\D/g, '');
  }
  if (pixType === 'Telefone') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 12) return `+55${digits}`;
    return `+${digits}`;
  }
  return trimmed;
}

export function buildPixPayload({
  key,
  pixType,
  name,
  city,
  amount,
  txid = '***',
}: BuildPixPayloadArgs): string {
  const accountCode = PIX_KEY_CODES[pixType || ''] || '05';
  const accountInfo =
    emv('00', 'BR.GOV.BR.PIX') + emv(accountCode, normalizePixKey(key, pixType));

  const amountTlv =
    amount !== undefined && amount !== null && amount !== '' && Number(amount) > 0
      ? emv('54', Number(amount).toFixed(2))
      : '';

  const withoutCrc =
    emv('00', '01') +
    emv('26', accountInfo) +
    emv('52', '0000') +
    emv('53', '986') +
    amountTlv +
    emv('58', 'BR') +
    emv('59', (name || '').trim().slice(0, 25)) +
    emv('60', (city || '').trim().slice(0, 15)) +
    emv('62', emv('05', txid));

  return withoutCrc + emv('63', crc16(withoutCrc));
}
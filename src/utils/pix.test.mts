import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPixPayload,
  sanitizePixText,
  validatePixKey,
} from './pix.ts';

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

test('builds a BR Code with GUI, key subtag, amount and valid CRC', () => {
  const payload = buildPixPayload({
    key: '83991773034',
    pixType: 'Telefone',
    name: 'Assembleia De Deus - Sede',
    city: 'João Pessoa',
    amount: 30,
  });
  const body = payload.slice(0, -4);
  const crc = payload.slice(-4);

  assert.ok(body.endsWith('6304'));
  assert.equal(crc, crc16(body));
  assert.match(body, /0014br\.gov\.bcb\.pix/);
  assert.match(body, /0114\+5583991773034/);
  assert.match(body, /540530\.00/);
  assert.match(body, /6011Joao Pessoa/);
});

test('sanitizes merchant fields and validates keys', () => {
  assert.equal(sanitizePixText('João Pessoa', 15), 'Joao Pessoa');
  assert.equal(validatePixKey('pix@igreja.com.br', 'E-mail'), null);
  assert.equal(validatePixKey('12ABC34501DE35', 'CNPJ'), null);
  assert.equal(validatePixKey('123456', 'Telefone'), 'invalid');
  assert.equal(validatePixKey('pix@igreja.com.br', null), 'type');
  assert.equal(
    buildPixPayload({
      key: '123456',
      pixType: 'Telefone',
      name: 'Igreja',
      city: 'Campina Grande',
    }),
    ''
  );
});

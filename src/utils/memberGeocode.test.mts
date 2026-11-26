import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMemberGeocodeQuery } from './memberGeocode.ts';

test('buildMemberGeocodeQuery ignores the address complement', () => {
  const query = buildMemberGeocodeQuery({
    street: 'Rua Osvaldo Cruz',
    number: '1375',
    complement: 'Apto 101 bloco B',
    neighborhood: 'Centenário',
    city: 'Campina Grande',
    state: 'PB',
    cep: '58428272',
  });

  assert.equal(
    query,
    'Rua Osvaldo Cruz 1375, Centenário, Campina Grande/PB, 58428272, Brasil'
  );
});

test('buildMemberGeocodeQuery returns empty when only complement is filled', () => {
  assert.equal(buildMemberGeocodeQuery({ complement: 'Apto 101' }), '');
});

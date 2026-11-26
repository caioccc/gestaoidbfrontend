import assert from 'node:assert/strict';
import test from 'node:test';
import type { MemberLocationMember, MemberLocationPoint } from '../types';
import { buildMemberHeatPoints } from './memberHeatmap.ts';

const member = (id: number): MemberLocationMember => ({
  id,
  name: `Member ${id}`,
  status: 'ACTIVE',
  status_display: 'Active',
  address: 'Rua Teste, 1',
});

const point = (
  key: string,
  latitude: number,
  longitude: number,
  count: number
): MemberLocationPoint => ({
  key,
  latitude,
  longitude,
  address: `Rua Teste, ${count}`,
  members: Array.from({ length: count }, (_, index) => member(index + 1)),
});

test('buildMemberHeatPoints keeps coordinates and weights by resident count', () => {
  const result = buildMemberHeatPoints([
    point('a', -7.2, -35.9, 1),
    point('b', -7.3, -36.0, 4),
  ]);

  assert.deepEqual(result, [
    [-7.2, -35.9, 0.25],
    [-7.3, -36.0, 1],
  ]);
});

test('buildMemberHeatPoints returns an empty list without points', () => {
  assert.deepEqual(buildMemberHeatPoints([]), []);
});

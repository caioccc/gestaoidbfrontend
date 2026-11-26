import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrowthGroup } from '../types';
import { buildGrowthGroupMapLayer } from './growthGroupLayer.ts';

const baseGroup: GrowthGroup = {
  id: 1,
  church: 1,
  name: 'GC Central',
  leader: 1,
  leader_name: 'Ana',
  host: null,
  host_name: null,
  weekday: 0,
  weekday_display: 'Segunda-feira',
  time: '19:00',
  cep: '58428272',
  street: 'Rua Osvaldo Cruz',
  number: '1375',
  complement: '',
  neighborhood: 'Centenário',
  city: 'Campina Grande',
  state: 'PB',
  address: 'Rua Osvaldo Cruz, 1375, Centenário',
  radius_meters: 800,
  category: 'ADULTS',
  category_display: 'Adultos / Famílias',
  is_full: false,
  latitude: -7.2,
  longitude: -35.9,
  is_active: true,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

test('buildGrowthGroupMapLayer keeps only active groups with coordinates and radius', () => {
  const layer = buildGrowthGroupMapLayer([
    baseGroup,
    { ...baseGroup, id: 2, is_active: false },
    { ...baseGroup, id: 3, latitude: null },
    { ...baseGroup, id: 4, radius_meters: 0 },
  ]);

  assert.deepEqual(
    layer.points.map((point) => point.id),
    [1]
  );
  assert.deepEqual(
    layer.missing.map((item) => [item.id, item.reason]),
    [
      [3, 'no_coordinates'],
      [4, 'no_radius'],
    ]
  );
});

test('buildGrowthGroupMapLayer copies popup fields', () => {
  const layer = buildGrowthGroupMapLayer([baseGroup]);
  assert.deepEqual(layer.points[0], {
    id: 1,
    name: 'GC Central',
    leader_name: 'Ana',
    weekday_display: 'Segunda-feira',
    time: '19:00',
    category_display: 'Adultos / Famílias',
    address: 'Rua Osvaldo Cruz, 1375, Centenário',
    radius_meters: 800,
    latitude: -7.2,
    longitude: -35.9,
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleMapsRouteUrl, orderRouteEndpoints } from './geo.ts';

const church = { lat: -7.2, lng: -35.9 };
const point = { lat: -7.3, lng: -36 };

test('orderRouteEndpoints keeps the church as origin by default', () => {
  assert.deepEqual(
    orderRouteEndpoints(church, point, 'church-to-point'),
    [church, point]
  );
});

test('orderRouteEndpoints reverses the route when requested', () => {
  assert.deepEqual(
    orderRouteEndpoints(church, point, 'point-to-church'),
    [point, church]
  );
});

test('buildGoogleMapsRouteUrl swaps origin and destination with the direction', () => {
  assert.equal(
    buildGoogleMapsRouteUrl(church, point, 'point-to-church'),
    'https://www.google.com/maps/dir/?api=1&origin=-7.3,-36&destination=-7.2,-35.9'
  );
});

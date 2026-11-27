import assert from 'node:assert/strict';
import test from 'node:test';
import { checkinCsvFilename, parseCheckinDateInput } from './eventCheckin.ts';

test('checkinCsvFilename normalizes accents and removes unsafe characters', () => {
  assert.equal(checkinCsvFilename('Culto de Domingo!'), 'checkins-culto-de-domingo.csv');
  assert.equal(checkinCsvFilename('  '), 'checkins-evento.csv');
});

test('parseCheckinDateInput converts Mantine display values to API dates', () => {
  assert.equal(parseCheckinDateInput('26/11/2026'), '2026-11-26');
  assert.equal(parseCheckinDateInput('2026-11-26'), '2026-11-26');
  assert.equal(parseCheckinDateInput(new Date(2026, 10, 26)), '2026-11-26');
  assert.equal(parseCheckinDateInput(null), null);
});

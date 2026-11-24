import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateKey, parseDateKey, isValidDateKey, daysBetween, startOfWeek, timeToMinutes,
  minutesToTime, formatDuration, describeDeadline, isValidTime, nextQuarterHour,
} from '../src/utils/dateUtils.js';

test('toDateKey / parseDateKey round-trip in local time', () => {
  const d = new Date(2026, 0, 5, 23, 30);
  assert.equal(toDateKey(d), '2026-01-05');
  assert.equal(parseDateKey('2026-01-05').getDate(), 5);
});

test('rejects impossible or malformed dates', () => {
  assert.equal(isValidDateKey('2026-02-31'), false);
  assert.equal(isValidDateKey('2026-2-3'), false);
  assert.equal(isValidDateKey(null), false);
  assert.equal(isValidDateKey('2028-02-29'), true);
});

test('daysBetween counts calendar days', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-08'), 7);
  assert.equal(daysBetween('2026-03-08', '2026-03-01'), -7);
  assert.ok(Number.isNaN(daysBetween('bad', '2026-03-01')));
});

test('startOfWeek returns Monday', () => {
  const sunday = new Date(2026, 10, 29); // Sun 29 Nov 2026
  assert.equal(toDateKey(startOfWeek(sunday)), '2026-11-23');
  const monday = new Date(2026, 10, 23, 15);
  assert.equal(toDateKey(startOfWeek(monday)), '2026-11-23');
});

test('time conversions', () => {
  assert.equal(timeToMinutes('09:30'), 570);
  assert.ok(Number.isNaN(timeToMinutes('25:00')));
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(minutesToTime(5000), '23:59');
  assert.equal(isValidTime('7:00'), false);
});

test('formatDuration', () => {
  assert.equal(formatDuration(30), '30m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(95), '1h 35m');
  assert.equal(formatDuration(null), '0m');
});

test('describeDeadline is relative to now', () => {
  const now = new Date(2026, 10, 24, 10);
  assert.equal(describeDeadline('2026-11-24', now), 'Today');
  assert.equal(describeDeadline('2026-11-25', now), 'Tomorrow');
  assert.equal(describeDeadline('2026-11-22', now), '2 days ago');
  assert.equal(describeDeadline('2026-11-27', now), 'In 3 days');
});

test('nextQuarterHour rounds up', () => {
  assert.equal(nextQuarterHour(new Date(2026, 0, 1, 9, 1)), '09:15');
  assert.equal(nextQuarterHour(new Date(2026, 0, 1, 9, 0)), '09:00');
});

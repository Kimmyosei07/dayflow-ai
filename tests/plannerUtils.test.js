import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, rankTasks, parseAiPlan, extractJson, getFreeIntervals, moveEntry } from '../src/utils/plannerUtils.js';
import { createTask } from '../src/utils/taskUtils.js';
import { timeToMinutes } from '../src/utils/dateUtils.js';

const now = new Date(2026, 10, 24, 8);
const e = (id, minutes) => ({ taskId: id, title: id.toUpperCase(), minutes, reason: '' });

/** Asserts that no two items overlap and everything ends by `end`. */
function assertFeasible(items, end) {
  const sorted = [...items].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  for (let i = 1; i < sorted.length; i++) assert.ok(timeToMinutes(sorted[i].start) >= timeToMinutes(sorted[i - 1].end), 'overlap');
  for (const it of items) assert.ok(timeToMinutes(it.end) <= timeToMinutes(end), `ends after ${end}`);
}

test('schedules tasks with breaks in order', () => {
  const r = buildSchedule({ entries: [e('a', 60), e('b', 30)], startTime: '09:00', availableMinutes: 120, breakMinutes: 10 });
  assert.deepEqual(r.items.map((i) => [i.kind, i.start, i.end]), [
    ['task', '09:00', '10:00'],
    ['break', '10:00', '10:10'],
    ['task', '10:10', '10:40'],
  ]);
  assert.equal(r.deferred.length, 0);
});

test('never produces an impossible schedule: overflow is deferred with a reason', () => {
  const r = buildSchedule({ entries: [e('a', 90), e('b', 90), e('c', 20)], startTime: '09:00', availableMinutes: 120, breakMinutes: 5 });
  assertFeasible(r.items, '11:00');
  assert.deepEqual(r.deferred.map((d) => d.taskId), ['b']);
  assert.match(r.deferred[0].reason, /largest remaining gap/);
  assert.equal(r.warnings.length, 1);
  assert.equal(r.stats.scheduledMinutes, 110);
});

test('a task longer than all available time is deferred with advice to split it', () => {
  const r = buildSchedule({ entries: [e('huge', 300)], startTime: '09:00', availableMinutes: 60 });
  assert.match(r.deferred[0].reason, /breaking it into smaller tasks/);
});

test('fixed activities are planned around and extend the working window', () => {
  const r = buildSchedule({
    entries: [e('a', 60), e('b', 90)],
    startTime: '09:00',
    availableMinutes: 150,
    breakMinutes: 0,
    fixedBlocks: [{ title: 'Lecture', start: '10:00', end: '11:00' }],
  });
  assert.deepEqual(r.items.map((i) => [i.kind, i.start, i.end]), [
    ['task', '09:00', '10:00'],
    ['fixed', '10:00', '11:00'],
    ['task', '11:00', '12:30'],
  ]);
  assertFeasible(r.items, '12:30');
});

test('stops at midnight with a warning', () => {
  const r = buildSchedule({ entries: [e('a', 30), e('b', 60)], startTime: '23:00', availableMinutes: 180 });
  assert.ok(r.warnings.some((w) => w.includes('midnight')));
  assert.deepEqual(r.items.map((i) => [i.start, i.end]), [['23:00', '23:30']]);
  assert.deepEqual(r.deferred.map((d) => d.taskId), ['b']);
});

test('getFreeIntervals subtracts busy blocks', () => {
  assert.deepEqual(getFreeIntervals(540, 720, [{ start: '10:00', end: '10:30' }]), [
    { start: 540, end: 600 },
    { start: 630, end: 720 },
  ]);
});

test('rankTasks orders by urgency and explains', () => {
  const tasks = [
    createTask({ title: 'Later', priority: 'high', deadline: '2026-12-20', estimatedMinutes: 30 }, now),
    createTask({ title: 'Due today', priority: 'low', deadline: '2026-11-24', estimatedMinutes: 30 }, now),
  ];
  const ranked = rankTasks(tasks, now);
  assert.equal(ranked[0].title, 'Due today');
  assert.match(ranked[0].reason, /due today/);
});

test('parseAiPlan validates IDs, fills missing tasks and handles fences', () => {
  const tasks = [createTask({ title: 'A' }, now), createTask({ title: 'B' }, now), createTask({ title: 'C' }, now)];
  const text = '```json\n' + JSON.stringify({ order: [{ taskId: tasks[1].id, reason: 'Do B first' }, { taskId: 'invented', reason: 'x' }, tasks[1].id], summary: 'Plan', tips: ['t'] }) + '\n```';
  const plan = parseAiPlan(text, tasks, now);
  assert.deepEqual(plan.entries.map((x) => x.title), ['B', 'A', 'C']);
  assert.equal(plan.entries[0].reason, 'Do B first');
  assert.equal(plan.summary, 'Plan');
  assert.equal(parseAiPlan('not json', tasks, now), null);
  assert.equal(parseAiPlan('{"order":[{"taskId":"nope"}]}', tasks, now), null);
  assert.equal(extractJson('Sure! {"a":1} hope that helps').a, 1);
});

test('moveEntry swaps neighbours and ignores out-of-range moves', () => {
  assert.deepEqual(moveEntry([1, 2, 3], 0, 1), [2, 1, 3]);
  assert.deepEqual(moveEntry([1, 2, 3], 0, -1), [1, 2, 3]);
});

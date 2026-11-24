import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOverview, getDailySeries, getWeeklySeries, getCategoryDistribution, getFocusStats, getWeeklyTrend, getCompletionStreak } from '../src/utils/analyticsUtils.js';
import { createTask, toggleTaskStatus } from '../src/utils/taskUtils.js';

const now = new Date(2026, 10, 26, 18); // Thu 26 Nov 2026
const at = (d, h = 12) => new Date(2026, 10, d, h);
const done = (title, category, day) => toggleTaskStatus(createTask({ title, category }, at(day - 1)), at(day));
const tasks = [
  done('a', 'academic', 26),
  done('b', 'academic', 25),
  done('c', 'work', 24),
  done('d', 'personal', 18), // last week
  createTask({ title: 'e', category: 'work' }, at(26)),
];
const sessions = [
  { id: '1', minutes: 25, completedAt: at(26).toISOString() },
  { id: '2', minutes: 50, completedAt: at(24).toISOString() },
  { id: '3', minutes: 25, completedAt: at(10).toISOString() },
];

test('overview', () => {
  assert.deepEqual(getOverview(tasks), { total: 5, completed: 4, pending: 1, completionRate: 80 });
  assert.equal(getOverview([]).completionRate, 0);
});

test('daily series covers the last N days with real counts', () => {
  const s = getDailySeries(tasks, sessions, now, 7);
  assert.equal(s.length, 7);
  assert.equal(s.at(-1).key, '2026-11-26');
  assert.equal(s.at(-1).completed, 1);
  assert.equal(s.at(-1).focusMinutes, 25);
  assert.equal(s.find((d) => d.key === '2026-11-24').focusMinutes, 50);
});

test('weekly series buckets by Monday weeks', () => {
  const w = getWeeklySeries(tasks, sessions, now, 3);
  assert.equal(w.length, 3);
  assert.equal(w.at(-1).completed, 3); // 24, 25, 26 Nov
  assert.equal(w.at(-2).completed, 1); // 18 Nov
  assert.equal(w.at(-1).focusMinutes, 75);
});

test('category distribution only includes used categories', () => {
  const dist = getCategoryDistribution(tasks);
  assert.deepEqual(dist.map((d) => [d.value, d.count, d.completed]), [['academic', 2, 2], ['personal', 1, 1], ['work', 2, 1]]);
});

test('focus stats', () => {
  const f = getFocusStats(sessions, now);
  assert.equal(f.totalMinutes, 100);
  assert.equal(f.todayMinutes, 25);
  assert.equal(f.weekMinutes, 75);
  assert.equal(f.totalSessions, 3);
  assert.equal(f.averageMinutes, 33);
});

test('trend and streak', () => {
  assert.deepEqual(getWeeklyTrend(tasks, now), { thisWeek: 3, lastWeek: 1, change: 200 });
  assert.equal(getCompletionStreak(tasks, now), 3);
  assert.equal(getCompletionStreak([], now), 0);
});

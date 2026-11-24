import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextMode, getModeDurationMs, formatClock } from '../src/utils/timerUtils.js';
import { getCourseProgress, validateCourseInput, createCourse } from '../src/utils/academicUtils.js';
import { buildNotifications } from '../src/utils/notificationUtils.js';
import { getRuleBasedRecommendation } from '../src/utils/recommendationUtils.js';
import { createSampleData } from '../src/services/sampleData.js';
import { createTask, toggleTaskStatus } from '../src/utils/taskUtils.js';

const now = new Date(2026, 10, 24, 12);
const focus = { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 };

test('pomodoro cycle: short breaks then a long break every 4th session', () => {
  assert.equal(getNextMode('focus', 1, 4), 'shortBreak');
  assert.equal(getNextMode('focus', 4, 4), 'longBreak');
  assert.equal(getNextMode('shortBreak', 1, 4), 'focus');
  assert.equal(getModeDurationMs('longBreak', focus), 15 * 60000);
  assert.equal(formatClock(25 * 60000), '25:00');
  assert.equal(formatClock(61001), '01:02');
});

test('course progress uses linked tasks only', () => {
  const tasks = [
    toggleTaskStatus(createTask({ title: 'A', courseId: 'c1' }, now), now),
    createTask({ title: 'B', courseId: 'c1', deadline: '2026-11-20' }, now),
    createTask({ title: 'C', courseId: 'c2' }, now),
    createTask({ title: 'D' }, now),
  ];
  const p = getCourseProgress('c1', tasks, now);
  assert.equal(p.total, 2);
  assert.equal(p.percent, 50);
  assert.equal(p.overdue, 1);
});

test('course validation prevents duplicate codes', () => {
  const existing = [createCourse({ name: 'X', code: 'csc 101' })];
  assert.ok(validateCourseInput({ name: 'Y', code: 'CSC 101' }, existing).code);
  assert.deepEqual(validateCourseInput({ name: 'X', code: 'CSC 101' }, existing, existing[0].id), {});
});

test('notifications reflect overdue, due today and upcoming exams', () => {
  const tasks = [
    createTask({ title: 'Late', deadline: '2026-11-20' }, now),
    createTask({ title: 'Now', deadline: '2026-11-24' }, now),
    createTask({ title: 'Final', deadline: '2026-11-27', courseId: 'c1', academicType: 'exam' }, now),
  ];
  const n = buildNotifications(tasks, [{ id: 'c1', code: 'MTH 1' }], now);
  assert.deepEqual(n.map((x) => x.id), ['overdue', 'today', `exam-${tasks[2].id}`]);
  assert.equal(buildNotifications(tasks, [], now, { deadlineReminders: false }).length, 0);
});

test('rule-based recommendation prioritises overdue work', () => {
  const tip = getRuleBasedRecommendation({ tasks: [createTask({ title: 'Late', deadline: '2026-11-01' }, now)], now });
  assert.match(tip, /overdue/);
  assert.match(getRuleBasedRecommendation({ tasks: [], now }), /Start by adding/);
});

test('sample data is flagged and never in the future', () => {
  const s = createSampleData(now);
  assert.ok([...s.tasks, ...s.courses, ...s.focusSessions].every((x) => x.isSample));
  assert.ok(s.focusSessions.every((x) => new Date(x.completedAt) <= now));
  assert.ok(s.tasks.filter((t) => t.completedAt).every((t) => new Date(t.completedAt) <= now));
  assert.ok(s.tasks.filter((t) => t.courseId).every((t) => s.courses.some((c) => c.id === t.courseId)));
});

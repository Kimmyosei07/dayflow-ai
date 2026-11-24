import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTask, updateTask, toggleTaskStatus, normalizeTask, validateTaskInput, isOverdue, isDueToday,
  isUpcoming, filterTasks, sortTasks, getTaskStats, getTodayProgress, getUpcomingDeadlines, getDueDate,
} from '../src/utils/taskUtils.js';

const now = new Date(2026, 10, 24, 12, 0); // Tue 24 Nov 2026, noon
const make = (input) => createTask(input, new Date(2026, 10, 20, 9));

test('createTask fills defaults and unique ids', () => {
  const a = make({ title: '  Read  ' });
  const b = make({ title: 'Read' });
  assert.equal(a.title, 'Read');
  assert.equal(a.priority, 'medium');
  assert.equal(a.category, 'other');
  assert.equal(a.status, 'pending');
  assert.notEqual(a.id, b.id);
});

test('academic tasks default to academic category and assignment type', () => {
  const t = make({ title: 'Essay', courseId: 'course_1' });
  assert.equal(t.category, 'academic');
  assert.equal(t.academicType, 'assignment');
  assert.equal(make({ title: 'x', academicType: 'exam' }).academicType, null);
});

test('normalizeTask drops invalid values', () => {
  const t = normalizeTask({ title: '', priority: 'urgent', deadline: '2026-13-01', deadlineTime: '10:00', estimatedMinutes: -5 });
  assert.equal(t.title, 'Untitled task');
  assert.equal(t.priority, 'medium');
  assert.equal(t.deadline, null);
  assert.equal(t.deadlineTime, null);
  assert.equal(t.estimatedMinutes, null);
});

test('toggle completes and reopens', () => {
  const t = make({ title: 'A' });
  const done = toggleTaskStatus(t, now);
  assert.equal(done.status, 'completed');
  assert.equal(done.completedAt, now.toISOString());
  const reopened = toggleTaskStatus(done, now);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.completedAt, null);
});

test('updateTask keeps id and createdAt', () => {
  const t = make({ title: 'A' });
  const u = updateTask(t, { title: 'B', id: 'hacked', createdAt: 'x' }, now);
  assert.equal(u.id, t.id);
  assert.equal(u.createdAt, t.createdAt);
  assert.equal(u.title, 'B');
});

test('validateTaskInput', () => {
  assert.ok(validateTaskInput({ title: '' }).title);
  assert.ok(validateTaskInput({ title: 'x', estimatedMinutes: '-3' }).estimatedMinutes);
  assert.ok(validateTaskInput({ title: 'x', deadlineTime: '10:00' }).deadlineTime);
  assert.deepEqual(validateTaskInput({ title: 'x', estimatedMinutes: '', deadline: '2026-11-30' }), {});
});

test('due date handling: date-only tasks are due at end of day', () => {
  const t = make({ title: 'A', deadline: '2026-11-24' });
  assert.equal(getDueDate(t).getHours(), 23);
  assert.equal(isOverdue(t, now), false);
  assert.equal(isDueToday(t, now), true);
  const timed = make({ title: 'B', deadline: '2026-11-24', deadlineTime: '09:00' });
  assert.equal(isOverdue(timed, now), true);
  assert.equal(isUpcoming(make({ title: 'C', deadline: '2026-11-26' }), now), true);
});

const tasks = [
  make({ title: 'Overdue essay', deadline: '2026-11-22', priority: 'low', category: 'academic' }),
  make({ title: 'Today call', deadline: '2026-11-24', priority: 'high', category: 'work', description: 'Recruiter' }),
  make({ title: 'Later project', deadline: '2026-12-10', priority: 'high', category: 'projects' }),
  make({ title: 'No deadline', priority: 'medium', category: 'personal' }),
  toggleTaskStatus(make({ title: 'Done thing', deadline: '2026-11-24', category: 'personal' }), now),
];

test('filterTasks by view, category, priority and search', () => {
  assert.deepEqual(filterTasks(tasks, { view: 'overdue' }, now).map((t) => t.title), ['Overdue essay']);
  assert.equal(filterTasks(tasks, { view: 'today' }, now).length, 3);
  assert.equal(filterTasks(tasks, { view: 'completed' }, now).length, 1);
  assert.equal(filterTasks(tasks, { view: 'upcoming' }, now).length, 1);
  assert.equal(filterTasks(tasks, { category: 'personal' }, now).length, 2);
  assert.equal(filterTasks(tasks, { priority: 'high' }, now).length, 2);
  assert.deepEqual(filterTasks(tasks, { search: 'RECRUIT' }, now).map((t) => t.title), ['Today call']);
});

test('sortTasks: smart weighs urgency + priority, completed last', () => {
  const sorted = sortTasks(tasks, 'smart', now).map((t) => t.title);
  // High priority due today (30 + 35) outranks low priority overdue (10 + 40).
  assert.equal(sorted[0], 'Today call');
  assert.equal(sorted[1], 'Overdue essay');
  assert.equal(sorted.at(-1), 'Done thing');
  assert.equal(sortTasks(tasks, 'title', now)[0].title, 'Later project');
});

test('stats and today progress are calculated from data', () => {
  const stats = getTaskStats(tasks, now);
  assert.deepEqual(stats, { total: 5, completed: 1, pending: 4, overdue: 1, dueToday: 1, completedToday: 1 });
  assert.deepEqual(getTodayProgress(tasks, now), { done: 1, total: 3, percent: 33 });
  assert.deepEqual(getTodayProgress([], now), { done: 0, total: 0, percent: 0 });
});

test('getUpcomingDeadlines excludes completed and undated tasks', () => {
  const list = getUpcomingDeadlines(tasks, now, 10).map((t) => t.title);
  assert.deepEqual(list, ['Overdue essay', 'Today call', 'Later project']);
});

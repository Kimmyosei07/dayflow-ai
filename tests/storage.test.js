import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setStorageBackend, createMemoryBackend, readJSON, writeJSON, getStorageUsage, onStorageIssue, clearAll } from '../src/services/storage/storageService.js';
import { loadAppData, buildExport, parseImport, normalizeAppData } from '../src/services/storage/appDataStorage.js';
import { migrateData } from '../src/services/storage/migrations.js';
import { normalizeSettings } from '../src/services/storage/schema.js';
import { createTask } from '../src/utils/taskUtils.js';
import { createCourse } from '../src/utils/academicUtils.js';

let backend;
beforeEach(() => {
  backend = createMemoryBackend();
  setStorageBackend(backend);
});

test('read/write JSON with namespace', () => {
  writeJSON('x', { a: 1 });
  assert.equal(backend.getItem('dayflow:x'), '{"a":1}');
  assert.deepEqual(readJSON('x', null), { a: 1 });
  assert.equal(readJSON('missing', 'fallback'), 'fallback');
});

test('corrupted data falls back, is backed up and reported', () => {
  const issues = [];
  const off = onStorageIssue((i) => issues.push(i));
  backend.setItem('dayflow:tasks', '{oops');
  assert.deepEqual(readJSON('tasks', []), []);
  assert.equal(backend.getItem('dayflow:corrupt:tasks'), '{oops');
  assert.equal(issues[0].type, 'corrupt');
  off();
});

test('loadAppData survives garbage and removes duplicates', () => {
  const t = createTask({ title: 'Keep' });
  backend.setItem('dayflow:tasks', JSON.stringify([t, t, null, 'junk', { title: 'No id' }]));
  backend.setItem('dayflow:settings', JSON.stringify({ dailyTaskGoal: 9999, theme: 'neon', focus: { focusMinutes: 50 } }));
  const data = loadAppData();
  assert.equal(data.tasks.length, 2);
  assert.equal(data.settings.dailyTaskGoal, 5);
  assert.equal(data.settings.theme, 'light');
  assert.equal(data.settings.focus.focusMinutes, 50);
  assert.equal(data.settings.focus.shortBreakMinutes, 5);
});

test('tasks linked to a deleted course become normal tasks', () => {
  const course = createCourse({ name: 'C', code: 'c1' });
  const linked = createTask({ title: 'A', courseId: course.id });
  const orphan = createTask({ title: 'B', courseId: 'course_gone' });
  const data = normalizeAppData({ courses: [course], tasks: [linked, orphan] });
  assert.equal(data.tasks[0].courseId, course.id);
  assert.equal(data.tasks[1].courseId, null);
  assert.equal(data.tasks[1].academicType, null);
});

test('export → import round-trip', () => {
  const data = normalizeAppData({ tasks: [createTask({ title: 'A' })], courses: [createCourse({ name: 'N', code: 'x1' })], settings: { displayName: 'Ama' } });
  const file = JSON.stringify(buildExport(data));
  const restored = parseImport(file);
  assert.deepEqual(restored, data);
});

test('import rejects other files', () => {
  assert.throws(() => parseImport('not json'), /not valid JSON/);
  assert.throws(() => parseImport('{"hello":1}'), /not a DAYFLOW AI export/);
  assert.throws(() => parseImport(JSON.stringify({ app: 'dayflow-ai', version: 999, data: {} })), /newer version/);
});

test('migrations run step by step', () => {
  const migrations = {
    1: (d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t, tags: [] })) }),
    2: (d) => ({ ...d, upgraded: true }),
  };
  const out = migrateData({ tasks: [{ id: 'a' }] }, 1, { migrations, targetVersion: 3 });
  assert.deepEqual(out, { tasks: [{ id: 'a', tags: [] }], upgraded: true });
});

test('storage usage and clearAll only touch DAYFLOW keys', () => {
  backend.setItem('other-app', 'keep');
  writeJSON('tasks', [1, 2, 3]);
  assert.equal(getStorageUsage().items.length, 1);
  clearAll();
  assert.equal(backend.getItem('other-app'), 'keep');
  assert.equal(getStorageUsage().totalBytes, 0);
});

test('normalizeSettings rejects unknown provider', () => {
  assert.equal(normalizeSettings({ aiProvider: 'openai' }).aiProvider, 'auto');
  assert.equal(normalizeSettings({ aiProvider: 'claude' }).aiProvider, 'claude');
});

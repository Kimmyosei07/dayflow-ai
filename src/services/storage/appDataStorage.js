/**
 * Whole-application data operations: startup loading (with migrations),
 * export, import and reset. Collection-specific reads/writes live in the
 * individual *Storage.js files.
 */
import { readJSON, writeJSON, clearAll } from './storageService.js';
import { migrateData } from './migrations.js';
import {
  SCHEMA_VERSION,
  normalizeList,
  normalizeTask,
  normalizeCourse,
  normalizeFocusSession,
  normalizePlan,
  normalizeConversation,
  normalizeSettings,
} from './schema.js';
import { loadTasks, saveTasks, TASKS_KEY } from './taskStorage.js';
import { loadCourses, saveCourses, COURSES_KEY } from './academicStorage.js';
import { loadFocusSessions, saveFocusSessions, FOCUS_SESSIONS_KEY } from './focusStorage.js';
import { loadPlans, savePlans, PLANS_KEY } from './planStorage.js';
import { loadConversations, saveConversations, CONVERSATIONS_KEY } from './chatStorage.js';
import { loadSettings, saveSettings, SETTINGS_KEY } from './settingsStorage.js';

const META_KEY = 'meta';
export const EXPORT_APP_ID = 'dayflow-ai';

/** Turns any raw data object into clean, de-duplicated, consistent data. */
export function normalizeAppData(raw = {}) {
  const courses = normalizeList(raw.courses, normalizeCourse);
  const courseIds = new Set(courses.map((c) => c.id));
  // A task pointing at a course that no longer exists becomes a normal task.
  const tasks = normalizeList(raw.tasks, normalizeTask).map((t) =>
    t.courseId && !courseIds.has(t.courseId) ? { ...t, courseId: null, academicType: null } : t,
  );
  return {
    tasks,
    courses,
    focusSessions: normalizeList(raw.focusSessions, normalizeFocusSession),
    plans: normalizeList(raw.plans, normalizePlan),
    conversations: normalizeList(raw.conversations, normalizeConversation),
    settings: normalizeSettings(raw.settings ?? {}),
  };
}

/**
 * Called once when the app starts. Upgrades old data if the schema version
 * changed, then returns everything the app needs.
 */
export function loadAppData() {
  const meta = readJSON(META_KEY, null);
  const storedVersion = meta?.version ?? SCHEMA_VERSION;

  if (storedVersion < SCHEMA_VERSION) {
    const raw = {
      tasks: readJSON(TASKS_KEY, []),
      courses: readJSON(COURSES_KEY, []),
      focusSessions: readJSON(FOCUS_SESSIONS_KEY, []),
      plans: readJSON(PLANS_KEY, []),
      conversations: readJSON(CONVERSATIONS_KEY, []),
      settings: readJSON(SETTINGS_KEY, {}),
    };
    const upgraded = normalizeAppData(migrateData(raw, storedVersion));
    saveAppData(upgraded);
    return upgraded;
  }

  if (!meta) writeJSON(META_KEY, { version: SCHEMA_VERSION, createdAt: new Date().toISOString() });

  return normalizeAppData({
    tasks: loadTasks(),
    courses: loadCourses(),
    focusSessions: loadFocusSessions(),
    plans: loadPlans(),
    conversations: loadConversations(),
    settings: loadSettings(),
  });
}

export function saveAppData(data) {
  saveTasks(data.tasks);
  saveCourses(data.courses);
  saveFocusSessions(data.focusSessions);
  savePlans(data.plans);
  saveConversations(data.conversations);
  saveSettings(data.settings);
  writeJSON(META_KEY, { version: SCHEMA_VERSION, updatedAt: new Date().toISOString() });
}

/** Builds the JSON document downloaded by "Export data". */
export function buildExport(data, now = new Date()) {
  return {
    app: EXPORT_APP_ID,
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      tasks: data.tasks,
      courses: data.courses,
      focusSessions: data.focusSessions,
      plans: data.plans,
      conversations: data.conversations,
      settings: data.settings,
    },
  };
}

/**
 * Validates and upgrades an exported file. Throws a friendly Error when the
 * file is not a DAYFLOW export.
 */
export function parseImport(text) {
  let parsed;
  try {
    parsed = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || parsed.app !== EXPORT_APP_ID || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('That file is not a DAYFLOW AI export.');
  }
  const migrated = migrateData(parsed.data, parsed.version);
  return normalizeAppData(migrated);
}

export function resetAppData() {
  clearAll();
}

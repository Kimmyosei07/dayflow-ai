/**
 * Data shapes and normalisers for everything DAYFLOW stores.
 * Normalisers fill in missing fields and discard invalid values so that
 * old, partial, imported or hand-edited data never breaks the app.
 */
import { createId } from '../../utils/id.js';
import { isValidDateKey, isValidTime } from '../../utils/dateUtils.js';
import { normalizeTask } from '../../utils/taskUtils.js';
import { normalizeCourse } from '../../utils/academicUtils.js';

export { normalizeTask, normalizeCourse };

/** Bump this when the stored structure changes, and add a migration. */
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = {
  displayName: '',
  theme: 'light',
  dailyTaskGoal: 5,
  dailyFocusGoalMinutes: 120,
  focus: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
  },
  notifications: {
    deadlineReminders: true,
    focusAlerts: true,
    sound: true,
  },
  aiProvider: 'auto',
  shareContextWithAssistant: true,
  sidebarCollapsed: false,
};

const clampInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

export function normalizeSettings(raw = {}) {
  const d = DEFAULT_SETTINGS;
  const focus = raw.focus ?? {};
  const notifications = raw.notifications ?? {};
  return {
    displayName: String(raw.displayName ?? '').slice(0, 40),
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    dailyTaskGoal: clampInt(raw.dailyTaskGoal, 1, 50, d.dailyTaskGoal),
    dailyFocusGoalMinutes: clampInt(raw.dailyFocusGoalMinutes, 10, 720, d.dailyFocusGoalMinutes),
    focus: {
      focusMinutes: clampInt(focus.focusMinutes, 1, 180, d.focus.focusMinutes),
      shortBreakMinutes: clampInt(focus.shortBreakMinutes, 1, 60, d.focus.shortBreakMinutes),
      longBreakMinutes: clampInt(focus.longBreakMinutes, 1, 90, d.focus.longBreakMinutes),
      sessionsBeforeLongBreak: clampInt(focus.sessionsBeforeLongBreak, 2, 10, d.focus.sessionsBeforeLongBreak),
      autoStartBreaks: bool(focus.autoStartBreaks, d.focus.autoStartBreaks),
    },
    notifications: {
      deadlineReminders: bool(notifications.deadlineReminders, d.notifications.deadlineReminders),
      focusAlerts: bool(notifications.focusAlerts, d.notifications.focusAlerts),
      sound: bool(notifications.sound, d.notifications.sound),
    },
    aiProvider: ['auto', 'gemini', 'claude'].includes(raw.aiProvider) ? raw.aiProvider : 'auto',
    shareContextWithAssistant: bool(raw.shareContextWithAssistant, d.shareContextWithAssistant),
    sidebarCollapsed: bool(raw.sidebarCollapsed, d.sidebarCollapsed),
  };
}

export function normalizeFocusSession(raw = {}) {
  const minutes = Number(raw.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || !raw.completedAt) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId('focus'),
    taskId: typeof raw.taskId === 'string' ? raw.taskId : null,
    taskTitle: String(raw.taskTitle ?? ''),
    minutes: Math.round(minutes * 10) / 10,
    startedAt: raw.startedAt ?? raw.completedAt,
    completedAt: raw.completedAt,
    isSample: raw.isSample === true,
  };
}

export function normalizePlan(raw = {}) {
  if (!isValidDateKey(raw.date) || !Array.isArray(raw.items)) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId('plan'),
    date: raw.date,
    source: raw.source === 'ai' ? 'ai' : 'rules',
    provider: raw.provider ?? null,
    startTime: isValidTime(raw.startTime) ? raw.startTime : '09:00',
    availableMinutes: Number(raw.availableMinutes) || 0,
    breakMinutes: Number(raw.breakMinutes) || 0,
    summary: String(raw.summary ?? ''),
    items: raw.items
      .filter((i) => i && isValidTime(i.start) && isValidTime(i.end))
      .map((i) => ({
        id: i.id ?? createId('slot'),
        kind: ['task', 'break', 'fixed'].includes(i.kind) ? i.kind : 'task',
        taskId: i.taskId ?? null,
        title: String(i.title ?? ''),
        reason: String(i.reason ?? ''),
        start: i.start,
        end: i.end,
        minutes: Number(i.minutes) || 0,
      })),
    deferred: Array.isArray(raw.deferred) ? raw.deferred : [],
    savedAt: raw.savedAt ?? new Date().toISOString(),
  };
}

export function normalizeConversation(raw = {}) {
  if (!Array.isArray(raw.messages)) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId('chat'),
    title: String(raw.title ?? 'New conversation'),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    messages: raw.messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({
        id: m.id ?? createId('msg'),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt ?? new Date().toISOString(),
        provider: m.provider ?? null,
        isError: m.isError === true,
      })),
  };
}

/** Normalises an array, dropping nulls and duplicate IDs. */
export function normalizeList(list, normalizer) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const item = normalizer(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

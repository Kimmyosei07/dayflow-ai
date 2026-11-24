/**
 * Completed Pomodoro focus sessions (used by Focus Mode history and Analytics).
 */
import { readJSON, writeJSON } from './storageService.js';
import { normalizeFocusSession, normalizeList } from './schema.js';

export const FOCUS_SESSIONS_KEY = 'focusSessions';

export function loadFocusSessions() {
  return normalizeList(readJSON(FOCUS_SESSIONS_KEY, []), normalizeFocusSession);
}

export function saveFocusSessions(list) {
  return writeJSON(FOCUS_SESSIONS_KEY, list);
}

/**
 * Task persistence. Academic activities are tasks too (they carry a courseId).
 */
import { readJSON, writeJSON } from './storageService.js';
import { normalizeTask, normalizeList } from './schema.js';

export const TASKS_KEY = 'tasks';

export function loadTasks() {
  return normalizeList(readJSON(TASKS_KEY, []), normalizeTask);
}

export function saveTasks(list) {
  return writeJSON(TASKS_KEY, list);
}

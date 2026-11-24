/**
 * Course persistence. A course's assignments/quizzes/exams live in taskStorage.
 */
import { readJSON, writeJSON } from './storageService.js';
import { normalizeCourse, normalizeList } from './schema.js';

export const COURSES_KEY = 'courses';

export function loadCourses() {
  return normalizeList(readJSON(COURSES_KEY, []), normalizeCourse);
}

export function saveCourses(list) {
  return writeJSON(COURSES_KEY, list);
}

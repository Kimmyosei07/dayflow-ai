/**
 * Course logic. Academic activities (assignments, quizzes, projects, exams)
 * are stored as tasks with a `courseId`, so a course's activities are simply
 * the tasks that point at it. This keeps the task manager and the academic
 * manager in sync automatically — there is one record, shown in two places.
 */
import { createId } from './id.js';
import { COURSE_COLORS } from './constants.js';
import { isCompleted, isOverdue, sortTasks } from './taskUtils.js';

export function normalizeCourse(raw = {}) {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId('course'),
    name: String(raw.name ?? '').trim() || 'Untitled course',
    code: String(raw.code ?? '').trim().toUpperCase(),
    description: String(raw.description ?? ''),
    lecturer: String(raw.lecturer ?? ''),
    color: COURSE_COLORS.includes(raw.color) ? raw.color : COURSE_COLORS[0],
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    isSample: raw.isSample === true,
  };
}

export function createCourse(input, now = new Date()) {
  const ts = now.toISOString();
  return normalizeCourse({ ...input, id: createId('course'), createdAt: ts, updatedAt: ts });
}

export function validateCourseInput(input, existingCourses = [], editingId = null) {
  const errors = {};
  if (!String(input.name ?? '').trim()) errors.name = 'Course name is required.';
  const code = String(input.code ?? '').trim().toUpperCase();
  if (!code) errors.code = 'Course code is required (e.g. CSC 301).';
  else if (existingCourses.some((c) => c.code === code && c.id !== editingId)) {
    errors.code = 'You already have a course with this code.';
  }
  return errors;
}

export function getCourseTasks(courseId, tasks) {
  return tasks.filter((t) => t.courseId === courseId);
}

/** Progress summary for a course card / details page. */
export function getCourseProgress(courseId, tasks, now = new Date()) {
  const list = getCourseTasks(courseId, tasks);
  const completed = list.filter(isCompleted);
  const pending = list.filter((t) => !isCompleted(t));
  return {
    total: list.length,
    completed: completed.length,
    pending: pending.length,
    overdue: pending.filter((t) => isOverdue(t, now)).length,
    percent: list.length ? Math.round((completed.length / list.length) * 100) : 0,
    upcoming: sortTasks(pending, 'deadline', now),
    completedList: sortTasks(completed, 'created', now),
  };
}

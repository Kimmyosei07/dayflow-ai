/**
 * Pure task business logic: creating, updating, classifying, filtering,
 * sorting and summarising tasks. No React and no storage in here, which
 * makes these functions easy to unit-test (see tests/taskUtils.test.js).
 */
import { createId } from './id.js';
import { PRIORITIES, CATEGORIES, ACADEMIC_TYPES } from './constants.js';
import { toDateKey, parseDateKey, daysBetween, timeToMinutes, isValidDateKey, isValidTime } from './dateUtils.js';

const PRIORITY_VALUES = PRIORITIES.map((p) => p.value);
const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);
const ACADEMIC_VALUES = ACADEMIC_TYPES.map((a) => a.value);

/**
 * Builds a complete task object from (possibly partial) form input.
 * Academic activities are ordinary tasks with a courseId + academicType,
 * so there is only ever ONE record per activity (no duplicates to sync).
 */
export function createTask(input, now = new Date()) {
  const timestamp = now.toISOString();
  return normalizeTask({
    ...input,
    id: createId('task'),
    status: 'pending',
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/** Returns a new task with `changes` applied (never mutates the original). */
export function updateTask(task, changes, now = new Date()) {
  return normalizeTask({ ...task, ...changes, id: task.id, createdAt: task.createdAt, updatedAt: now.toISOString() });
}

/** Completes a pending task, or reopens a completed one. */
export function toggleTaskStatus(task, now = new Date()) {
  const completing = task.status !== 'completed';
  return {
    ...task,
    status: completing ? 'completed' : 'pending',
    completedAt: completing ? now.toISOString() : null,
    updatedAt: now.toISOString(),
  };
}

/**
 * Fills defaults and drops invalid values. Used for new tasks, stored tasks
 * and imported tasks, so corrupted data never crashes the UI.
 */
export function normalizeTask(raw = {}) {
  const minutes = Number(raw.estimatedMinutes);
  const courseId = typeof raw.courseId === 'string' && raw.courseId ? raw.courseId : null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId('task'),
    title: String(raw.title ?? '').trim() || 'Untitled task',
    description: String(raw.description ?? ''),
    notes: String(raw.notes ?? ''),
    category: CATEGORY_VALUES.includes(raw.category) ? raw.category : courseId ? 'academic' : 'other',
    priority: PRIORITY_VALUES.includes(raw.priority) ? raw.priority : 'medium',
    deadline: isValidDateKey(raw.deadline) ? raw.deadline : null,
    deadlineTime: isValidDateKey(raw.deadline) && isValidTime(raw.deadlineTime) ? raw.deadlineTime : null,
    estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
    status: raw.status === 'completed' ? 'completed' : 'pending',
    completedAt: raw.status === 'completed' ? raw.completedAt ?? raw.updatedAt ?? null : null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    courseId,
    academicType: courseId && ACADEMIC_VALUES.includes(raw.academicType) ? raw.academicType : courseId ? 'assignment' : null,
    isSample: raw.isSample === true,
  };
}

/** Validates task form input. Returns an object of field -> message. */
export function validateTaskInput(input) {
  const errors = {};
  const title = String(input.title ?? '').trim();
  if (!title) errors.title = 'Please give the task a title.';
  else if (title.length > 120) errors.title = 'Keep the title under 120 characters.';

  if (input.deadline && !isValidDateKey(input.deadline)) errors.deadline = 'Enter a valid date.';
  if (input.deadlineTime && !input.deadline) errors.deadlineTime = 'Add a date before adding a time.';

  if (input.estimatedMinutes !== '' && input.estimatedMinutes != null) {
    const m = Number(input.estimatedMinutes);
    if (!Number.isFinite(m) || m <= 0) errors.estimatedMinutes = 'Duration must be a positive number of minutes.';
    else if (m > 16 * 60) errors.estimatedMinutes = 'That is over 16 hours — consider breaking it into smaller tasks.';
  }
  return errors;
}

/** Exact moment a task is due. Tasks without a time are due at the end of the day. */
export function getDueDate(task) {
  const date = parseDateKey(task.deadline);
  if (!date) return null;
  const mins = task.deadlineTime ? timeToMinutes(task.deadlineTime) : 24 * 60 - 1;
  date.setMinutes(mins, task.deadlineTime ? 0 : 59);
  return date;
}

export const isCompleted = (task) => task.status === 'completed';

export function isOverdue(task, now = new Date()) {
  if (isCompleted(task)) return false;
  const due = getDueDate(task);
  return Boolean(due && due < now);
}

export function isDueToday(task, now = new Date()) {
  return task.deadline === toDateKey(now);
}

/** Pending tasks due after today. */
export function isUpcoming(task, now = new Date()) {
  if (isCompleted(task) || !task.deadline) return false;
  return daysBetween(toDateKey(now), task.deadline) > 0;
}

export function wasCompletedOn(task, dateKey) {
  return isCompleted(task) && task.completedAt && toDateKey(new Date(task.completedAt)) === dateKey;
}

/** Does the task belong to the given view tab? */
export function matchesView(task, view, now = new Date()) {
  switch (view) {
    case 'today':
      return isDueToday(task, now) || (isOverdue(task, now) && !isCompleted(task));
    case 'upcoming':
      return isUpcoming(task, now);
    case 'completed':
      return isCompleted(task);
    case 'overdue':
      return isOverdue(task, now);
    case 'all':
    default:
      return true;
  }
}

/** Applies view, category, priority, course and text-search filters. */
export function filterTasks(tasks, filters = {}, now = new Date()) {
  const { view = 'all', category = 'all', priority = 'all', courseId = 'all', search = '' } = filters;
  const query = search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (!matchesView(task, view, now)) return false;
    if (category !== 'all' && task.category !== category) return false;
    if (priority !== 'all' && task.priority !== priority) return false;
    if (courseId !== 'all' && task.courseId !== courseId) return false;
    if (query) {
      const haystack = `${task.title} ${task.description} ${task.notes}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

const priorityWeight = (p) => PRIORITIES.find((x) => x.value === p)?.weight ?? 0;

/**
 * Urgency + importance score used by "Smart" sorting and the planner.
 * Higher = do sooner. Kept deliberately simple so it can be explained.
 */
export function getTaskScore(task, now = new Date()) {
  let score = priorityWeight(task.priority) * 10; // 10..30
  if (task.deadline) {
    const days = daysBetween(toDateKey(now), task.deadline);
    if (days < 0) score += 40;
    else if (days === 0) score += 35;
    else if (days === 1) score += 25;
    else if (days <= 3) score += 18;
    else if (days <= 7) score += 10;
    else score += 3;
  }
  if (task.academicType === 'exam') score += 5;
  return score;
}

export function sortTasks(tasks, sortBy = 'smart', now = new Date()) {
  const list = [...tasks];
  const dueValue = (t) => getDueDate(t)?.getTime() ?? Number.POSITIVE_INFINITY;
  const byCompletion = (a, b) => Number(isCompleted(a)) - Number(isCompleted(b));

  const comparators = {
    deadline: (a, b) => dueValue(a) - dueValue(b),
    priority: (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || dueValue(a) - dueValue(b),
    created: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
    title: (a, b) => a.title.localeCompare(b.title),
    smart: (a, b) => getTaskScore(b, now) - getTaskScore(a, now) || dueValue(a) - dueValue(b),
  };
  const compare = comparators[sortBy] ?? comparators.smart;
  // Completed tasks always sink to the bottom so active work stays visible.
  return list.sort((a, b) => byCompletion(a, b) || compare(a, b));
}

/** Counts used by the dashboard cards. */
export function getTaskStats(tasks, now = new Date()) {
  const todayKey = toDateKey(now);
  const stats = { total: tasks.length, completed: 0, pending: 0, overdue: 0, dueToday: 0, completedToday: 0 };
  for (const task of tasks) {
    if (isCompleted(task)) stats.completed += 1;
    else stats.pending += 1;
    if (isOverdue(task, now)) stats.overdue += 1;
    if (!isCompleted(task) && isDueToday(task, now)) stats.dueToday += 1;
    if (wasCompletedOn(task, todayKey)) stats.completedToday += 1;
  }
  return stats;
}

/**
 * Today's progress: tasks that "belong" to today are those due today,
 * overdue ones still pending, and anything completed today.
 */
export function getTodayProgress(tasks, now = new Date()) {
  const todayKey = toDateKey(now);
  const relevant = tasks.filter(
    (t) => isDueToday(t, now) || isOverdue(t, now) || wasCompletedOn(t, todayKey),
  );
  const done = relevant.filter(isCompleted).length;
  return {
    done,
    total: relevant.length,
    percent: relevant.length ? Math.round((done / relevant.length) * 100) : 0,
  };
}

/** Pending tasks with a deadline, soonest first (overdue included). */
export function getUpcomingDeadlines(tasks, now = new Date(), limit = 5) {
  return sortTasks(
    tasks.filter((t) => !isCompleted(t) && t.deadline),
    'deadline',
    now,
  ).slice(0, limit);
}

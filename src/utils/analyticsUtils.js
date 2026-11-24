/**
 * Analytics calculations. Everything is derived from real stored data —
 * tasks (createdAt / completedAt) and recorded focus sessions.
 */
import { CATEGORIES } from './constants.js';
import { toDateKey, addDays, startOfWeek } from './dateUtils.js';
import { isCompleted } from './taskUtils.js';

const keyOf = (iso) => (iso ? toDateKey(new Date(iso)) : null);

/** Groups a list by local date key using the given timestamp field. */
function countByDay(list, field, valueFn = () => 1) {
  const map = new Map();
  for (const item of list) {
    const key = keyOf(item[field]);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + valueFn(item));
  }
  return map;
}

export function getOverview(tasks) {
  const completed = tasks.filter(isCompleted).length;
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

/** Last `days` days (oldest first) with completed tasks, created tasks and focus minutes. */
export function getDailySeries(tasks, sessions, now = new Date(), days = 7) {
  const completed = countByDay(tasks.filter(isCompleted), 'completedAt');
  const created = countByDay(tasks, 'createdAt');
  const focus = countByDay(sessions, 'completedAt', (s) => s.minutes || 0);
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(now, -i);
    const key = toDateKey(date);
    series.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      completed: completed.get(key) ?? 0,
      created: created.get(key) ?? 0,
      focusMinutes: focus.get(key) ?? 0,
    });
  }
  return series;
}

/** Last `weeks` Monday-based weeks (oldest first). */
export function getWeeklySeries(tasks, sessions, now = new Date(), weeks = 6) {
  const thisWeek = startOfWeek(now);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(thisWeek, -7 * i);
    buckets.push({
      start,
      end: addDays(start, 7),
      label: i === 0 ? 'This wk' : start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      completed: 0,
      focusMinutes: 0,
    });
  }
  const place = (iso, apply) => {
    if (!iso) return;
    const d = new Date(iso);
    const bucket = buckets.find((b) => d >= b.start && d < b.end);
    if (bucket) apply(bucket);
  };
  tasks.filter(isCompleted).forEach((t) => place(t.completedAt, (b) => { b.completed += 1; }));
  sessions.forEach((s) => place(s.completedAt, (b) => { b.focusMinutes += s.minutes || 0; }));
  return buckets.map(({ label, completed, focusMinutes }) => ({ label, completed, focusMinutes }));
}

export function getCategoryDistribution(tasks) {
  return CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    color: c.color,
    count: tasks.filter((t) => t.category === c.value).length,
    completed: tasks.filter((t) => t.category === c.value && isCompleted(t)).length,
  })).filter((c) => c.count > 0);
}

export function getFocusStats(sessions, now = new Date()) {
  const todayKey = toDateKey(now);
  const weekStart = startOfWeek(now);
  let totalMinutes = 0;
  let todayMinutes = 0;
  let weekMinutes = 0;
  for (const s of sessions) {
    const minutes = s.minutes || 0;
    totalMinutes += minutes;
    if (keyOf(s.completedAt) === todayKey) todayMinutes += minutes;
    if (new Date(s.completedAt) >= weekStart) weekMinutes += minutes;
  }
  return {
    totalMinutes,
    todayMinutes,
    weekMinutes,
    totalSessions: sessions.length,
    todaySessions: sessions.filter((s) => keyOf(s.completedAt) === todayKey).length,
    averageMinutes: sessions.length ? Math.round(totalMinutes / sessions.length) : 0,
  };
}

/** Compares tasks completed this week so far with the whole of last week. */
export function getWeeklyTrend(tasks, now = new Date()) {
  const thisStart = startOfWeek(now);
  const lastStart = addDays(thisStart, -7);
  let thisWeek = 0;
  let lastWeek = 0;
  for (const t of tasks) {
    if (!isCompleted(t) || !t.completedAt) continue;
    const d = new Date(t.completedAt);
    if (d >= thisStart) thisWeek += 1;
    else if (d >= lastStart) lastWeek += 1;
  }
  const change = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return { thisWeek, lastWeek, change };
}

/** Consecutive days (ending today or yesterday) with at least one completed task. */
export function getCompletionStreak(tasks, now = new Date()) {
  const days = new Set(tasks.filter(isCompleted).map((t) => keyOf(t.completedAt)).filter(Boolean));
  let cursor = new Date(now);
  if (!days.has(toDateKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Weekday on which the user has completed the most tasks (or null). */
export function getMostProductiveWeekday(tasks) {
  const counts = new Array(7).fill(0);
  tasks.filter(isCompleted).forEach((t) => {
    if (t.completedAt) counts[new Date(t.completedAt).getDay()] += 1;
  });
  const max = Math.max(...counts);
  if (max === 0) return null;
  const index = counts.indexOf(max);
  const ref = addDays(startOfWeek(new Date()), (index + 6) % 7);
  return { name: ref.toLocaleDateString(undefined, { weekday: 'long' }), count: max };
}

/**
 * Daily planner engine.
 *
 * Design decision: the AI is asked to decide the ORDER of tasks and to
 * EXPLAIN its reasoning, but the actual clock times are always calculated
 * here, in plain code. That guarantees the schedule is never impossible
 * (no overlaps, nothing past the user's available hours) regardless of what
 * the AI returns. Without AI, `rankTasks` provides a rule-based order.
 */
import { getTaskScore, isOverdue } from './taskUtils.js';
import { toDateKey, daysBetween, timeToMinutes, minutesToTime, formatDuration } from './dateUtils.js';
import { createId } from './id.js';

export const DEFAULT_TASK_MINUTES = 30;
const END_OF_DAY = 24 * 60;

export const durationOf = (task) => task.estimatedMinutes || DEFAULT_TASK_MINUTES;

/** Plain-English explanation of why a task got its rule-based ranking. */
export function explainTask(task, now = new Date()) {
  const parts = [];
  if (task.deadline) {
    const days = daysBetween(toDateKey(now), task.deadline);
    if (isOverdue(task, now)) parts.push('it is already overdue');
    else if (days === 0) parts.push('it is due today');
    else if (days === 1) parts.push('it is due tomorrow');
    else if (days <= 3) parts.push(`it is due in ${days} days`);
    else parts.push(`its deadline is ${days} days away`);
  } else {
    parts.push('it has no deadline');
  }
  parts.push(`it is ${task.priority} priority`);
  if (task.academicType === 'exam') parts.push('exam preparation benefits from early, spaced study');
  return `Placed here because ${parts.join(', ')}.`;
}

/** Rule-based ordering: highest urgency/importance score first. */
export function rankTasks(tasks, now = new Date()) {
  return [...tasks]
    .sort((a, b) => getTaskScore(b, now) - getTaskScore(a, now) || durationOf(a) - durationOf(b))
    .map((task) => ({ taskId: task.id, title: task.title, minutes: durationOf(task), reason: explainTask(task, now) }));
}

/**
 * Converts the user's available window minus fixed activities (lectures,
 * work shifts...) into a list of free intervals.
 */
export function getFreeIntervals(windowStart, windowEnd, fixedBlocks = []) {
  const busy = fixedBlocks
    .map((b) => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end) && b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const free = [];
  let cursor = windowStart;
  for (const block of busy) {
    if (block.end <= cursor) continue;
    if (block.start >= windowEnd) break;
    if (block.start > cursor) free.push({ start: cursor, end: Math.min(block.start, windowEnd) });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < windowEnd) free.push({ start: cursor, end: windowEnd });
  return free;
}

/**
 * Builds a feasible schedule.
 *
 * @param {object} options
 * @param {Array<{taskId,title,minutes,reason}>} options.entries  tasks in preferred order
 * @param {string} options.startTime         "HH:MM"
 * @param {number} options.availableMinutes  total minutes the user can spend
 * @param {number} options.breakMinutes      break inserted between consecutive tasks
 * @param {Array<{title,start,end}>} options.fixedBlocks  existing commitments
 * @returns {{items, deferred, warnings, stats}}
 */
export function buildSchedule({ entries = [], startTime, availableMinutes, breakMinutes = 0, fixedBlocks = [] }) {
  const warnings = [];
  const windowStart = timeToMinutes(startTime);
  if (Number.isNaN(windowStart)) throw new Error('A valid start time is required.');

  // "Available time" means WORKING time, so existing activities inside the
  // window push the end of the day later. Repeat until the end stops moving.
  const working = Math.max(0, Number(availableMinutes) || 0);
  let windowEnd = windowStart + working;
  for (let i = 0; i < 20; i += 1) {
    const free = getFreeIntervals(windowStart, windowEnd, fixedBlocks).reduce((s, iv) => s + (iv.end - iv.start), 0);
    const missing = working - free;
    if (missing <= 0) break;
    windowEnd += missing;
  }
  if (windowEnd > END_OF_DAY) {
    warnings.push('Your available time runs past midnight, so the plan stops at 11:59 PM.');
    windowEnd = END_OF_DAY - 1;
  }

  // Fixed activities overlapping the window are shown in the timeline.
  const fixedInWindow = fixedBlocks.filter((b) => {
    const s = timeToMinutes(b.start);
    const e = timeToMinutes(b.end);
    return !Number.isNaN(s) && !Number.isNaN(e) && e > s && s < windowEnd && e > windowStart;
  });

  const intervals = getFreeIntervals(windowStart, windowEnd, fixedInWindow).map((i) => ({ ...i, cursor: i.start, used: false }));
  const items = [];
  const deferred = [];
  const brk = Math.max(0, Number(breakMinutes) || 0);

  // First-fit: each task goes into the earliest free interval with room.
  for (const entry of entries) {
    const minutes = Math.max(5, Math.round(entry.minutes || DEFAULT_TASK_MINUTES));
    const slot = intervals.find((iv) => iv.cursor + (iv.used ? brk : 0) + minutes <= iv.end);
    if (!slot) {
      const longestGap = Math.max(0, ...intervals.map((iv) => iv.end - iv.cursor - (iv.used ? brk : 0)));
      deferred.push({
        taskId: entry.taskId,
        title: entry.title,
        minutes,
        reason:
          minutes > windowEnd - windowStart
            ? `Needs ${formatDuration(minutes)}, which is more than your total available time. Consider breaking it into smaller tasks.`
            : `Needs ${formatDuration(minutes)} but the largest remaining gap is ${formatDuration(longestGap)}. Defer it to another day or free up time.`,
      });
      continue;
    }
    if (slot.used && brk > 0) {
      items.push({ id: createId('slot'), kind: 'break', title: 'Break', start: minutesToTime(slot.cursor), end: minutesToTime(slot.cursor + brk), minutes: brk });
      slot.cursor += brk;
    }
    items.push({
      id: createId('slot'),
      kind: 'task',
      taskId: entry.taskId,
      title: entry.title,
      reason: entry.reason ?? '',
      start: minutesToTime(slot.cursor),
      end: minutesToTime(slot.cursor + minutes),
      minutes,
    });
    slot.cursor += minutes;
    slot.used = true;
  }

  for (const b of fixedInWindow) {
    items.push({ id: createId('slot'), kind: 'fixed', title: b.title || 'Busy', start: b.start, end: b.end, minutes: timeToMinutes(b.end) - timeToMinutes(b.start) });
  }
  items.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  const requestedMinutes = entries.reduce((sum, e) => sum + Math.max(5, Math.round(e.minutes || DEFAULT_TASK_MINUTES)), 0);
  const scheduledMinutes = items.filter((i) => i.kind === 'task').reduce((s, i) => s + i.minutes, 0);
  const freeMinutes = intervals.reduce((s, iv) => s + (iv.end - iv.start), 0);

  if (deferred.length) {
    warnings.push(
      `Your selected tasks need about ${formatDuration(requestedMinutes)} but only ${formatDuration(freeMinutes)} is free. ${deferred.length} task${deferred.length > 1 ? 's were' : ' was'} deferred.`,
    );
  }

  return {
    items,
    deferred,
    warnings,
    stats: {
      requestedMinutes,
      scheduledMinutes,
      freeMinutes,
      endTime: items.length ? items[items.length - 1].end : minutesToTime(windowStart),
    },
  };
}

/** Pulls the first JSON object out of an AI reply (handles ```json fences). */
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Validates an AI planning reply against the tasks the user actually chose.
 * Unknown IDs are dropped; tasks the AI forgot are appended with a rule-based
 * reason. Returns null if the reply is unusable.
 */
export function parseAiPlan(text, tasks, now = new Date()) {
  const data = extractJson(text);
  if (!data || !Array.isArray(data.order)) return null;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const seen = new Set();
  const entries = [];

  for (const item of data.order) {
    const id = typeof item === 'string' ? item : item?.taskId;
    const task = byId.get(id);
    if (!task || seen.has(id)) continue;
    seen.add(id);
    entries.push({
      taskId: id,
      title: task.title,
      minutes: durationOf(task),
      reason: typeof item?.reason === 'string' && item.reason.trim() ? item.reason.trim() : explainTask(task, now),
    });
  }
  if (entries.length === 0) return null;

  for (const task of tasks) {
    if (!seen.has(task.id)) entries.push({ taskId: task.id, title: task.title, minutes: durationOf(task), reason: explainTask(task, now) });
  }

  return {
    entries,
    summary: typeof data.summary === 'string' ? data.summary.trim() : '',
    tips: Array.isArray(data.tips) ? data.tips.filter((t) => typeof t === 'string').slice(0, 4) : [],
  };
}

/** Moves an entry up (-1) or down (+1); returns a new array. */
export function moveEntry(entries, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= entries.length) return entries;
  const copy = [...entries];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

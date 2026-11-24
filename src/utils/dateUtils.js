/**
 * Date helpers.
 *
 * DAYFLOW stores calendar dates as local "YYYY-MM-DD" strings ("date keys")
 * and times as "HH:MM". Keeping them as strings avoids timezone surprises
 * that happen when you store midnight as an ISO timestamp.
 *
 * Every function that depends on "now" accepts it as a parameter so the
 * logic can be unit-tested with a fixed date.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DD" in local time. */
export function toDateKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" -> Date at local midnight. Returns null for invalid input. */
export function parseDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // Reject impossible dates such as 2025-02-31
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidDateKey(key) {
  return parseDateKey(key) !== null;
}

export function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole calendar days from key `a` to key `b` (b - a). */
export function daysBetween(aKey, bKey) {
  const a = parseDateKey(aKey);
  const b = parseDateKey(bKey);
  if (!a || !b) return NaN;
  // Math.round handles daylight-saving hour shifts.
  return Math.round((b - a) / 86400000);
}

/** Monday-based start of the week, at local midnight. */
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -day);
}

/** "HH:MM" -> minutes after midnight. */
export function timeToMinutes(time) {
  if (!isValidTime(time)) return NaN;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes after midnight -> "HH:MM" (clamped to the same day). */
export function minutesToTime(totalMinutes) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** 95 -> "1h 35m", 30 -> "30m", 120 -> "2h". */
export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** "14:30" -> "2:30 PM" */
export function formatTime12(time) {
  const mins = timeToMinutes(time);
  if (Number.isNaN(mins)) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${suffix}`;
}

export function formatDateKey(key, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const date = parseDateKey(key);
  if (!date) return '';
  return date.toLocaleDateString(undefined, options);
}

export function formatLongDate(date = new Date()) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Human-friendly description of a deadline relative to today. */
export function describeDeadline(key, now = new Date()) {
  const diff = daysBetween(toDateKey(now), key);
  if (Number.isNaN(diff)) return 'No deadline';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff < 7) return `In ${diff} days`;
  return formatDateKey(key);
}

export function getGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Formats an ISO timestamp as a short clock time, e.g. "9:41 AM". */
export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Current local time rounded up to the next 15 minutes, as "HH:MM". */
export function nextQuarterHour(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(mins / 15) * 15;
  return minutesToTime(Math.min(rounded, 23 * 60 + 45));
}

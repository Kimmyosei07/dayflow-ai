/**
 * Pomodoro rules, separated from React so they can be unit-tested.
 */
export const TIMER_MODES = [
  { value: 'focus', label: 'Focus' },
  { value: 'shortBreak', label: 'Short break' },
  { value: 'longBreak', label: 'Long break' },
];

/** Duration of a mode in milliseconds, based on the user's focus settings. */
export function getModeDurationMs(mode, focusSettings) {
  const minutes =
    mode === 'shortBreak' ? focusSettings.shortBreakMinutes : mode === 'longBreak' ? focusSettings.longBreakMinutes : focusSettings.focusMinutes;
  return minutes * 60 * 1000;
}

/**
 * Which mode follows the one that just finished.
 * `focusCountInCycle` is the number of focus sessions completed so far
 * (including the one that just finished).
 */
export function getNextMode(finishedMode, focusCountInCycle, sessionsBeforeLongBreak) {
  if (finishedMode !== 'focus') return 'focus';
  return focusCountInCycle > 0 && focusCountInCycle % sessionsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
}

/** 1499000 -> "24:59" */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * FocusTimerContext — a Pomodoro timer that lives at the app level, so it
 * keeps running while you navigate between pages (and even survives a page
 * refresh, because its state is saved to LocalStorage).
 *
 * The timer stores an absolute `endTime` rather than counting down second by
 * second. That keeps it accurate even when the browser throttles background tabs.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from './AppDataContext.jsx';
import { useUi } from './UiContext.jsx';
import { readJSON, writeJSON } from '../services/storage/storageService.js';
import { getModeDurationMs, getNextMode } from '../utils/timerUtils.js';

const FocusTimerContext = createContext(null);
const TIMER_KEY = 'timerState';

/** Short, gentle two-note chime using the Web Audio API (no audio files needed). */
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio is optional */
  }
}

function notifyBrowser(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/favicon.svg' });
  } catch {
    /* notifications are optional */
  }
}

export function FocusTimerProvider({ children }) {
  const { settings, tasks, addFocusSession } = useAppData();
  const { toast } = useUi();
  const focus = settings.focus;

  const [timer, setTimer] = useState(() => {
    const saved = readJSON(TIMER_KEY, null);
    if (saved && ['focus', 'shortBreak', 'longBreak'].includes(saved.mode)) return saved;
    return { mode: 'focus', status: 'idle', endTime: null, remainingMs: getModeDurationMs('focus', focus), cycleCount: 0, taskId: null, startedAt: null };
  });
  const [nowMs, setNowMs] = useState(Date.now());
  const completedEndTimes = useRef(new Set());

  useEffect(() => {
    writeJSON(TIMER_KEY, timer);
  }, [timer]);

  // Tick while running.
  useEffect(() => {
    if (timer.status !== 'running') return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.status]);

  // When idle, keep the displayed duration in sync with Settings.
  useEffect(() => {
    if (timer.status === 'idle') {
      const ms = getModeDurationMs(timer.mode, focus);
      if (ms !== timer.remainingMs) setTimer((t) => ({ ...t, remainingMs: ms }));
    }
  }, [focus, timer.status, timer.mode, timer.remainingMs]);

  const remainingMs = timer.status === 'running' ? Math.max(0, timer.endTime - nowMs) : timer.remainingMs;
  const totalMs = getModeDurationMs(timer.mode, focus);

  /** Finishes the current phase: records focus sessions and moves to the next mode. */
  const completePhase = useCallback(() => {
    if (completedEndTimes.current.has(timer.endTime)) return; // guard against double-completion
    completedEndTimes.current.add(timer.endTime);

    let cycleCount = timer.cycleCount;
    if (timer.mode === 'focus') {
      cycleCount += 1;
      const task = tasks.find((t) => t.id === timer.taskId);
      addFocusSession({
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? '',
        // Planned length of this session (pauses don't count as focus time).
        minutes: Math.round(((timer.durationMs ?? totalMs) / 60000) * 10) / 10,
        startedAt: new Date(timer.startedAt ?? timer.endTime - totalMs).toISOString(),
        completedAt: new Date(timer.endTime).toISOString(),
      });
    }

    const next = getNextMode(timer.mode, cycleCount, focus.sessionsBeforeLongBreak);
    const message = timer.mode === 'focus' ? `Focus session complete! Time for a ${next === 'longBreak' ? 'long' : 'short'} break.` : 'Break over — ready to focus?';
    toast(message, 'info', 6000);
    if (settings.notifications.sound) playChime();
    if (settings.notifications.focusAlerts) notifyBrowser('DAYFLOW AI', message);

    const autoStart = timer.mode === 'focus' && focus.autoStartBreaks;
    const nextMs = getModeDurationMs(next, focus);
    const now = Date.now();
    setTimer((t) => ({
      ...t,
      mode: next,
      cycleCount,
      status: autoStart ? 'running' : 'idle',
      endTime: autoStart ? now + nextMs : null,
      startedAt: autoStart ? now : null,
      durationMs: autoStart ? nextMs : null,
      remainingMs: nextMs,
    }));
  }, [timer, tasks, addFocusSession, focus, totalMs, toast, settings.notifications]);

  useEffect(() => {
    if (timer.status === 'running' && remainingMs <= 0) completePhase();
  }, [timer.status, remainingMs, completePhase]);

  // Show the countdown in the browser tab while running.
  useEffect(() => {
    if (timer.status !== 'running') return;
    const m = Math.floor(Math.ceil(remainingMs / 1000) / 60);
    const s = Math.ceil(remainingMs / 1000) % 60;
    document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} — DAYFLOW AI`;
  }, [remainingMs, timer.status, timer.mode]);

  const start = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setTimer((t) => ({
      ...t,
      status: 'running',
      endTime: now + t.remainingMs,
      // Keep the original start time when resuming after a pause.
      startedAt: t.status === 'paused' && t.startedAt ? t.startedAt : now,
      durationMs: t.status === 'paused' && t.durationMs ? t.durationMs : t.remainingMs,
    }));
    if (settings.notifications.focusAlerts && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.notifications.focusAlerts]);

  const pause = useCallback(() => {
    setTimer((t) => (t.status === 'running' ? { ...t, status: 'paused', remainingMs: Math.max(0, t.endTime - Date.now()), endTime: null } : t));
  }, []);

  const reset = useCallback(() => {
    setTimer((t) => ({ ...t, status: 'idle', endTime: null, startedAt: null, remainingMs: getModeDurationMs(t.mode, focus) }));
  }, [focus]);

  const setMode = useCallback(
    (mode) => setTimer((t) => ({ ...t, mode, status: 'idle', endTime: null, startedAt: null, remainingMs: getModeDurationMs(mode, focus) })),
    [focus],
  );

  /** Skips to the next phase without recording a session. */
  const skip = useCallback(() => {
    setTimer((t) => {
      const next = getNextMode(t.mode, t.mode === 'focus' ? t.cycleCount + 1 : t.cycleCount, focus.sessionsBeforeLongBreak);
      return { ...t, mode: next, status: 'idle', endTime: null, startedAt: null, remainingMs: getModeDurationMs(next, focus) };
    });
  }, [focus]);

  const setTaskId = useCallback((taskId) => setTimer((t) => ({ ...t, taskId: taskId || null })), []);
  const resetCycle = useCallback(() => setTimer((t) => ({ ...t, cycleCount: 0 })), []);

  const value = useMemo(
    () => ({ ...timer, remainingMs, totalMs, start, pause, reset, skip, setMode, setTaskId, resetCycle }),
    [timer, remainingMs, totalMs, start, pause, reset, skip, setMode, setTaskId, resetCycle],
  );

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error('useFocusTimer must be used inside <FocusTimerProvider>');
  return ctx;
}

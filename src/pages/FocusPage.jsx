import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, SkipForward, History, Trash2, Settings2, Target, Flame } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ProgressRing from '../components/ui/ProgressRing.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import FormField from '../components/ui/FormField.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import { SampleBadge } from '../components/ui/Badges.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useFocusTimer } from '../context/FocusTimerContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { TIMER_MODES, formatClock } from '../utils/timerUtils.js';
import { getFocusStats } from '../utils/analyticsUtils.js';
import { formatDuration, formatTimestamp, toDateKey, formatDateKey } from '../utils/dateUtils.js';
import { sortTasks, isCompleted } from '../utils/taskUtils.js';

export default function FocusPage() {
  const { tasks, focusSessions, settings, updateSettings, deleteFocusSession, now } = useAppData();
  const timer = useFocusTimer();
  const { toast, confirm } = useUi();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);

  // Arriving from a task's "focus" button pre-selects that task.
  useEffect(() => {
    const taskId = location.state?.taskId;
    if (taskId && timer.status === 'idle') timer.setTaskId(taskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const pending = useMemo(() => sortTasks(tasks.filter((t) => !isCompleted(t)), 'smart', now), [tasks, now]);
  const stats = useMemo(() => getFocusStats(focusSessions, now), [focusSessions, now]);
  const selectedTask = tasks.find((t) => t.id === timer.taskId);
  const percent = timer.totalMs ? ((timer.totalMs - timer.remainingMs) / timer.totalMs) * 100 : 0;
  const isBreak = timer.mode !== 'focus';
  const cyclePosition = timer.cycleCount % settings.focus.sessionsBeforeLongBreak;
  const history = useMemo(
    () => [...focusSessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 15),
    [focusSessions],
  );

  const changeMode = async (mode) => {
    if (mode === timer.mode) return;
    if (timer.status !== 'idle') {
      const ok = await confirm({ title: 'Switch timer mode?', message: 'The current countdown will be reset and not recorded.', confirmLabel: 'Switch', tone: 'primary' });
      if (!ok) return;
    }
    timer.setMode(mode);
  };

  const handleReset = async () => {
    if (timer.status === 'running' || timer.status === 'paused') {
      const ok = await confirm({ title: 'Reset the timer?', message: 'Progress in this session will be lost and not recorded.', confirmLabel: 'Reset' });
      if (!ok) return;
    }
    timer.reset();
  };

  const updateFocus = (field) => (e) => {
    const value = Number(e.target.value);
    if (Number.isFinite(value) && value > 0) updateSettings({ focus: { [field]: value } });
  };

  const removeSession = async (session) => {
    const ok = await confirm({ title: 'Delete this focus session?', message: 'It will be removed from your history and analytics.', confirmLabel: 'Delete' });
    if (ok) {
      deleteFocusSession(session.id);
      toast('Focus session deleted');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Focus Mode" subtitle="Work in focused Pomodoro sessions with regular breaks." />

      <div className="focus-layout">
        <div className={`card focus-card ${isBreak ? 'is-break' : ''}`}>
          <Tabs label="Timer mode" value={timer.mode} onChange={changeMode} options={TIMER_MODES} />

          <ProgressRing value={percent} size={260} stroke={14} color={isBreak ? 'var(--color-success)' : undefined}>
            <div className="timer-display">
              <span className="timer-display__time" aria-live="off">{formatClock(timer.remainingMs)}</span>
              <span className="timer-display__label">
                {timer.status === 'paused' ? 'Paused' : timer.mode === 'focus' ? 'Focus time' : timer.mode === 'shortBreak' ? 'Short break' : 'Long break'}
              </span>
            </div>
          </ProgressRing>

          <div className="session-dots" aria-label={`Session ${cyclePosition + 1} of ${settings.focus.sessionsBeforeLongBreak} before a long break`}>
            {Array.from({ length: settings.focus.sessionsBeforeLongBreak }, (_, i) => (
              <span key={i} className={`session-dot ${i < cyclePosition ? 'is-done' : ''}`} />
            ))}
          </div>

          <div className="timer-controls">
            <button type="button" className="icon-btn timer-controls__side" onClick={handleReset} aria-label="Reset timer" title="Reset">
              <RotateCcw size={20} />
            </button>
            {timer.status === 'running' ? (
              <button type="button" className="btn btn--primary btn--lg timer-controls__main" onClick={timer.pause}>
                <Pause size={20} /> Pause
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--lg timer-controls__main" onClick={timer.start}>
                <Play size={20} /> {timer.status === 'paused' ? 'Resume' : 'Start'}
              </button>
            )}
            <button type="button" className="icon-btn timer-controls__side" onClick={timer.skip} aria-label="Skip to next phase" title="Skip to next phase (not recorded)">
              <SkipForward size={20} />
            </button>
          </div>

          <div className="focus-task">
            <label htmlFor="focus-task" className="field__label row" style={{ gap: 6 }}>
              <Target size={15} /> Working on
            </label>
            <select
              id="focus-task"
              className="select"
              value={timer.taskId ?? ''}
              onChange={(e) => timer.setTaskId(e.target.value)}
              disabled={timer.status === 'running'}
              title={timer.status === 'running' ? 'Pause to change the task' : undefined}
            >
              <option value="">No specific task</option>
              {pending.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
              {selectedTask && isCompleted(selectedTask) && <option value={selectedTask.id}>{selectedTask.title} (completed)</option>}
            </select>
          </div>
        </div>

        <div className="stack">
          <div className="grid grid-2">
            <div className="card">
              <div className="stat-card__value">{formatDuration(stats.todayMinutes)}</div>
              <div className="stat-card__label">Focus today · goal {formatDuration(settings.dailyFocusGoalMinutes)}</div>
            </div>
            <div className="card">
              <div className="stat-card__value row" style={{ gap: 6 }}>
                <Flame size={20} style={{ color: 'var(--color-warning)' }} /> {stats.todaySessions}
              </div>
              <div className="stat-card__label">Sessions today · {stats.totalSessions} all time</div>
            </div>
          </div>

          <div className="card">
            <button type="button" className="card__header collapsible" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>
              <span className="card__title">
                <Settings2 size={18} /> Timer durations
              </span>
              <span className="text-xs muted">
                {settings.focus.focusMinutes}/{settings.focus.shortBreakMinutes}/{settings.focus.longBreakMinutes} min
              </span>
            </button>
            {showSettings && (
              <div className="form-grid">
                <FormField label="Focus (min)" htmlFor="f-focus">
                  <input id="f-focus" type="number" min="1" max="180" className="input" value={settings.focus.focusMinutes} onChange={updateFocus('focusMinutes')} />
                </FormField>
                <FormField label="Short break (min)" htmlFor="f-short">
                  <input id="f-short" type="number" min="1" max="60" className="input" value={settings.focus.shortBreakMinutes} onChange={updateFocus('shortBreakMinutes')} />
                </FormField>
                <FormField label="Long break (min)" htmlFor="f-long">
                  <input id="f-long" type="number" min="1" max="90" className="input" value={settings.focus.longBreakMinutes} onChange={updateFocus('longBreakMinutes')} />
                </FormField>
                <FormField label="Sessions before long break" htmlFor="f-cycle">
                  <input id="f-cycle" type="number" min="2" max="10" className="input" value={settings.focus.sessionsBeforeLongBreak} onChange={updateFocus('sessionsBeforeLongBreak')} />
                </FormField>
                <p className="text-xs muted span-2">Changes apply to the next countdown. Defaults: 25 / 5 / 15 minutes.</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <History size={18} /> Session history
              </div>
              <span className="card__subtitle">{stats.totalSessions} completed</span>
            </div>
            {history.length === 0 ? (
              <EmptyState compact icon={History} title="No sessions yet" message="Completed focus sessions are recorded here and in Analytics." />
            ) : (
              <ul>
                {history.map((s) => {
                  const key = toDateKey(new Date(s.completedAt));
                  return (
                    <li key={s.id} className="list-row">
                      <span className="dot" style={{ background: 'var(--color-primary)' }} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="text-sm truncate" style={{ fontWeight: 600 }}>
                          {s.taskTitle || 'Focus session'}
                        </div>
                        <div className="text-xs muted">
                          {key === toDateKey(now) ? 'Today' : formatDateKey(key)} · {formatTimestamp(s.completedAt)}
                        </div>
                      </div>
                      {s.isSample && <SampleBadge />}
                      <span className="badge badge--primary">{formatDuration(s.minutes)}</span>
                      <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => removeSession(s)} aria-label="Delete session">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

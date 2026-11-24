import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Wand2, Save, RotateCcw, AlertTriangle, CalendarClock, ListChecks, Clock, Lightbulb, ArrowUpToLine, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import FormField from '../components/ui/FormField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { AiSetupNotice, AiSourceBadge } from '../components/ui/AiNotice.jsx';
import TaskPicker from '../components/planner/TaskPicker.jsx';
import FixedBlocksEditor from '../components/planner/FixedBlocksEditor.jsx';
import PlanEditor from '../components/planner/PlanEditor.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAiStatus } from '../context/AiStatusContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { generatePlanOrder } from '../services/ai/aiService.js';
import { buildSchedule, rankTasks, parseAiPlan, moveEntry, durationOf } from '../utils/plannerUtils.js';
import { isCompleted, isOverdue, sortTasks } from '../utils/taskUtils.js';
import { toDateKey, addDays, nextQuarterHour, formatDuration, formatDateKey, daysBetween, formatTime12 } from '../utils/dateUtils.js';
import { createId } from '../utils/id.js';

/** Suggests which tasks to pre-select: overdue or due within 2 days, else the top 4. */
function defaultSelection(pending, now) {
  const urgent = pending.filter((t) => isOverdue(t, now) || (t.deadline && daysBetween(toDateKey(now), t.deadline) <= 2));
  const picks = urgent.length ? urgent : sortTasks(pending, 'smart', now).slice(0, 4);
  return new Set(picks.map((t) => t.id));
}

/** Rebuilds planner state from a saved plan so it can be adjusted later. */
function stateFromPlan(plan) {
  if (!plan) return null;
  const entries = [...plan.items.filter((i) => i.kind === 'task'), ...plan.deferred].map((i) => ({
    taskId: i.taskId,
    title: i.title,
    minutes: i.minutes,
    reason: i.reason ?? '',
  }));
  return {
    entries,
    fixedBlocks: plan.items.filter((i) => i.kind === 'fixed').map((i) => ({ id: createId('fixed'), title: i.title, start: i.start, end: i.end })),
    source: plan.source,
    provider: plan.provider,
    summary: plan.summary,
    tips: [],
  };
}

export default function PlannerPage() {
  const { tasks, plans, now, savePlan, deletePlan } = useAppData();
  const { ready, provider } = useAiStatus();
  const { toast, confirm } = useUi();

  const pending = useMemo(() => sortTasks(tasks.filter((t) => !isCompleted(t)), 'smart', now), [tasks, now]);

  const [planDate, setPlanDate] = useState(toDateKey(now));
  const savedPlan = plans.find((p) => p.date === planDate);
  // On first visit, reopen today's saved plan (if any) so it can be adjusted.
  const [restored] = useState(() => stateFromPlan(plans.find((p) => p.date === toDateKey(now))));

  const [selectedIds, setSelectedIds] = useState(() =>
    restored ? new Set(restored.entries.map((e) => e.taskId)) : defaultSelection(pending, now),
  );
  const [startTime, setStartTime] = useState(() => plans.find((p) => p.date === toDateKey(now))?.startTime ?? nextQuarterHour(now));
  const [availableHours, setAvailableHours] = useState(() => {
    const p = plans.find((x) => x.date === toDateKey(now));
    return p ? Math.round((p.availableMinutes / 60) * 4) / 4 : 4;
  });
  const [breakMinutes, setBreakMinutes] = useState(() => plans.find((p) => p.date === toDateKey(now))?.breakMinutes ?? 10);
  const [fixedBlocks, setFixedBlocks] = useState(restored?.fixedBlocks ?? []);
  const [result, setResult] = useState(restored); // { entries, source, provider, summary, tips }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const availableMinutes = Math.round(Number(availableHours) * 60);
  const selectedTasks = pending.filter((t) => selectedIds.has(t.id));
  const selectedMinutes = selectedTasks.reduce((s, t) => s + durationOf(t), 0);
  const formValid = availableMinutes >= 15 && availableMinutes <= 16 * 60 && /^\d{2}:\d{2}$/.test(startTime);

  // The schedule is always recalculated from entries + settings, so every edit is instantly reflected.
  const schedule = useMemo(() => {
    if (!result || !formValid) return null;
    try {
      return buildSchedule({ entries: result.entries, startTime, availableMinutes, breakMinutes: Number(breakMinutes), fixedBlocks });
    } catch {
      return null;
    }
  }, [result, startTime, availableMinutes, breakMinutes, fixedBlocks, formValid]);

  const markDirty = () => setDirty(true);

  const toggleSelected = (id) =>
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const generate = async (useAi) => {
    setError('');
    if (!selectedTasks.length) return setError('Select at least one task to plan.');
    if (!formValid) return setError('Check your start time and available hours (15 minutes to 16 hours).');

    if (!useAi) {
      setResult({ entries: rankTasks(selectedTasks, now), source: 'rules', provider: null, summary: '', tips: [] });
      setDirty(true);
      return;
    }

    setLoading(true);
    try {
      const response = await generatePlanOrder(
        { tasks: selectedTasks, now: new Date(), startTime, availableMinutes, breakMinutes: Number(breakMinutes), fixedBlocks },
        provider,
      );
      const parsed = parseAiPlan(response.text, selectedTasks, now);
      if (!parsed) {
        toast('The AI reply could not be used, so a rule-based plan was created instead.', 'error', 6000);
        setResult({ entries: rankTasks(selectedTasks, now), source: 'rules', provider: null, summary: '', tips: [] });
      } else {
        setResult({ ...parsed, source: 'ai', provider: response.provider });
      }
      setDirty(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEntries = (updater) => {
    setResult((r) => ({ ...r, entries: updater(r.entries) }));
    markDirty();
  };

  const handleSave = () => {
    if (!schedule) return;
    savePlan({
      date: planDate,
      source: result.source,
      provider: result.provider,
      startTime,
      availableMinutes,
      breakMinutes: Number(breakMinutes),
      summary: result.summary,
      items: schedule.items,
      deferred: schedule.deferred,
    });
    setDirty(false);
    toast(`Plan saved for ${planDate === toDateKey(now) ? 'today' : formatDateKey(planDate)}`);
  };

  const handleDiscard = async () => {
    if (savedPlan && (await confirm({ title: 'Delete saved plan?', message: 'The saved schedule for this day will be removed. Your tasks are not affected.', confirmLabel: 'Delete plan' }))) {
      deletePlan(planDate);
      toast('Saved plan deleted');
    }
    setResult(null);
    setDirty(false);
  };

  const changeDate = (date) => {
    setPlanDate(date);
    const plan = plans.find((p) => p.date === date);
    const restoredState = stateFromPlan(plan);
    setResult(restoredState);
    setFixedBlocks(restoredState?.fixedBlocks ?? []);
    if (plan) {
      setStartTime(plan.startTime);
      setBreakMinutes(plan.breakMinutes);
      setAvailableHours(Math.round((plan.availableMinutes / 60) * 4) / 4);
    } else if (date !== toDateKey(now)) {
      setStartTime('09:00');
    }
    setDirty(false);
  };

  const todayKey = toDateKey(now);
  const tomorrowKey = toDateKey(addDays(now, 1));
  const capacityPercent = availableMinutes ? Math.round((selectedMinutes / availableMinutes) * 100) : 0;

  if (pending.length === 0 && !result) {
    return (
      <div className="page">
        <PageHeader title="AI Daily Planner" subtitle="Turn your responsibilities into a realistic schedule." />
        <div className="card">
          <EmptyState icon={ListChecks} title="No pending tasks to plan" message="Add tasks (with estimated durations) and come back to build your day.">
            <Link to="/tasks" className="btn btn--primary">
              Go to My Tasks
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="AI Daily Planner"
        subtitle="Choose tasks, tell DAYFLOW your available time, and get a realistic, adjustable schedule."
        actions={
          <div className="tabs" role="tablist" aria-label="Plan date">
            {[
              { key: todayKey, label: 'Today' },
              { key: tomorrowKey, label: 'Tomorrow' },
            ].map((d) => (
              <button key={d.key} type="button" role="tab" aria-selected={planDate === d.key} className={`tab ${planDate === d.key ? 'is-active' : ''}`} onClick={() => changeDate(d.key)}>
                {d.label}
                {plans.some((p) => p.date === d.key) && <span className="tab__count">saved</span>}
              </button>
            ))}
          </div>
        }
      />

      <AiSetupNotice compact />

      <div className="planner-layout">
        {/* ---------- Left: inputs ---------- */}
        <div className="stack">
          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <Clock size={18} /> Your time
              </div>
            </div>
            <div className="form-grid">
              <FormField label="Start time" htmlFor="plan-start">
                <input id="plan-start" type="time" className="input" value={startTime} onChange={(e) => { setStartTime(e.target.value); markDirty(); }} />
              </FormField>
              <FormField label="Available hours" htmlFor="plan-hours" hint="Working time, excluding fixed activities." error={availableMinutes < 15 || availableMinutes > 960 ? 'Between 0.25 and 16 hours.' : undefined}>
                <input id="plan-hours" type="number" min="0.25" max="16" step="0.25" className="input" value={availableHours} onChange={(e) => { setAvailableHours(e.target.value); markDirty(); }} />
              </FormField>
              <FormField label="Breaks between tasks" htmlFor="plan-break" className="span-2">
                <select id="plan-break" className="select" value={breakMinutes} onChange={(e) => { setBreakMinutes(Number(e.target.value)); markDirty(); }}>
                  <option value={0}>No breaks</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <CalendarClock size={18} /> Existing activities
              </div>
              <span className="card__subtitle">Lectures, shifts, appointments</span>
            </div>
            <FixedBlocksEditor blocks={fixedBlocks} onChange={(b) => { setFixedBlocks(b); markDirty(); }} />
          </div>

          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <ListChecks size={18} /> Tasks to plan
              </div>
            </div>
            {pending.length ? (
              <TaskPicker
                tasks={pending}
                selectedIds={selectedIds}
                onToggle={toggleSelected}
                onSelectAll={() => setSelectedIds(new Set(pending.map((t) => t.id)))}
                onClear={() => setSelectedIds(new Set())}
                now={now}
              />
            ) : (
              <p className="text-sm muted">All tasks are complete.</p>
            )}
            <div className="capacity">
              <div className="row row--between text-xs">
                <span className="muted">Selected work vs. available time</span>
                <strong className={selectedMinutes > availableMinutes ? 'field__error' : ''}>
                  {formatDuration(selectedMinutes)} / {formatDuration(availableMinutes)}
                </strong>
              </div>
              <ProgressBar value={capacityPercent} label="Planned capacity" />
              {selectedMinutes > availableMinutes && (
                <p className="text-xs field__error">That's more than your available time — some tasks will be deferred.</p>
              )}
            </div>
            {error && <div className="alert alert--danger" style={{ marginTop: 12 }}><AlertTriangle size={16} /> <span>{error}</span></div>}
            <div className="stack-sm" style={{ marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn--primary btn--block" onClick={() => generate(true)} disabled={!ready || loading || !selectedTasks.length} title={ready ? 'Ask AI to order and explain your plan' : 'Configure an AI provider to enable'}>
                {loading ? <span className="spinner" /> : <Sparkles size={16} />}
                {loading ? 'Planning your day…' : result ? 'Regenerate with AI' : 'Generate with AI'}
              </button>
              <button type="button" className="btn btn--secondary btn--block" onClick={() => generate(false)} disabled={loading || !selectedTasks.length}>
                <Wand2 size={16} /> {result ? 'Regenerate' : 'Generate'} rule-based plan
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Right: result ---------- */}
        <div className="card planner-result">
          {!result || !schedule ? (
            <EmptyState
              icon={CalendarClock}
              title="Your schedule will appear here"
              message={
                ready
                  ? 'Select tasks and generate a plan. The AI decides the order and explains why; DAYFLOW calculates times so the plan always fits.'
                  : 'Select tasks and generate a rule-based plan (urgency + priority). Configure AI for personalised ordering and explanations.'
              }
            />
          ) : (
            <div className="stack">
              <div className="row row--between">
                <div>
                  <h2>{planDate === todayKey ? "Today's plan" : `Plan for ${formatDateKey(planDate)}`}</h2>
                  <p className="text-xs muted">
                    {formatDuration(schedule.stats.scheduledMinutes)} of work · ends around {formatTime12(schedule.items.length ? schedule.items[schedule.items.length - 1].end : startTime)}
                  </p>
                </div>
                <AiSourceBadge source={result.source} provider={result.provider} />
              </div>

              {result.summary && (
                <div className="alert alert--primary">
                  <Sparkles size={16} />
                  <span>{result.summary}</span>
                </div>
              )}

              {schedule.warnings.map((w) => (
                <div key={w} className="alert alert--warning">
                  <AlertTriangle size={16} />
                  <span>{w}</span>
                </div>
              ))}

              {schedule.items.length ? (
                <PlanEditor
                  schedule={schedule}
                  entries={result.entries}
                  onMove={(i, dir) => updateEntries((e) => moveEntry(e, i, dir))}
                  onDuration={(i, value) =>
                    updateEntries((e) => e.map((entry, n) => (n === i ? { ...entry, minutes: Math.max(5, Math.min(600, Number(value) || 5)) } : entry)))
                  }
                  onRemove={(i) => {
                    const removed = result.entries[i];
                    updateEntries((e) => e.filter((_, n) => n !== i));
                    setSelectedIds((s) => {
                      const next = new Set(s);
                      next.delete(removed.taskId);
                      return next;
                    });
                  }}
                />
              ) : (
                <p className="muted text-sm">No tasks could be scheduled in the available time.</p>
              )}

              {schedule.deferred.length > 0 && (
                <div className="deferred">
                  <p className="section-title">Recommended to defer</p>
                  <ul className="stack-sm">
                    {schedule.deferred.map((d) => (
                      <li key={d.taskId} className="deferred__item">
                        <div className="grow">
                          <strong className="text-sm">{d.title}</strong>
                          <p className="text-xs muted">{d.reason}</p>
                        </div>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          title="Move to the top of the plan"
                          onClick={() => updateEntries((e) => [e.find((x) => x.taskId === d.taskId), ...e.filter((x) => x.taskId !== d.taskId)])}
                        >
                          <ArrowUpToLine size={14} /> Prioritise
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.tips?.length > 0 && (
                <div className="stack-sm">
                  <p className="section-title">AI tips</p>
                  {result.tips.map((tip) => (
                    <p key={tip} className="text-sm row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                      <Lightbulb size={15} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 3 }} /> {tip}
                    </p>
                  ))}
                </div>
              )}

              <div className="row planner-result__actions">
                <button type="button" className="btn btn--primary" onClick={handleSave} disabled={!schedule.items.length}>
                  <Save size={16} /> {savedPlan && !dirty ? 'Saved' : 'Save plan'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleDiscard}>
                  {savedPlan ? <Trash2 size={16} /> : <RotateCcw size={16} />} {savedPlan ? 'Delete plan' : 'Discard'}
                </button>
                {dirty && savedPlan && <span className="text-xs muted">Unsaved changes</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs muted">
        Tip: set an estimated duration on each task for the most accurate plan. Saved plans appear on your Dashboard.
      </p>
    </div>
  );
}

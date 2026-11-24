import { Check } from 'lucide-react';
import { PriorityBadge } from '../ui/Badges.jsx';
import { describeDeadline, formatDuration } from '../../utils/dateUtils.js';
import { isOverdue } from '../../utils/taskUtils.js';
import { durationOf, DEFAULT_TASK_MINUTES } from '../../utils/plannerUtils.js';

/** Checklist of pending tasks to include in the plan. */
export default function TaskPicker({ tasks, selectedIds, onToggle, onSelectAll, onClear, now }) {
  return (
    <div className="stack-sm">
      <div className="row row--between">
        <span className="text-xs muted">{selectedIds.size} of {tasks.length} selected</span>
        <div className="row" style={{ gap: 4 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onSelectAll}>
            Select all
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClear} disabled={!selectedIds.size}>
            Clear
          </button>
        </div>
      </div>
      <ul className="picker">
        {tasks.map((t) => {
          const selected = selectedIds.has(t.id);
          return (
            <li key={t.id}>
              <button type="button" className={`picker-item ${selected ? 'is-selected' : ''}`} onClick={() => onToggle(t.id)} aria-pressed={selected}>
                <span className="picker-item__check">{selected && <Check size={12} strokeWidth={3} />}</span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="picker-item__title truncate">{t.title}</span>
                  <span className="picker-item__meta">
                    <PriorityBadge priority={t.priority} />
                    {t.deadline && (
                      <span className={`text-xs ${isOverdue(t, now) ? 'field__error' : 'muted'}`}>{isOverdue(t, now) ? 'Overdue' : describeDeadline(t.deadline, now)}</span>
                    )}
                    <span className="text-xs muted" title={t.estimatedMinutes ? 'Estimated duration' : `No estimate — ${DEFAULT_TASK_MINUTES} minutes assumed`}>
                      {formatDuration(durationOf(t))}
                      {!t.estimatedMinutes && '*'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {tasks.some((t) => !t.estimatedMinutes) && <p className="text-xs muted">* No estimate set — {DEFAULT_TASK_MINUTES} minutes assumed. Edit the task to set one.</p>}
    </div>
  );
}

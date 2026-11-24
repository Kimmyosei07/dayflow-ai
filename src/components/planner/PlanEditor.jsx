import { ArrowUp, ArrowDown, X, Coffee, CalendarClock } from 'lucide-react';
import { formatTime12, formatDuration } from '../../utils/dateUtils.js';

/**
 * Editable schedule: reorder tasks, change their duration or remove them.
 * Times are recalculated automatically by the planner engine after each edit.
 */
export default function PlanEditor({ schedule, entries, onMove, onDuration, onRemove }) {
  const indexOf = (taskId) => entries.findIndex((e) => e.taskId === taskId);

  return (
    <ol className="timeline timeline--editable">
      {schedule.items.map((item) => {
        if (item.kind !== 'task') {
          return (
            <li key={item.id} className={`timeline-item timeline-item--${item.kind}`}>
              <div className="timeline-item__time">
                <span>{formatTime12(item.start)}</span>
              </div>
              <div className="timeline-item__card">
                <div className="row" style={{ gap: 8 }}>
                  {item.kind === 'break' ? <Coffee size={15} /> : <CalendarClock size={15} />}
                  <span className="grow">{item.title}</span>
                  <span className="text-xs muted">{formatDuration(item.minutes)}</span>
                </div>
              </div>
            </li>
          );
        }
        const index = indexOf(item.taskId);
        return (
          <li key={item.id} className="timeline-item timeline-item--task">
            <div className="timeline-item__time">
              <span>{formatTime12(item.start)}</span>
              <span className="muted">{formatTime12(item.end)}</span>
            </div>
            <div className="timeline-item__card">
              <div className="row" style={{ gap: 6 }}>
                <strong className="grow" style={{ minWidth: 120 }}>{item.title}</strong>
                <label className="duration-input" title="Duration in minutes">
                  <input
                    type="number"
                    min="5"
                    max="600"
                    step="5"
                    className="input"
                    value={entries[index]?.minutes ?? item.minutes}
                    onChange={(e) => onDuration(index, e.target.value)}
                    aria-label={`Duration for ${item.title} in minutes`}
                  />
                  <span className="text-xs muted">min</span>
                </label>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => onMove(index, -1)} disabled={index <= 0} aria-label="Move earlier" title="Move earlier">
                  <ArrowUp size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm" onClick={() => onMove(index, 1)} disabled={index >= entries.length - 1} aria-label="Move later" title="Move later">
                  <ArrowDown size={15} />
                </button>
                <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => onRemove(index)} aria-label={`Remove ${item.title} from plan`} title="Remove from plan">
                  <X size={15} />
                </button>
              </div>
              {item.reason && <p className="timeline-item__reason">{item.reason}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

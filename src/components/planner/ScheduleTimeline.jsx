import { Coffee, CalendarClock, CheckCircle2 } from 'lucide-react';
import { formatTime12, formatDuration, timeToMinutes } from '../../utils/dateUtils.js';

/**
 * Read-only timeline of a schedule. Highlights the slot happening "now"
 * and marks tasks that have already been completed.
 */
export default function ScheduleTimeline({ items, tasks = [], now, showReasons = false, compact = false }) {
  const minutesNow = now ? now.getHours() * 60 + now.getMinutes() : -1;

  return (
    <ol className={`timeline ${compact ? 'timeline--compact' : ''}`}>
      {items.map((item) => {
        const current = minutesNow >= timeToMinutes(item.start) && minutesNow < timeToMinutes(item.end);
        const task = item.taskId ? tasks.find((t) => t.id === item.taskId) : null;
        const done = task?.status === 'completed';
        return (
          <li key={item.id} className={`timeline-item timeline-item--${item.kind} ${current ? 'is-current' : ''} ${done ? 'is-done' : ''}`}>
            <div className="timeline-item__time">
              <span>{formatTime12(item.start)}</span>
              <span className="muted">{formatTime12(item.end)}</span>
            </div>
            <div className="timeline-item__card">
              <div className="row" style={{ gap: 8 }}>
                {item.kind === 'break' && <Coffee size={15} />}
                {item.kind === 'fixed' && <CalendarClock size={15} />}
                {done && <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />}
                <strong className="grow truncate">{item.title}</strong>
                <span className="text-xs muted">{formatDuration(item.minutes)}</span>
                {current && <span className="badge badge--primary">Now</span>}
              </div>
              {showReasons && item.reason && <p className="timeline-item__reason">{item.reason}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

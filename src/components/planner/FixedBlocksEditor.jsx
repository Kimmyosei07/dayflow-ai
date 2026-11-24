import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { formatTime12, timeToMinutes } from '../../utils/dateUtils.js';
import { createId } from '../../utils/id.js';

/** Lets the user list existing commitments (lectures, shifts) to plan around. */
export default function FixedBlocksEditor({ blocks, onChange }) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [error, setError] = useState('');

  const add = () => {
    if (!title.trim()) return setError('Give the activity a name.');
    if (Number.isNaN(timeToMinutes(start)) || Number.isNaN(timeToMinutes(end))) return setError('Enter valid times.');
    if (timeToMinutes(end) <= timeToMinutes(start)) return setError('End time must be after start time.');
    const overlaps = blocks.some((b) => timeToMinutes(start) < timeToMinutes(b.end) && timeToMinutes(end) > timeToMinutes(b.start));
    if (overlaps) return setError('This overlaps another activity.');
    onChange([...blocks, { id: createId('fixed'), title: title.trim(), start, end }].sort((a, b) => a.start.localeCompare(b.start)));
    setTitle('');
    setError('');
  };

  return (
    <div className="stack-sm">
      {blocks.length > 0 && (
        <ul className="stack-sm">
          {blocks.map((b) => (
            <li key={b.id} className="fixed-block">
              <span className="grow truncate">
                <strong className="text-sm">{b.title}</strong>
                <span className="text-xs muted"> · {formatTime12(b.start)} – {formatTime12(b.end)}</span>
              </span>
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))} aria-label={`Remove ${b.title}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="fixed-form">
        <input className="input" placeholder="e.g. Lecture, work shift" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Activity name" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Activity start time" />
        <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Activity end time" />
        <button type="button" className="btn btn--secondary" onClick={add} aria-label="Add fixed activity">
          <Plus size={16} />
        </button>
      </div>
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

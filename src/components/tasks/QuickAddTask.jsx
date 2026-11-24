import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { toDateKey } from '../../utils/dateUtils.js';

/** One-line task creation used on the dashboard. Creates a task due today. */
export default function QuickAddTask() {
  const { addTask } = useAppData();
  const { toast } = useUi();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Type a task first.');
      return;
    }
    addTask({ title: title.trim(), priority, category: 'personal', deadline: toDateKey(new Date()) });
    toast('Task added for today');
    setTitle('');
    setError('');
  };

  return (
    <form className="quick-add" onSubmit={submit}>
      <label htmlFor="quick-add" className="sr-only">
        Quick add a task for today
      </label>
      <input
        id="quick-add"
        className={`input ${error ? 'has-error' : ''}`}
        placeholder="Add a task for today…"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (error) setError('');
        }}
        maxLength={120}
      />
      <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button type="submit" className="btn btn--primary" aria-label="Add task">
        <Plus size={16} /> Add
      </button>
      {error && <span className="field__error quick-add__error">{error}</span>}
    </form>
  );
}

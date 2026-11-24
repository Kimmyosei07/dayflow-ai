import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, ListChecks, SearchX, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import TaskFormModal from '../components/tasks/TaskFormModal.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { TASK_VIEWS, CATEGORIES, PRIORITIES, SORT_OPTIONS } from '../utils/constants.js';
import { filterTasks, sortTasks, matchesView } from '../utils/taskUtils.js';

const VIEW_VALUES = TASK_VIEWS.map((v) => v.value);

export default function TasksPage() {
  const { tasks, courses, now, loadSampleData } = useAppData();
  const [params, setParams] = useSearchParams();
  const view = VIEW_VALUES.includes(params.get('view')) ? params.get('view') : 'all';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [courseId, setCourseId] = useState('all');
  const [sortBy, setSortBy] = useState('smart');
  const [creating, setCreating] = useState(false);

  const setView = (next) => setParams(next === 'all' ? {} : { view: next }, { replace: true });

  const counts = useMemo(
    () => Object.fromEntries(VIEW_VALUES.map((v) => [v, tasks.filter((t) => matchesView(t, v, now)).length])),
    [tasks, now],
  );

  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, { view, category, priority, courseId, search }, now), sortBy, now),
    [tasks, view, category, priority, courseId, search, sortBy, now],
  );

  const filtersActive = search || category !== 'all' || priority !== 'all' || courseId !== 'all';
  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setPriority('all');
    setCourseId('all');
  };

  return (
    <div className="page">
      <PageHeader
        title="My Tasks"
        subtitle={`${counts.all - counts.completed} pending · ${counts.completed} completed`}
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New task
          </button>
        }
      />

      <Tabs label="Task views" value={view} onChange={setView} options={TASK_VIEWS.map((v) => ({ ...v, count: counts[v.value] }))} />

      <div className="card toolbar">
        <div className="input-icon toolbar__search">
          <Search size={16} />
          <input
            className="input"
            type="search"
            placeholder="Search title, description or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
        </div>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {courses.length > 0 && (
          <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Filter by course">
            <option value="all">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        )}
        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort tasks">
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      <div className="card">
        {tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="No tasks yet" message="Create your first task, or load sample data to explore how DAYFLOW works.">
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Create a task
            </button>
            <button type="button" className="btn btn--secondary" onClick={loadSampleData}>
              Load sample data
            </button>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            compact
            title={filtersActive ? 'No tasks match your filters' : `Nothing in "${TASK_VIEWS.find((v) => v.value === view)?.label}"`}
            message={
              filtersActive
                ? 'Try a different search term or clear the filters.'
                : view === 'overdue'
                  ? 'No overdue tasks — you are on top of things.'
                  : 'Tasks will appear here when they match this view.'
            }
          >
            {filtersActive && (
              <button type="button" className="btn btn--secondary" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <p className="text-xs muted" style={{ marginBottom: 'var(--space-2)' }}>
              Showing {visible.length} of {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </p>
            <TaskList tasks={visible} />
          </>
        )}
      </div>

      {creating && <TaskFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}

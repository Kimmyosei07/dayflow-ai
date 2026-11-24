import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, CircleDashed, AlertTriangle, CalendarClock, Timer, TrendingUp, Plus, Sparkles, ListTodo } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ProgressRing from '../components/ui/ProgressRing.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import TaskFormModal from '../components/tasks/TaskFormModal.jsx';
import QuickAddTask from '../components/tasks/QuickAddTask.jsx';
import RecommendationCard from '../components/dashboard/RecommendationCard.jsx';
import ScheduleTimeline from '../components/planner/ScheduleTimeline.jsx';
import { AiSourceBadge } from '../components/ui/AiNotice.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { getTaskStats, getTodayProgress, getUpcomingDeadlines, sortTasks, isDueToday, isOverdue, isCompleted, wasCompletedOn } from '../utils/taskUtils.js';
import { getDailySeries, getFocusStats } from '../utils/analyticsUtils.js';
import { getGreeting, formatLongDate, formatDuration, toDateKey } from '../utils/dateUtils.js';

export default function DashboardPage() {
  const { tasks, focusSessions, plans, settings, now, loadSampleData } = useAppData();
  const [creating, setCreating] = useState(false);
  const todayKey = toDateKey(now);

  // Everything below is calculated from stored data and recalculates on change.
  const stats = useMemo(() => getTaskStats(tasks, now), [tasks, now]);
  const progress = useMemo(() => getTodayProgress(tasks, now), [tasks, now]);
  const focusStats = useMemo(() => getFocusStats(focusSessions, now), [focusSessions, now]);
  const weekly = useMemo(() => getDailySeries(tasks, focusSessions, now, 7), [tasks, focusSessions, now]);
  const upcoming = useMemo(() => getUpcomingDeadlines(tasks, now, 5), [tasks, now]);
  const todayTasks = useMemo(
    () => sortTasks(tasks.filter((t) => isDueToday(t, now) || isOverdue(t, now) || wasCompletedOn(t, todayKey)), 'smart', now),
    [tasks, now, todayKey],
  );
  const todayPlan = plans.find((p) => p.date === todayKey);
  const goalPercent = Math.min(100, Math.round((stats.completedToday / settings.dailyTaskGoal) * 100));
  const focusPercent = Math.min(100, Math.round((focusStats.todayMinutes / settings.dailyFocusGoalMinutes) * 100));
  const weekCompleted = weekly.reduce((s, d) => s + d.completed, 0);
  const name = settings.displayName ? `, ${settings.displayName.split(' ')[0]}` : '';

  return (
    <div className="page">
      <PageHeader title={`${getGreeting(now)}${name}`} subtitle={formatLongDate(now)} documentTitle="Dashboard" actions={
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New task
        </button>
      } />

      {tasks.length === 0 && (
        <div className="card card--glass">
          <EmptyState icon={Sparkles} title="Welcome to DAYFLOW AI" message="Add your tasks and courses, plan your day, and track your focus. Everything is saved privately in this browser.">
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Add your first task
            </button>
            <Link to="/academic" className="btn btn--secondary">
              Add a course
            </Link>
            <button type="button" className="btn btn--ghost" onClick={loadSampleData} title="Adds clearly labelled sample tasks, courses and focus sessions">
              Explore with sample data
            </button>
          </EmptyState>
        </div>
      )}

      <div className="grid grid-4">
        <StatCard icon={CalendarCheck} value={stats.dueToday} label="Due today" hint="Pending tasks with today's deadline" />
        <StatCard icon={CheckCircle2} value={stats.completed} label="Completed" tone="success" hint={`${stats.completedToday} completed today`} />
        <StatCard icon={CircleDashed} value={stats.pending} label="Pending" tone="warning" />
        <StatCard icon={AlertTriangle} value={stats.overdue} label="Overdue" tone="danger" />
      </div>

      <div className="dashboard-grid">
        {/* Today's progress */}
        <div className="card today-card">
          <div className="card__header">
            <div className="card__title">
              <TrendingUp size={18} /> Today's progress
            </div>
          </div>
          <div className="today-card__body">
            <ProgressRing value={progress.percent} size={128}>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{progress.percent}%</div>
                <div className="text-xs muted">complete</div>
              </div>
            </ProgressRing>
            <div className="stack grow" style={{ gap: 'var(--space-3)' }}>
              <p className="text-sm">
                {progress.total === 0 ? 'Nothing is scheduled for today yet.' : `${progress.done} of ${progress.total} of today's tasks done.`}
              </p>
              <div className="stack-sm">
                <div className="row row--between text-xs">
                  <span className="muted">Daily goal</span>
                  <strong>
                    {stats.completedToday}/{settings.dailyTaskGoal} tasks
                  </strong>
                </div>
                <ProgressBar value={goalPercent} label="Daily task goal" />
              </div>
              <div className="stack-sm">
                <div className="row row--between text-xs">
                  <span className="muted">Focus goal</span>
                  <strong>
                    {formatDuration(focusStats.todayMinutes)}/{formatDuration(settings.dailyFocusGoalMinutes)}
                  </strong>
                </div>
                <ProgressBar value={focusPercent} label="Daily focus goal" />
              </div>
            </div>
          </div>
        </div>

        <RecommendationCard />

        {/* Today's tasks + quick add */}
        <div className="card dashboard-grid__wide">
          <div className="card__header">
            <div className="card__title">
              <ListTodo size={18} /> Today's tasks
            </div>
            <Link to="/tasks?view=today" className="text-sm">
              View all
            </Link>
          </div>
          <QuickAddTask />
          {todayTasks.length === 0 ? (
            <EmptyState compact icon={CalendarCheck} title="No tasks for today" message="Use the quick add above, or set deadlines on your tasks." />
          ) : (
            <TaskList tasks={todayTasks.slice(0, 8)} compact />
          )}
          {todayTasks.length > 8 && <p className="text-xs muted" style={{ marginTop: 8 }}>+{todayTasks.length - 8} more in My Tasks</p>}
        </div>

        {/* Schedule */}
        <div className="card">
          <div className="card__header">
            <div className="card__title">
              <CalendarClock size={18} /> Today's schedule
            </div>
            {todayPlan && <AiSourceBadge source={todayPlan.source} provider={todayPlan.provider} />}
          </div>
          {todayPlan ? (
            <>
              <ScheduleTimeline items={todayPlan.items} tasks={tasks} now={now} compact />
              <Link to="/planner" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }}>
                Adjust in planner
              </Link>
            </>
          ) : (
            <EmptyState compact icon={CalendarClock} title="No plan for today" message="Turn your tasks into a realistic schedule in seconds.">
              <Link to="/planner" className="btn btn--soft btn--sm">
                Plan my day
              </Link>
            </EmptyState>
          )}
        </div>

        <div className="stack" style={{ gap: 'var(--space-5)' }}>
          {/* Upcoming deadlines */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <AlertTriangle size={18} /> Upcoming deadlines
              </div>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState compact icon={CalendarCheck} title="No upcoming deadlines" message="Tasks with deadlines will appear here, soonest first." />
            ) : (
              <TaskList tasks={upcoming} compact />
            )}
          </div>

          {/* Focus summary */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <Timer size={18} /> Focus time
              </div>
              <Link to="/focus" className="text-sm">
                Start focus
              </Link>
            </div>
            <div className="focus-summary">
              <div>
                <div className="stat-card__value">{formatDuration(focusStats.todayMinutes)}</div>
                <div className="stat-card__label">today · {focusStats.todaySessions} session{focusStats.todaySessions === 1 ? '' : 's'}</div>
              </div>
              <div>
                <div className="stat-card__value">{formatDuration(focusStats.weekMinutes)}</div>
                <div className="stat-card__label">this week</div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly overview */}
        <div className="card dashboard-grid__wide">
          <div className="card__header">
            <div className="card__title">
              <TrendingUp size={18} /> Weekly productivity
            </div>
            <span className="card__subtitle">{weekCompleted} task{weekCompleted === 1 ? '' : 's'} completed in the last 7 days</span>
          </div>
          {tasks.some(isCompleted) || focusSessions.length ? (
            <div className="grid grid-2">
              <div>
                <p className="section-title" style={{ marginBottom: 8 }}>Tasks completed</p>
                <BarChart data={weekly.map((d) => ({ label: d.label, value: d.completed }))} height={140} ariaLabel="Tasks completed per day over the last week" />
              </div>
              <div>
                <p className="section-title" style={{ marginBottom: 8 }}>Focus minutes</p>
                <BarChart data={weekly.map((d) => ({ label: d.label, value: Math.round(d.focusMinutes) }))} height={140} color="var(--color-accent)" ariaLabel="Focus minutes per day over the last week" />
              </div>
            </div>
          ) : (
            <EmptyState compact icon={TrendingUp} title="No activity yet" message="Complete tasks and focus sessions to see your weekly trend." />
          )}
        </div>
      </div>

      {creating && <TaskFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}

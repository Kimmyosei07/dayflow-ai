import { useMemo, useState } from 'react';
import { ListChecks, CheckCircle2, Percent, Timer, Flame, TrendingUp, TrendingDown, PieChart, BarChart3, Info, Minus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  getOverview,
  getDailySeries,
  getWeeklySeries,
  getCategoryDistribution,
  getFocusStats,
  getWeeklyTrend,
  getCompletionStreak,
  getMostProductiveWeekday,
} from '../utils/analyticsUtils.js';
import { formatDuration } from '../utils/dateUtils.js';

/** A short, friendly explanation under each chart. */
function Explain({ children }) {
  return (
    <p className="explain">
      <Info size={14} /> <span>{children}</span>
    </p>
  );
}

export default function AnalyticsPage() {
  const { tasks, focusSessions, now, hasSampleData } = useAppData();
  const [range, setRange] = useState('daily');

  const overview = useMemo(() => getOverview(tasks), [tasks]);
  const daily = useMemo(() => getDailySeries(tasks, focusSessions, now, 14), [tasks, focusSessions, now]);
  const weekly = useMemo(() => getWeeklySeries(tasks, focusSessions, now, 8), [tasks, focusSessions, now]);
  const categories = useMemo(() => getCategoryDistribution(tasks), [tasks]);
  const focus = useMemo(() => getFocusStats(focusSessions, now), [focusSessions, now]);
  const trend = useMemo(() => getWeeklyTrend(tasks, now), [tasks, now]);
  const streak = useMemo(() => getCompletionStreak(tasks, now), [tasks, now]);
  const bestDay = useMemo(() => getMostProductiveWeekday(tasks), [tasks]);

  const series = range === 'daily' ? daily.map((d) => ({ ...d, label: d.label.slice(0, 2) + ' ' + d.key.slice(8) })) : weekly;
  const hasData = tasks.length > 0 || focusSessions.length > 0;

  if (!hasData) {
    return (
      <div className="page">
        <PageHeader title="Analytics" subtitle="Understand how you spend your time." />
        <div className="card">
          <EmptyState icon={BarChart3} title="No data to analyse yet" message="Analytics are calculated from your real tasks and focus sessions. Create and complete tasks or run a focus session to see your statistics." />
        </div>
      </div>
    );
  }

  const TrendIcon = trend.change === null ? Minus : trend.change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="page">
      <PageHeader
        title="Analytics"
        subtitle={hasSampleData ? 'Includes sample data — remove it in Settings to see only your own activity.' : 'All figures are calculated from your own stored data.'}
      />

      <div className="grid grid-4">
        <StatCard icon={ListChecks} value={overview.total} label="Tasks created" />
        <StatCard icon={CheckCircle2} value={overview.completed} label="Tasks completed" tone="success" />
        <StatCard icon={Percent} value={`${overview.completionRate}%`} label="Completion rate" tone="warning" />
        <StatCard icon={Timer} value={formatDuration(focus.totalMinutes)} label={`Focus time · ${focus.totalSessions} sessions`} />
      </div>

      <div className="grid grid-3">
        <div className="card insight">
          <TrendIcon size={20} />
          <div>
            <strong>
              {trend.thisWeek} completed this week
              {trend.change !== null && ` (${trend.change >= 0 ? '+' : ''}${trend.change}%)`}
            </strong>
            <p className="text-xs muted">
              {trend.change === null ? 'No completions last week to compare with yet.' : `Compared with ${trend.lastWeek} during the whole of last week.`}
            </p>
          </div>
        </div>
        <div className="card insight">
          <Flame size={20} />
          <div>
            <strong>
              {streak} day{streak === 1 ? '' : 's'} streak
            </strong>
            <p className="text-xs muted">Consecutive days with at least one completed task.</p>
          </div>
        </div>
        <div className="card insight">
          <BarChart3 size={20} />
          <div>
            <strong>{bestDay ? `${bestDay.name}s` : 'Not enough data'}</strong>
            <p className="text-xs muted">{bestDay ? `Your most productive weekday (${bestDay.count} tasks completed).` : 'Complete a few tasks to find your best day.'}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div className="card__title">
            <TrendingUp size={18} /> Productivity trend
          </div>
          <Tabs
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: 'daily', label: 'Last 14 days' },
              { value: 'weekly', label: 'Last 8 weeks' },
            ]}
          />
        </div>
        <div className="grid grid-2">
          <div>
            <p className="section-title" style={{ marginBottom: 8 }}>Tasks completed</p>
            <BarChart data={series.map((d) => ({ label: d.label, value: d.completed }))} height={190} ariaLabel="Tasks completed over time" />
          </div>
          <div>
            <p className="section-title" style={{ marginBottom: 8 }}>Focus time</p>
            <BarChart
              data={series.map((d) => ({ label: d.label, value: Math.round(d.focusMinutes) }))}
              height={190}
              color="var(--color-accent)"
              formatValue={(v) => formatDuration(v)}
              ariaLabel="Focus minutes over time"
            />
          </div>
        </div>
        <Explain>
          Each bar shows tasks you marked complete (left) and minutes of completed focus sessions (right) on that {range === 'daily' ? 'day' : 'week (Monday–Sunday)'}. Steady bars matter more than tall ones —
          consistency is what builds momentum.
        </Explain>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card__header">
            <div className="card__title">
              <PieChart size={18} /> Category distribution
            </div>
          </div>
          {categories.length ? (
            <DonutChart data={categories.map((c) => ({ label: c.label, value: c.count, color: c.color }))} centerLabel="tasks" />
          ) : (
            <EmptyState compact icon={PieChart} title="No tasks yet" />
          )}
          <Explain>How your tasks are spread across areas of your life. A heavily one-sided chart can be a sign to protect time for the others.</Explain>
        </div>

        <div className="card">
          <div className="card__header">
            <div className="card__title">
              <CheckCircle2 size={18} /> Completion by category
            </div>
          </div>
          {categories.length ? (
            <ul className="stack">
              {categories.map((c) => {
                const pct = c.count ? Math.round((c.completed / c.count) * 100) : 0;
                return (
                  <li key={c.value} className="stack-sm">
                    <div className="row row--between text-sm">
                      <span className="row" style={{ gap: 8 }}>
                        <span className="dot" style={{ background: c.color }} /> {c.label}
                      </span>
                      <span className="muted text-xs">
                        {c.completed}/{c.count} · <strong>{pct}%</strong>
                      </span>
                    </div>
                    <div className="progress">
                      <div className="progress__bar" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon={CheckCircle2} title="No tasks yet" />
          )}
          <Explain>The share of tasks in each category you have completed. Low numbers point to areas where tasks pile up.</Explain>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div className="card__title">
            <Timer size={18} /> Focus summary
          </div>
        </div>
        <div className="grid grid-4">
          <div>
            <div className="stat-card__value">{formatDuration(focus.todayMinutes)}</div>
            <div className="stat-card__label">Today</div>
          </div>
          <div>
            <div className="stat-card__value">{formatDuration(focus.weekMinutes)}</div>
            <div className="stat-card__label">This week</div>
          </div>
          <div>
            <div className="stat-card__value">{focus.totalSessions}</div>
            <div className="stat-card__label">Sessions completed</div>
          </div>
          <div>
            <div className="stat-card__value">{formatDuration(focus.averageMinutes)}</div>
            <div className="stat-card__label">Average session</div>
          </div>
        </div>
        <Explain>Only fully completed focus sessions are counted. Paused, reset or skipped sessions are not recorded.</Explain>
      </div>
    </div>
  );
}

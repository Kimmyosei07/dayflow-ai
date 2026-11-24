/**
 * Rule-based daily suggestion shown when AI is not configured (and clearly
 * labelled "Rule-based" in the UI — it is never presented as AI output).
 */
import { isOverdue, isDueToday, isCompleted, sortTasks } from './taskUtils.js';
import { formatDuration } from './dateUtils.js';
import { durationOf } from './plannerUtils.js';

export function getRuleBasedRecommendation({ tasks, now = new Date(), focusStats, settings }) {
  const pending = tasks.filter((t) => !isCompleted(t));
  if (tasks.length === 0) return 'Start by adding the things on your mind today — even small ones. A clear list is the first step to a calm day.';
  if (pending.length === 0) return 'Everything on your list is done. Take a proper break, or plan tomorrow while your head is clear.';

  const overdue = sortTasks(pending.filter((t) => isOverdue(t, now)), 'smart', now);
  if (overdue.length) {
    const first = overdue[0];
    return `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Start with "${first.title}" (about ${formatDuration(durationOf(first))}) to clear the backlog before taking on new work.`;
  }

  const today = sortTasks(pending.filter((t) => isDueToday(t, now)), 'smart', now);
  if (today.length) {
    const total = today.reduce((s, t) => s + durationOf(t), 0);
    return `${today.length} task${today.length > 1 ? 's are' : ' is'} due today (~${formatDuration(total)} of work). Begin with "${today[0].title}" while your energy is highest, then use the AI Planner to fit the rest around your day.`;
  }

  const next = sortTasks(pending, 'smart', now)[0];
  const focusGoal = settings?.dailyFocusGoalMinutes ?? 120;
  if (focusStats && focusStats.todayMinutes < focusGoal / 2) {
    return `Nothing is due today — a great chance to get ahead. One or two focus sessions on "${next.title}" would move your most important task forward.`;
  }
  return `Good momentum today. Next up: "${next.title}". Keep sessions short and take your breaks.`;
}

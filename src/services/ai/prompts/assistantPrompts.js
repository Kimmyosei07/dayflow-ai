/**
 * Prompts for the AI Productivity Assistant and dashboard recommendation.
 *
 * `buildUserContext` turns the user's real data into a compact text summary.
 * It is only sent when the user has allowed it (Settings / chat toggle).
 */
import { toDateKey, formatDuration } from '../../../utils/dateUtils.js';
import { isCompleted, isOverdue, sortTasks } from '../../../utils/taskUtils.js';
import { durationOf } from '../../../utils/plannerUtils.js';

const MAX_TASKS_IN_CONTEXT = 40;

export function buildUserContext({ tasks, courses, focusStats, now = new Date() }) {
  const courseLabel = (id) => {
    const c = courses.find((x) => x.id === id);
    return c ? `${c.code} ${c.name}` : '';
  };
  const pending = sortTasks(tasks.filter((t) => !isCompleted(t)), 'smart', now).slice(0, MAX_TASKS_IN_CONTEXT);
  const completedToday = tasks.filter((t) => isCompleted(t) && t.completedAt && toDateKey(new Date(t.completedAt)) === toDateKey(now));

  const lines = [];
  lines.push(`Pending tasks (${pending.length}${tasks.filter((t) => !isCompleted(t)).length > pending.length ? ', most urgent shown' : ''}):`);
  if (!pending.length) lines.push('- none');
  for (const t of pending) {
    const bits = [
      t.title,
      `priority ${t.priority}`,
      t.category,
      t.academicType ? `${t.academicType} for ${courseLabel(t.courseId)}` : null,
      t.deadline ? `due ${t.deadline}${t.deadlineTime ? ` ${t.deadlineTime}` : ''}${isOverdue(t, now) ? ' (OVERDUE)' : ''}` : 'no deadline',
      `~${formatDuration(durationOf(t))}`,
    ].filter(Boolean);
    lines.push(`- ${bits.join(' | ')}`);
  }
  lines.push(`Completed today: ${completedToday.length ? completedToday.map((t) => t.title).join(', ') : 'none'}`);
  lines.push(`Courses: ${courses.length ? courses.map((c) => `${c.code} ${c.name}`).join('; ') : 'none added'}`);
  if (focusStats) {
    lines.push(`Focus time today: ${formatDuration(focusStats.todayMinutes)}; this week: ${formatDuration(focusStats.weekMinutes)}.`);
  }
  return lines.join('\n');
}

export function buildAssistantSystemPrompt({ context, displayName, now = new Date() }) {
  const parts = [
    'You are the DAYFLOW AI productivity assistant for a university student.',
    'Help them organise their day and week, break big assignments into concrete steps, prioritise deadlines,',
    'plan study sessions and exam revision, handle overwhelming workloads and reflect on progress.',
    'Be warm, practical and concise. Prefer short paragraphs and bullet points. Use realistic time estimates.',
    'Never invent tasks, deadlines, grades or facts about the user that are not in the data below.',
    'If you need information you do not have, ask for it.',
    `Current date and time: ${now.toLocaleString()} (${toDateKey(now)}).`,
  ];
  if (displayName) parts.push(`The user's name is ${displayName}.`);
  if (context) {
    parts.push('\nThe user has shared their current DAYFLOW data:\n' + context);
  } else {
    parts.push('The user has NOT shared their task data in this conversation. Do not assume what their tasks are.');
  }
  return parts.join(' ');
}

export function buildRecommendationPrompt({ context, displayName, now = new Date() }) {
  return {
    system:
      'You are the DAYFLOW AI daily coach. Give ONE specific, encouraging recommendation for today in at most 60 words, ' +
      'based only on the data provided. Mention concrete task names when useful. No headings, no lists, plain text.',
    user: `${displayName ? `Name: ${displayName}\n` : ''}Time now: ${now.toLocaleString()}\n${context}`,
  };
}

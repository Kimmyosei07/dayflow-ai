/**
 * Prompts for the AI Daily Planner.
 * The AI returns ORDER + REASONS as JSON; times are computed in code
 * (src/utils/plannerUtils.js) so the schedule is always feasible.
 */
import { toDateKey, formatDuration } from '../../../utils/dateUtils.js';
import { durationOf } from '../../../utils/plannerUtils.js';

export function buildPlannerPrompt({ tasks, now = new Date(), startTime, availableMinutes, breakMinutes, fixedBlocks = [] }) {
  const system = [
    'You are the planning engine of DAYFLOW AI, a productivity app for university students.',
    'Decide the best ORDER for the given tasks today and explain each decision briefly.',
    'Consider deadlines (overdue and soonest first), priority, estimated duration, energy (hard work earlier),',
    'the balance between academic and personal responsibilities, and the fixed activities already in the day.',
    'If the tasks do not fit in the available time, put the tasks that can wait LAST and say so in the summary.',
    'Only use the task IDs provided. Do not invent tasks, times or facts.',
    'Reply with JSON only, matching exactly:',
    '{"order":[{"taskId":"<id>","reason":"<max 25 words>"}],"summary":"<2-3 sentences>","tips":["<short tip>"]}',
  ].join(' ');

  const taskLines = tasks.map((t) =>
    JSON.stringify({
      taskId: t.id,
      title: t.title,
      category: t.category,
      academicType: t.academicType ?? undefined,
      priority: t.priority,
      deadline: t.deadline ? `${t.deadline}${t.deadlineTime ? ` ${t.deadlineTime}` : ''}` : 'none',
      estimatedMinutes: durationOf(t),
    }),
  );

  const totalNeeded = tasks.reduce((s, t) => s + durationOf(t), 0);

  const user = [
    `Today is ${toDateKey(now)}.`,
    `Start time: ${startTime}. Available working time: ${formatDuration(availableMinutes)}. Break between tasks: ${breakMinutes} minutes.`,
    `Total estimated task time: ${formatDuration(totalNeeded)}.`,
    fixedBlocks.length
      ? `Fixed activities: ${fixedBlocks.map((b) => `${b.title} ${b.start}-${b.end}`).join('; ')}.`
      : 'No fixed activities.',
    'Tasks:',
    ...taskLines,
  ].join('\n');

  return { system, user };
}

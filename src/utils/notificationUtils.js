/**
 * Builds the in-app notification list (bell icon) from real data:
 * overdue tasks, tasks due today and exams coming up soon.
 */
import { isOverdue, isDueToday, isCompleted } from './taskUtils.js';
import { daysBetween, toDateKey } from './dateUtils.js';

export function buildNotifications(tasks, courses, now = new Date(), prefs = { deadlineReminders: true }) {
  if (!prefs.deadlineReminders) return [];
  const courseName = (id) => courses.find((c) => c.id === id)?.code || '';
  const todayKey = toDateKey(now);
  const list = [];

  const overdue = tasks.filter((t) => isOverdue(t, now));
  if (overdue.length) {
    list.push({
      id: 'overdue',
      tone: 'danger',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      message: overdue.slice(0, 3).map((t) => t.title).join(', '),
      link: '/tasks?view=overdue',
    });
  }

  const dueToday = tasks.filter((t) => !isCompleted(t) && isDueToday(t, now) && !isOverdue(t, now));
  if (dueToday.length) {
    list.push({
      id: 'today',
      tone: 'warning',
      title: `${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`,
      message: dueToday.slice(0, 3).map((t) => t.title).join(', '),
      link: '/tasks?view=today',
    });
  }

  tasks
    .filter((t) => !isCompleted(t) && t.academicType === 'exam' && t.deadline)
    .forEach((t) => {
      const days = daysBetween(todayKey, t.deadline);
      if (days >= 1 && days <= 7) {
        list.push({
          id: `exam-${t.id}`,
          tone: 'info',
          title: `Exam in ${days} day${days > 1 ? 's' : ''}`,
          message: `${courseName(t.courseId) ? `${courseName(t.courseId)} · ` : ''}${t.title}`,
          link: t.courseId ? `/academic/${t.courseId}` : '/tasks',
        });
      }
    });

  return list;
}

/**
 * Optional sample data so a new user (or a reviewer) can explore every
 * feature immediately. Every record is flagged `isSample: true`, shown with a
 * "Sample" badge, and can be removed in one click from Settings.
 */
import { createTask, toggleTaskStatus } from '../utils/taskUtils.js';
import { createCourse } from '../utils/academicUtils.js';
import { toDateKey, addDays } from '../utils/dateUtils.js';
import { createId } from '../utils/id.js';

export function createSampleData(now = new Date()) {
  const day = (offset) => toDateKey(addDays(now, offset));
  // A timestamp `offset` days from now at `hour` o'clock — never in the future.
  const at = (offset, hour) => {
    const d = addDays(now, offset);
    d.setHours(hour, 0, 0, 0);
    if (d > now) return new Date(now.getTime() - (5 + Math.abs(offset)) * 60000);
    return d;
  };

  const se = createCourse({ name: 'Software Engineering', code: 'CSC 301', lecturer: 'Dr. A. Mensah', description: 'Requirements, design, testing and project management.', color: '#8B6ACB', isSample: true }, now);
  const db = createCourse({ name: 'Database Systems', code: 'CSC 305', lecturer: 'Prof. K. Boateng', description: 'Relational modelling, SQL and transactions.', color: '#5B9BD5', isSample: true }, now);
  const stats = createCourse({ name: 'Probability & Statistics', code: 'MTH 210', description: 'Distributions, estimation and hypothesis testing.', color: '#4FB59A', isSample: true }, now);

  const make = (input, createdOffset = -3) => createTask({ ...input, isSample: true }, at(createdOffset, 9));
  const done = (task, completedOffset, hour = 16) => toggleTaskStatus(task, at(completedOffset, hour));

  const tasks = [
    make({ title: 'Software requirements document', description: 'Write the SRS for the group project: scope, use cases and non-functional requirements.', category: 'academic', priority: 'high', deadline: day(2), estimatedMinutes: 120, courseId: se.id, academicType: 'assignment' }),
    make({ title: 'SQL normalisation quiz', category: 'academic', priority: 'medium', deadline: day(4), deadlineTime: '10:00', estimatedMinutes: 45, courseId: db.id, academicType: 'quiz' }),
    make({ title: 'Statistics mid-semester exam', description: 'Chapters 1–5. Focus on hypothesis testing.', category: 'academic', priority: 'high', deadline: day(6), deadlineTime: '09:00', estimatedMinutes: 90, courseId: stats.id, academicType: 'exam' }),
    make({ title: 'ER diagram for library system', category: 'academic', priority: 'medium', deadline: day(0), estimatedMinutes: 60, courseId: db.id, academicType: 'project' }),
    make({ title: 'Reply to internship email', category: 'work', priority: 'high', deadline: day(0), estimatedMinutes: 15 }),
    make({ title: 'Grocery shopping', category: 'personal', priority: 'low', deadline: day(1), estimatedMinutes: 40 }),
    make({ title: 'Update portfolio website', category: 'projects', priority: 'low', estimatedMinutes: 90 }),
    make({ title: 'Pay hostel fees', category: 'personal', priority: 'high', deadline: day(-1), estimatedMinutes: 20 }),
    done(make({ title: 'Read chapter 3 — UML diagrams', category: 'academic', priority: 'medium', estimatedMinutes: 50, courseId: se.id, academicType: 'assignment' }, -6), -5),
    done(make({ title: 'Probability problem set 2', category: 'academic', priority: 'high', estimatedMinutes: 80, courseId: stats.id, academicType: 'assignment' }, -6), -3),
    done(make({ title: 'Gym session', category: 'personal', priority: 'low', estimatedMinutes: 60 }, -3), -2, 7),
    done(make({ title: 'Team stand-up notes', category: 'work', priority: 'medium', estimatedMinutes: 20 }, -2), -1, 11),
    done(make({ title: 'Set up GitHub repository', category: 'projects', priority: 'medium', estimatedMinutes: 30 }, -1), 0, 8),
  ];

  const focusSessions = [-6, -5, -5, -3, -3, -3, -2, -1, -1, 0].map((offset, i) => {
    const completed = at(offset, 10 + (i % 5));
    return {
      id: createId('focus'),
      taskId: null,
      taskTitle: i % 2 ? 'Study session' : 'Deep work',
      minutes: 25,
      startedAt: new Date(completed.getTime() - 25 * 60000).toISOString(),
      completedAt: completed.toISOString(),
      isSample: true,
    };
  });

  return { courses: [se, db, stats], tasks, focusSessions };
}

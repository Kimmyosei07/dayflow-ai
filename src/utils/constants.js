/**
 * Shared option lists used by forms, filters, validation and analytics.
 * Keeping them in one place means adding a category is a one-line change.
 */

export const PRIORITIES = [
  { value: 'high', label: 'High', weight: 3 },
  { value: 'medium', label: 'Medium', weight: 2 },
  { value: 'low', label: 'Low', weight: 1 },
];

export const CATEGORIES = [
  { value: 'academic', label: 'Academic', color: '#8B6ACB' },
  { value: 'personal', label: 'Personal', color: '#E58FB4' },
  { value: 'work', label: 'Work', color: '#5B9BD5' },
  { value: 'projects', label: 'Projects', color: '#4FB59A' },
  { value: 'other', label: 'Other', color: '#E5A54B' },
];

export const ACADEMIC_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'project', label: 'Project' },
  { value: 'exam', label: 'Examination' },
];

export const TASK_VIEWS = [
  { value: 'all', label: 'All tasks' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

export const SORT_OPTIONS = [
  { value: 'smart', label: 'Smart (urgency + priority)' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
  { value: 'title', label: 'Title (A–Z)' },
];

export const COURSE_COLORS = ['#8B6ACB', '#5B9BD5', '#4FB59A', '#E58FB4', '#E5A54B', '#7C8BE0'];

export const labelFor = (list, value) => list.find((item) => item.value === value)?.label ?? value;
export const categoryColor = (value) =>
  CATEGORIES.find((c) => c.value === value)?.color ?? '#B69AE8';

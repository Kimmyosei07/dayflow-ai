import { Check, Pencil, Trash2, Timer, CalendarDays, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PriorityBadge, CategoryBadge, AcademicTypeBadge, SampleBadge } from '../ui/Badges.jsx';
import { isOverdue, isCompleted } from '../../utils/taskUtils.js';
import { describeDeadline, formatDuration, formatTime12 } from '../../utils/dateUtils.js';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useFocusTimer } from '../../context/FocusTimerContext.jsx';

/** One task row with complete / focus / edit / delete actions. */
export default function TaskItem({ task, onEdit, onToggle, onDelete, compact = false, showCourse = true }) {
  const { courses, now } = useAppData();
  const { setTaskId, status } = useFocusTimer();
  const navigate = useNavigate();
  const done = isCompleted(task);
  const overdue = isOverdue(task, now);
  const course = showCourse && task.courseId ? courses.find((c) => c.id === task.courseId) : null;

  const focusOnTask = () => {
    if (status === 'idle') setTaskId(task.id);
    navigate('/focus', { state: { taskId: task.id } });
  };

  return (
    <li className={`task-item ${done ? 'is-completed' : ''} ${overdue ? 'is-overdue' : ''}`}>
      <button
        type="button"
        className={`task-check ${done ? 'is-checked' : ''}`}
        onClick={() => onToggle(task)}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as completed`}
        title={done ? 'Reopen task' : 'Mark as completed'}
      >
        {done && <Check size={14} strokeWidth={3} />}
      </button>

      <div className="task-item__body">
        <div className="task-item__title">{task.title}</div>
        {!compact && task.description && <div className="task-item__desc">{task.description}</div>}
        <div className="task-item__meta">
          <PriorityBadge priority={task.priority} />
          {course ? (
            <span className="badge" title={course.name}>
              <span className="dot" style={{ background: course.color }} />
              {course.code}
            </span>
          ) : (
            !compact && <CategoryBadge category={task.category} />
          )}
          <AcademicTypeBadge type={task.academicType} />
          {task.deadline && (
            <span className={`badge ${overdue ? 'badge--danger' : ''}`} title={task.deadline}>
              <CalendarDays size={12} />
              {overdue ? `Overdue · ${describeDeadline(task.deadline, now)}` : describeDeadline(task.deadline, now)}
              {task.deadlineTime && ` · ${formatTime12(task.deadlineTime)}`}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="badge">
              <Clock3 size={12} />
              {formatDuration(task.estimatedMinutes)}
            </span>
          )}
          {task.isSample && <SampleBadge />}
        </div>
        {!compact && task.notes && <div className="task-item__notes">{task.notes}</div>}
      </div>

      <div className="task-item__actions">
        {!done && (
          <button type="button" className="icon-btn icon-btn--sm" onClick={focusOnTask} aria-label={`Focus on ${task.title}`} title="Start a focus session">
            <Timer size={16} />
          </button>
        )}
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit">
          <Pencil size={16} />
        </button>
        <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} title="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

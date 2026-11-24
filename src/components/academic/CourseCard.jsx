import { Link } from 'react-router-dom';
import { User, CalendarDays } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar.jsx';
import { SampleBadge } from '../ui/Badges.jsx';
import { describeDeadline } from '../../utils/dateUtils.js';

/** Course summary card linking to the course details page. */
export default function CourseCard({ course, progress, now }) {
  const next = progress.upcoming.find((t) => t.deadline);
  return (
    <Link to={`/academic/${course.id}`} className="card course-card">
      <span className="course-card__stripe" style={{ background: course.color }} />
      <div className="row row--between">
        <span className="badge" style={{ background: `${course.color}22`, color: course.color }}>
          {course.code}
        </span>
        {course.isSample && <SampleBadge />}
      </div>
      <h3 className="course-card__name">{course.name}</h3>
      {course.lecturer && (
        <p className="text-xs muted row" style={{ gap: 6 }}>
          <User size={13} /> {course.lecturer}
        </p>
      )}
      <div className="stack-sm" style={{ marginTop: 'auto' }}>
        <div className="row row--between text-xs">
          <span className="muted">
            {progress.completed}/{progress.total} activities done
          </span>
          <strong>{progress.percent}%</strong>
        </div>
        <ProgressBar value={progress.percent} label={`${course.code} progress`} />
        <p className="text-xs muted row" style={{ gap: 6 }}>
          <CalendarDays size={13} />
          {next ? `Next: ${next.title} · ${describeDeadline(next.deadline, now)}` : progress.pending ? `${progress.pending} pending, no deadlines` : 'Nothing pending'}
          {progress.overdue > 0 && <span className="badge badge--danger">{progress.overdue} overdue</span>}
        </p>
      </div>
    </Link>
  );
}

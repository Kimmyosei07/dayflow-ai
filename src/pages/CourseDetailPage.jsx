import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus, User, ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressRing from '../components/ui/ProgressRing.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import { SampleBadge } from '../components/ui/Badges.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import TaskFormModal from '../components/tasks/TaskFormModal.jsx';
import CourseFormModal from '../components/academic/CourseFormModal.jsx';
import DeleteCourseModal from '../components/academic/DeleteCourseModal.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { getCourseProgress } from '../utils/academicUtils.js';
import { ACADEMIC_TYPES } from '../utils/constants.js';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, tasks, now, deleteCourse } = useAppData();
  const { toast } = useUi();
  const course = courses.find((c) => c.id === courseId);

  const [tab, setTab] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const progress = useMemo(() => (course ? getCourseProgress(course.id, tasks, now) : null), [course, tasks, now]);

  if (!course) {
    return (
      <div className="page">
        <PageHeader title="Course not found" />
        <div className="card">
          <EmptyState icon={ClipboardList} title="This course doesn't exist" message="It may have been deleted.">
            <Link to="/academic" className="btn btn--primary">
              Back to Academic Manager
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const list = (tab === 'pending' ? progress.upcoming : progress.completedList).filter((t) => typeFilter === 'all' || t.academicType === typeFilter);
  const countByType = (type) => progress.upcoming.filter((t) => t.academicType === type).length;

  return (
    <div className="page">
      <Link to="/academic" className="back-link">
        <ArrowLeft size={16} /> All courses
      </Link>
      <PageHeader
        title={course.name}
        documentTitle={course.code}
        subtitle={course.code}
        actions={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Edit
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setDeleting(true)} aria-label="Delete course">
              <Trash2 size={15} /> Delete
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add activity
            </button>
          </>
        }
      />

      <div className="course-hero card" style={{ borderTop: `4px solid ${course.color}` }}>
        <ProgressRing value={progress.percent} size={112} color={course.color}>
          <div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{progress.percent}%</div>
            <div className="text-xs muted">progress</div>
          </div>
        </ProgressRing>
        <div className="stack-sm grow">
          <div className="row">
            {course.lecturer && (
              <span className="text-sm row" style={{ gap: 6 }}>
                <User size={14} /> {course.lecturer}
              </span>
            )}
            {course.isSample && <SampleBadge />}
          </div>
          {course.description ? <p className="text-sm muted">{course.description}</p> : <p className="text-sm muted">No description yet.</p>}
          <div className="row">
            <span className="badge badge--warning">{progress.pending} pending</span>
            <span className="badge badge--success">
              <CheckCircle2 size={12} /> {progress.completed} completed
            </span>
            {progress.overdue > 0 && (
              <span className="badge badge--danger">
                <AlertTriangle size={12} /> {progress.overdue} overdue
              </span>
            )}
            {ACADEMIC_TYPES.map((t) => (countByType(t.value) ? <span key={t.value} className="badge">{countByType(t.value)} {t.label.toLowerCase()}{countByType(t.value) > 1 ? 's' : ''}</span> : null))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row row--between" style={{ marginBottom: 'var(--space-4)' }}>
          <Tabs
            label="Activity status"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pending', label: 'Upcoming & pending', count: progress.pending },
              { value: 'completed', label: 'Completed', count: progress.completed },
            ]}
          />
          <select className="select" style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by activity type">
            <option value="all">All types</option>
            {ACADEMIC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {list.length ? (
          <TaskList tasks={list} showCourse={false} />
        ) : (
          <EmptyState
            compact
            icon={ClipboardList}
            title={tab === 'pending' ? 'No pending activities' : 'Nothing completed yet'}
            message={tab === 'pending' ? 'Add assignments, quizzes, projects and exam dates for this course.' : 'Completed activities will be listed here.'}
          >
            {tab === 'pending' && (
              <button type="button" className="btn btn--soft" onClick={() => setAdding(true)}>
                <Plus size={16} /> Add activity
              </button>
            )}
          </EmptyState>
        )}
      </div>

      {adding && <TaskFormModal defaults={{ courseId: course.id, category: 'academic' }} onClose={() => setAdding(false)} />}
      {editing && <CourseFormModal course={course} onClose={() => setEditing(false)} />}
      {deleting && (
        <DeleteCourseModal
          course={course}
          activityCount={progress.total}
          onClose={() => setDeleting(false)}
          onConfirm={(deleteActivities) => {
            deleteCourse(course.id, { deleteActivities });
            toast(`${course.code} deleted`);
            navigate('/academic');
          }}
        />
      )}
    </div>
  );
}

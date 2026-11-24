import { useMemo, useState } from 'react';
import { Plus, GraduationCap, BookOpen, CalendarClock } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import CourseCard from '../components/academic/CourseCard.jsx';
import CourseFormModal from '../components/academic/CourseFormModal.jsx';
import TaskList from '../components/tasks/TaskList.jsx';
import TaskFormModal from '../components/tasks/TaskFormModal.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { getCourseProgress } from '../utils/academicUtils.js';
import { sortTasks, isCompleted } from '../utils/taskUtils.js';
import { daysBetween, toDateKey } from '../utils/dateUtils.js';

export default function AcademicPage() {
  const { courses, tasks, now, loadSampleData } = useAppData();
  const [addingCourse, setAddingCourse] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);

  const academic = useMemo(() => tasks.filter((t) => t.courseId), [tasks]);
  const progressById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, getCourseProgress(c.id, tasks, now)])),
    [courses, tasks, now],
  );
  const upcoming = useMemo(
    () =>
      sortTasks(
        academic.filter((t) => !isCompleted(t) && t.deadline && daysBetween(toDateKey(now), t.deadline) <= 14),
        'deadline',
        now,
      ),
    [academic, now],
  );
  const completed = academic.filter(isCompleted).length;
  const overall = academic.length ? Math.round((completed / academic.length) * 100) : 0;
  const exams = academic.filter((t) => t.academicType === 'exam' && !isCompleted(t)).length;

  return (
    <div className="page">
      <PageHeader
        title="Academic Manager"
        subtitle="Courses, assignments, quizzes, projects and exams — synced with My Tasks."
        actions={
          <>
            {courses.length > 0 && (
              <button type="button" className="btn btn--secondary" onClick={() => setAddingActivity(true)}>
                <Plus size={16} /> Activity
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={() => setAddingCourse(true)}>
              <Plus size={16} /> Add course
            </button>
          </>
        }
      />

      {courses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            title="Add your first course"
            message="Track each course's assignments, quizzes, projects and exam dates. Every activity also appears in My Tasks — no duplicates."
          >
            <button type="button" className="btn btn--primary" onClick={() => setAddingCourse(true)}>
              <Plus size={16} /> Add course
            </button>
            {tasks.length === 0 && (
              <button type="button" className="btn btn--secondary" onClick={loadSampleData}>
                Load sample data
              </button>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="grid grid-4">
            <StatCard icon={BookOpen} value={courses.length} label="Courses" />
            <StatCard icon={CalendarClock} value={academic.length - completed} label="Pending activities" tone="warning" />
            <StatCard icon={GraduationCap} value={exams} label="Upcoming exams" tone="danger" />
            <StatCard icon={BookOpen} value={`${overall}%`} label="Overall progress" tone="success" hint="Completed academic activities across all courses" />
          </div>

          <div className="course-grid">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} progress={progressById[c.id]} now={now} />
            ))}
          </div>

          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <CalendarClock size={18} /> Due in the next 14 days
              </div>
            </div>
            {upcoming.length ? (
              <TaskList tasks={upcoming} />
            ) : (
              <EmptyState compact icon={CalendarClock} title="Nothing due soon" message="Academic activities with deadlines in the next two weeks will appear here." />
            )}
          </div>
        </>
      )}

      {addingCourse && <CourseFormModal onClose={() => setAddingCourse(false)} />}
      {addingActivity && <TaskFormModal defaults={{ courseId: courses[0]?.id, category: 'academic' }} onClose={() => setAddingActivity(false)} />}
    </div>
  );
}

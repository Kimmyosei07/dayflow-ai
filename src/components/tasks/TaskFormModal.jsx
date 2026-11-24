import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import FormField from '../ui/FormField.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { CATEGORIES, PRIORITIES, ACADEMIC_TYPES } from '../../utils/constants.js';
import { validateTaskInput } from '../../utils/taskUtils.js';

const EMPTY = {
  title: '',
  description: '',
  category: 'personal',
  priority: 'medium',
  deadline: '',
  deadlineTime: '',
  estimatedMinutes: '',
  notes: '',
  courseId: '',
  academicType: 'assignment',
};

/**
 * Create / edit task form. Pass `task` to edit, or `defaults` to pre-fill a
 * new task (e.g. { courseId } when adding an activity from a course page).
 */
export default function TaskFormModal({ task, defaults = {}, onClose, onSaved }) {
  const { courses, addTask, updateTask } = useAppData();
  const { toast } = useUi();
  const editing = Boolean(task);

  const [form, setForm] = useState(() => {
    const source = { ...EMPTY, ...defaults, ...(task ?? {}) };
    return {
      ...source,
      deadline: source.deadline ?? '',
      deadlineTime: source.deadlineTime ?? '',
      estimatedMinutes: source.estimatedMinutes ?? '',
      courseId: source.courseId ?? '',
      academicType: source.academicType ?? 'assignment',
      category: source.courseId ? 'academic' : source.category,
    };
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'courseId' && value) next.category = 'academic';
      return next;
    });
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateTaskInput(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      category: form.category,
      priority: form.priority,
      deadline: form.deadline || null,
      deadlineTime: form.deadline && form.deadlineTime ? form.deadlineTime : null,
      estimatedMinutes: form.estimatedMinutes === '' ? null : Number(form.estimatedMinutes),
      courseId: form.courseId || null,
      academicType: form.courseId ? form.academicType : null,
    };

    if (editing) {
      updateTask(task.id, payload);
      toast('Task updated');
    } else {
      addTask(payload);
      toast(form.courseId ? 'Academic activity added — it also appears in My Tasks' : 'Task created');
    }
    onSaved?.();
    onClose();
  };

  return (
    <Modal
      title={editing ? 'Edit task' : defaults.courseId ? 'New academic activity' : 'New task'}
      description={editing ? undefined : 'Add the details you know — only the title is required.'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn btn--primary">
            {editing ? 'Save changes' : 'Create task'}
          </button>
        </>
      }
    >
      <form id="task-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <FormField label="Title" htmlFor="task-title" error={errors.title} className="span-2">
          <input
            id="task-title"
            className={`input ${errors.title ? 'has-error' : ''}`}
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Finish software engineering report"
            maxLength={120}
          />
        </FormField>

        <FormField label="Description" htmlFor="task-desc" optional className="span-2">
          <textarea id="task-desc" className="textarea" value={form.description} onChange={set('description')} rows={2} placeholder="What does done look like?" />
        </FormField>

        <FormField label="Course" htmlFor="task-course" optional hint={courses.length ? 'Link to a course to track it in the Academic Manager.' : 'Add courses in the Academic Manager.'}>
          <select id="task-course" className="select" value={form.courseId} onChange={set('courseId')}>
            <option value="">Not linked to a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </FormField>

        {form.courseId ? (
          <FormField label="Activity type" htmlFor="task-acad">
            <select id="task-acad" className="select" value={form.academicType} onChange={set('academicType')}>
              {ACADEMIC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <FormField label="Category" htmlFor="task-category">
            <select id="task-category" className="select" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Priority" htmlFor="task-priority">
          <select id="task-priority" className="select" value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Estimated duration (minutes)" htmlFor="task-duration" optional error={errors.estimatedMinutes} hint="Used by the AI Planner.">
          <input
            id="task-duration"
            type="number"
            min="5"
            step="5"
            className={`input ${errors.estimatedMinutes ? 'has-error' : ''}`}
            value={form.estimatedMinutes}
            onChange={set('estimatedMinutes')}
            placeholder="e.g. 45"
          />
        </FormField>

        <FormField label="Deadline" htmlFor="task-deadline" optional error={errors.deadline}>
          <input id="task-deadline" type="date" className={`input ${errors.deadline ? 'has-error' : ''}`} value={form.deadline} onChange={set('deadline')} />
        </FormField>

        <FormField label="Time" htmlFor="task-time" optional error={errors.deadlineTime}>
          <input
            id="task-time"
            type="time"
            className={`input ${errors.deadlineTime ? 'has-error' : ''}`}
            value={form.deadlineTime}
            onChange={set('deadlineTime')}
            disabled={!form.deadline}
          />
        </FormField>

        <FormField label="Notes" htmlFor="task-notes" optional className="span-2">
          <textarea id="task-notes" className="textarea" value={form.notes} onChange={set('notes')} rows={2} placeholder="Links, resources, reminders…" />
        </FormField>
      </form>
    </Modal>
  );
}

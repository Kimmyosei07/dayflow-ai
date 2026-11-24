import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import FormField from '../ui/FormField.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { validateCourseInput } from '../../utils/academicUtils.js';
import { COURSE_COLORS } from '../../utils/constants.js';

/** Create or edit a course. */
export default function CourseFormModal({ course, onClose, onSaved }) {
  const { courses, addCourse, updateCourse } = useAppData();
  const { toast } = useUi();
  const [form, setForm] = useState({
    name: course?.name ?? '',
    code: course?.code ?? '',
    lecturer: course?.lecturer ?? '',
    description: course?.description ?? '',
    color: course?.color ?? COURSE_COLORS[courses.length % COURSE_COLORS.length],
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const v = validateCourseInput(form, courses, course?.id);
    setErrors(v);
    if (Object.keys(v).length) return;
    if (course) {
      updateCourse(course.id, form);
      toast('Course updated');
      onSaved?.(course);
    } else {
      const created = addCourse(form);
      toast(`${created.code} added`);
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal
      title={course ? 'Edit course' : 'Add a course'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="course-form" className="btn btn--primary">
            {course ? 'Save changes' : 'Add course'}
          </button>
        </>
      }
    >
      <form id="course-form" className="form-grid" onSubmit={submit} noValidate>
        <FormField label="Course code" htmlFor="course-code" error={errors.code}>
          <input id="course-code" className={`input ${errors.code ? 'has-error' : ''}`} value={form.code} onChange={set('code')} placeholder="CSC 301" maxLength={16} />
        </FormField>
        <FormField label="Course name" htmlFor="course-name" error={errors.name}>
          <input id="course-name" className={`input ${errors.name ? 'has-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Software Engineering" maxLength={80} />
        </FormField>
        <FormField label="Lecturer" htmlFor="course-lecturer" optional className="span-2">
          <input id="course-lecturer" className="input" value={form.lecturer} onChange={set('lecturer')} placeholder="Dr. Jane Doe" maxLength={80} />
        </FormField>
        <FormField label="Description" htmlFor="course-desc" optional className="span-2">
          <textarea id="course-desc" className="textarea" rows={3} value={form.description} onChange={set('description')} placeholder="What the course covers, assessment breakdown…" />
        </FormField>
        <div className="field span-2">
          <span className="field__label">Colour</span>
          <div className="row" role="radiogroup" aria-label="Course colour">
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={form.color === c}
                aria-label={`Colour ${c}`}
                className={`swatch ${form.color === c ? 'is-selected' : ''}`}
                style={{ background: c }}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

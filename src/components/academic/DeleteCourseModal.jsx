import { useState } from 'react';
import Modal from '../ui/Modal.jsx';

/** Asks what should happen to a course's activities before deleting it. */
export default function DeleteCourseModal({ course, activityCount, onConfirm, onClose }) {
  const [deleteActivities, setDeleteActivities] = useState(false);
  return (
    <Modal
      title={`Delete ${course.code}?`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={() => onConfirm(deleteActivities)}>
            Delete course
          </button>
        </>
      }
    >
      <div className="stack-sm">
        <p className="muted text-sm">This removes the course "{course.name}". This cannot be undone.</p>
        {activityCount > 0 && (
          <fieldset className="radio-group">
            <legend className="field__label">Its {activityCount} activit{activityCount === 1 ? 'y' : 'ies'}:</legend>
            <label className="radio">
              <input type="radio" name="activities" checked={!deleteActivities} onChange={() => setDeleteActivities(false)} />
              Keep them in My Tasks (unlinked from the course)
            </label>
            <label className="radio">
              <input type="radio" name="activities" checked={deleteActivities} onChange={() => setDeleteActivities(true)} />
              Delete them as well
            </label>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

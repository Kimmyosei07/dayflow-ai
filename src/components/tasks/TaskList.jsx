import { useState } from 'react';
import TaskItem from './TaskItem.jsx';
import TaskFormModal from './TaskFormModal.jsx';
import { useTaskActions } from '../../hooks/useTaskActions.js';

/** Renders tasks and manages the edit dialog for them. */
export default function TaskList({ tasks, compact = false, showCourse = true }) {
  const { toggle, remove } = useTaskActions();
  const [editing, setEditing] = useState(null);

  return (
    <>
      <ul className="task-list">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} compact={compact} showCourse={showCourse} onToggle={toggle} onDelete={remove} onEdit={setEditing} />
        ))}
      </ul>
      {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

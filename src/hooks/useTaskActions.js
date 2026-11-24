import { useCallback } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import { useUi } from '../context/UiContext.jsx';

/** Shared task actions with user feedback (toast + confirmation). */
export function useTaskActions() {
  const { toggleTask, deleteTask } = useAppData();
  const { toast, confirm } = useUi();

  const toggle = useCallback(
    (task) => {
      toggleTask(task.id);
      toast(task.status === 'completed' ? `Reopened "${task.title}"` : `Completed "${task.title}" — nice work!`);
    },
    [toggleTask, toast],
  );

  const remove = useCallback(
    async (task) => {
      const ok = await confirm({
        title: 'Delete this task?',
        message: `"${task.title}" will be permanently deleted${task.courseId ? ' from both My Tasks and its course' : ''}. This cannot be undone.`,
        confirmLabel: 'Delete task',
      });
      if (ok) {
        deleteTask(task.id);
        toast('Task deleted');
      }
    },
    [confirm, deleteTask, toast],
  );

  return { toggle, remove };
}

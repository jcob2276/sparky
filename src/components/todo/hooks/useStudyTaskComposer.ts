import { createTodoItem, isUniqueTodoTitleError, type TodoItemRow } from '../../../lib/todo/todo';
import { useTodoContext } from '../context/TodoContext';

export function useStudyTaskComposer() {
  const { userId, setItems } = useTodoContext();

  return async (subject: TodoItemRow, title: string, dueDate: string) => {
    try {
      const assignment = await createTodoItem(userId, {
        title: title.trim(), parent_task_id: subject.id,
        section_id: subject.section_id || undefined,
        due_date: dueDate || undefined, tagsText: 'studia',
      });
      setItems(previous => previous.some(item => item.id === assignment.id)
        ? previous : [...previous, assignment]);
    } catch (error) {
      if (isUniqueTodoTitleError(error)) {
        throw new Error('Zadanie o tej nazwie już istnieje w sekcji. Doprecyzuj nazwę.', { cause: error });
      }
      throw error;
    }
  };
}

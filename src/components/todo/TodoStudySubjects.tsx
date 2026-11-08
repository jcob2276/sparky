import { useTodoContext } from './context/TodoContext';
import { useStudyTaskComposer } from './hooks/useStudyTaskComposer';
import { isStudySubject } from '../../lib/todo/studySubjects';
import { updateTodoItem } from '../../lib/todo/todo';
import { applyOptimisticPatch } from './todoOptimistic';
import { confirmAndDeleteTodoItem } from './todoDeleteAction';
import TodoCardConnected from './TodoCardConnected';
import StudySubject from './StudySubject';
import { ControlSelect } from '../ui/ControlPrimitives';
import type { TodoItemRow } from '../../lib/todo/todo';

export default function TodoStudySubjects({ items }: { items: TodoItemRow[] }) {
  const { getChildren, setItems, setError } = useTodoContext();
  const saveAssignment = useStudyTaskComposer();
  const subjects = items.filter(isStudySubject);
  const otherTasks = items.filter(item => !isStudySubject(item));

  function moveToSubject(task: TodoItemRow, subjectId: string) {
    if (!subjectId) return;
    applyOptimisticPatch(setItems, task, { parent_task_id: subjectId },
      () => updateTodoItem(task.id, { parent_task_id: subjectId }), setError);
  }

  return (
    <div onClick={event => event.stopPropagation()} className="space-y-3">
      <p className="px-1 text-sm text-text-secondary">Rozwiń przedmiot, aby zapisać zadanie i termin.</p>
      {subjects.map(subject => {
        const assignments = getChildren(subject.id)
          .filter(item => item.status !== 'dropped')
          .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done')
            || (a.due_date || '9999').localeCompare(b.due_date || '9999'));
        return (
          <StudySubject
            key={subject.id} title={subject.title}
            openCount={assignments.filter(item => item.status === 'open').length}
            doneCount={assignments.filter(item => item.status === 'done').length}
            onSave={(title, date) => saveAssignment(subject, title, date)}
            onRename={title => applyOptimisticPatch(setItems, subject, { title },
              () => updateTodoItem(subject.id, { title }), setError)}
            onDelete={() => void confirmAndDeleteTodoItem(subject, setItems, setError,
              `Usunąć przedmiot „${subject.title}” razem z ${assignments.length} zadaniami? Tego nie da się cofnąć.`)}
          >
            <div className="todo-focus-grid px-2 sm:px-3">
              {assignments.map(item => <TodoCardConnected key={item.id} item={item} />)}
            </div>
          </StudySubject>
        );
      })}
      <div className="todo-focus-grid">
        {otherTasks.map(item => (
          <div key={item.id}>
            <TodoCardConnected item={item} />
            {subjects.length > 0 && (
              <ControlSelect
                value=""
                onChange={event => moveToSubject(item, event.target.value)}
                aria-label={`Przenieś do przedmiotu: ${item.title}`}
                className="mx-3 mb-2 h-11 rounded-lg border border-border-custom bg-surface-solid px-2 text-base text-text-secondary"
              >
                <option value="">Przenieś do przedmiotu…</option>
                {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.title}</option>)}
              </ControlSelect>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

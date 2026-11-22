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
  const { getChildren, setItems, setError, todayItems, activeFilterSection } = useTodoContext();
  const saveAssignment = useStudyTaskComposer();
  const subjects = items.filter(isStudySubject);
  const otherTasks = items.filter(item => !isStudySubject(item));
  const todayIds = new Set(todayItems.map(t => t.id));

  function moveToSubject(task: TodoItemRow, subjectId: string) {
    if (!subjectId) return;
    applyOptimisticPatch(setItems, task, { parent_task_id: subjectId },
      () => updateTodoItem(task.id, { parent_task_id: subjectId }), setError);
  }

  return (
    <div onClick={event => event.stopPropagation()} className="space-y-3">
      <p className="px-1 text-sm text-text-secondary">Rozwiń przedmiot, aby zapisać zadanie i termin.</p>
      {subjects.map(subject => {
        const allAssignments = getChildren(subject.id)
          .filter(item => item.status !== 'dropped')
          .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done')
            || (a.due_date || '9999').localeCompare(b.due_date || '9999'));

        // In overview dashboard, don't duplicate tasks that are already shown in "Na dziś"
        const inTodayCount = allAssignments.filter(item => item.status === 'open' && todayIds.has(item.id)).length;
        const assignments = activeFilterSection
          ? allAssignments
          : allAssignments.filter(item => item.status === 'done' || !todayIds.has(item.id));

        return (
          <StudySubject
            key={subject.id} title={subject.title}
            openCount={allAssignments.filter(item => item.status === 'open').length}
            doneCount={allAssignments.filter(item => item.status === 'done').length}
            onSave={(title, date) => saveAssignment(subject, title, date)}
            onRename={title => applyOptimisticPatch(setItems, subject, { title },
              () => updateTodoItem(subject.id, { title }), setError)}
            onDelete={() => void confirmAndDeleteTodoItem(subject, setItems, setError,
              `Usunąć przedmiot „${subject.title}” razem z ${allAssignments.length} zadaniami? Tego nie da się cofnąć.`)}
          >
            <div className="todo-focus-grid px-2 sm:px-3">
              {!activeFilterSection && inTodayCount > 0 && (
                <div className="mx-1 my-1.5 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-1.5 text-2xs font-semibold text-primary">
                  <span>📌 {inTodayCount === 1 ? '1 zadanie zaplanowane na dziś (patrz sekcja „Na dziś” powyżej)' : `${inTodayCount} zadania zaplanowane na dziś (w sekcji „Na dziś”)`}</span>
                </div>
              )}
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

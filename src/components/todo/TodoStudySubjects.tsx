import { useTodoContext } from './context/TodoContext';
import { useStudyTaskComposer } from './hooks/useStudyTaskComposer';
import { isStudySubject } from '../../lib/todo/studySubjects';
import TodoCardConnected from './TodoCardConnected';
import StudySubject from './StudySubject';
import type { TodoItemRow } from '../../lib/todo/todo';

export default function TodoStudySubjects({ items }: { items: TodoItemRow[] }) {
  const { getChildren } = useTodoContext();
  const saveAssignment = useStudyTaskComposer();
  const subjects = items.filter(isStudySubject);
  const otherTasks = items.filter(item => !isStudySubject(item));

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
          >
            <div className="todo-focus-grid px-2 sm:px-3">
              {assignments.map(item => <TodoCardConnected key={item.id} item={item} />)}
            </div>
          </StudySubject>
        );
      })}
      <div className="todo-focus-grid">{otherTasks.map(item => <TodoCardConnected key={item.id} item={item} />)}</div>
    </div>
  );
}

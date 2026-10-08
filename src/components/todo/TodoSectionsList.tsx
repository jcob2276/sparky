import { Fragment, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { useTodoContext } from './context/TodoContext';
import BucketHeader from './BucketHeader';
import SectionForm from './SectionForm';
import EmptyState from './EmptyState';
import TodoCardConnected from './TodoCardConnected';
import TodoStudySubjects from './TodoStudySubjects';
import { isStudySubject } from '../../lib/todo/studySubjects';
import { archiveTodoSection, createTodoSection, renameTodoSection } from '../../lib/todo/todo';

interface TodoSectionsListProps {
  renderInlineQuickCapture: (sectionId: string) => React.ReactNode;
  renderAddTodoButton: (sectionId: string) => React.ReactNode;
}

export default function TodoSectionsList({ renderInlineQuickCapture, renderAddTodoButton }: TodoSectionsListProps) {
  const {
    sectionsWithItems, draggingItem, dragTarget, collapsedSections,
    toggleSectionCollapse, sectionRefs, userId, run, fetchAll,
  } = useTodoContext();

  const [addingSectionIndex, setAddingSectionIndex] = useState<number | null>(null);
  const [newSectionForm, setNewSectionForm] = useState({ name: '', notes: '' });

  const saveNewSection = () => {
    run(async () => {
      if (newSectionForm.name.trim()) {
        await createTodoSection(userId, newSectionForm.name.trim());
        fetchAll();
      }
      setAddingSectionIndex(null);
    });
  };

  return (
    <>
      {sectionsWithItems.map((sec, idx) => {
        const isCollapsed = !!collapsedSections[sec.id];
        const hasItems = sec.items.length > 0;
        const hasSubjects = sec.items.some(isStudySubject);
        if (!hasItems && draggingItem === null) return null;

        return (
          <Fragment key={sec.id}>
            {addingSectionIndex === idx && (
              <SectionForm
                name={newSectionForm.name}
                notes={newSectionForm.notes}
                onChangeName={(val) => setNewSectionForm({ ...newSectionForm, name: val })}
                onChangeNotes={(val) => setNewSectionForm({ ...newSectionForm, notes: val })}
                onSave={saveNewSection}
                onCancel={() => setAddingSectionIndex(null)}
              />
            )}

            <div
              ref={el => { sectionRefs.current[sec.id] = el; }}
              className={`todo-grouped-surface mb-4 ${
                draggingItem !== null
                  ? dragTarget === sec.id
                    ? 'ring-2 ring-primary/60 shadow-[var(--shadow-accent-active)]'
                    : 'border-dashed border-primary/40'
                  : ''
              }`}
            >
              <div className="todo-grouped-header">
                <BucketHeader
                  icon={hasSubjects ? '🎓' : '📂'}
                  title={sec.name}
                  count={sec.items.length}
                  collapsed={isCollapsed}
                  onToggle={() => toggleSectionCollapse(sec.id)}
                  isDropTarget={dragTarget === sec.id}
                  onRename={(name) => run(() => renameTodoSection(sec.id, name))}
                  onDelete={() => run(() => archiveTodoSection(sec.id))}
                />
              </div>

              {!isCollapsed && (
                <div className="todo-grouped-body">
                  {sec.items.length === 0 ? (
                    <EmptyState
                      icon="📂"
                      label="Upuść tutaj, aby przypisać do sekcji"
                      isDragOver={dragTarget === sec.id}
                      dragColor="primary"
                    />
                  ) : hasSubjects ? (
                    <TodoStudySubjects items={sec.items} />
                  ) : (
                    <div className="todo-focus-grid">
                      {sec.items.map((i) => <TodoCardConnected key={i.id} item={i} />)}
                    </div>
                  )}
                  <div className="pt-2 px-1">
                    {renderInlineQuickCapture(sec.id)}
                    {renderAddTodoButton(sec.id)}
                  </div>
                </div>
              )}
            </div>
          </Fragment>
        );
      })}

      <Pressable
          onClick={() => {
            setAddingSectionIndex(sectionsWithItems.length);
            setNewSectionForm({ name: '', notes: '' });
          }}
          className="todo-instant flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border-custom text-sm font-medium text-text-secondary hover:bg-surface-solid focus-visible:shadow-focus"
        >+ Dodaj sekcję</Pressable>
      {addingSectionIndex === sectionsWithItems.length && (
        <SectionForm
          name={newSectionForm.name}
          notes={newSectionForm.notes}
          onChangeName={(val) => setNewSectionForm({ ...newSectionForm, name: val })}
          onChangeNotes={(val) => setNewSectionForm({ ...newSectionForm, notes: val })}
          onSave={saveNewSection}
          onCancel={() => setAddingSectionIndex(null)}
        />
      )}
    </>
  );
}

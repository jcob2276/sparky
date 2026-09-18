import { useTodoContext } from './context/TodoContext';
import BucketHeader from './BucketHeader';
import TodoCardConnected from './TodoCardConnected';
import EmptyState from './EmptyState';

interface TodoInboxZoneProps {
  renderInlineQuickCapture: (sectionId: string) => React.ReactNode;
  renderAddTodoButton: (sectionId: string) => React.ReactNode;
}

export default function TodoInboxZone({ renderInlineQuickCapture, renderAddTodoButton }: TodoInboxZoneProps) {
  const {
    inboxItems, draggingItem, dragTarget, inboxZoneRef,
    collapsedSections, toggleSectionCollapse,
  } = useTodoContext();

  if (inboxItems.length === 0 && draggingItem === null) return null;

  return (
    <div
      ref={inboxZoneRef}
      className={`todo-grouped-surface mb-4 ui-interactive duration-[var(--motion-medium)] ${
        draggingItem !== null
          ? dragTarget === 'inbox'
            ? 'ring-2 ring-primary/60 shadow-[var(--shadow-accent-active)]'
            : 'border-dashed border-primary/40'
          : ''
      }`}
    >
      <div className="todo-grouped-header">
        <BucketHeader
          icon="📥"
          title="Skrzynka / Inbox"
          count={inboxItems.length}
          collapsed={!!collapsedSections['inbox']}
          onToggle={() => toggleSectionCollapse('inbox')}
          isDropTarget={dragTarget === 'inbox'}
        />
      </div>

      {!collapsedSections['inbox'] && (
        <div className="todo-grouped-body">
          {inboxItems.length === 0 ? (
            <EmptyState
              icon="📥"
              label="Skrzynka jest pusta"
              isDragOver={dragTarget === 'inbox'}
              dragColor="primary"
            />
          ) : (
            <div className="divide-y divide-border-custom/30">
              {inboxItems.map((i) => <TodoCardConnected key={i.id} item={i} />)}
            </div>
          )}
          <div className="pt-2 px-1">
            {renderInlineQuickCapture('inbox')}
            {renderAddTodoButton('inbox')}
          </div>
        </div>
      )}
    </div>
  );
}

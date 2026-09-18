import { Fragment } from 'react';
import { useTodoContext } from './context/TodoContext';
import TodoCardConnected from './TodoCardConnected';
import EmptyState from './EmptyState';
import TodoSectionFlatView from './TodoSectionFlatView';
import type { TodoNavDest } from './TodoSidebar';
import { formatUpcomingDateHeader } from './todoUtils';

interface TodoSmartListViewProps {
  navDest: TodoNavDest;
  renderInlineQuickCapture: (sectionId: string) => React.ReactNode;
  renderAddTodoButton: (sectionId: string) => React.ReactNode;
}

// eslint-disable-next-line max-lines-per-function
export default function TodoSmartListView({ navDest, renderInlineQuickCapture, renderAddTodoButton }: TodoSmartListViewProps) {
  const { items, todayItems, inboxItems, upcomingItems, activeFilterSection } = useTodoContext();

  if (navDest === 'today') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
          <span className="text-xl leading-none">📅</span>
          <span className="text-xl font-extrabold text-text-primary tracking-tight">Dziś</span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">{todayItems.length}</span>
        </div>
        <div className="todo-grouped-surface">
          <div className="todo-grouped-body">
            {todayItems.length === 0 ? (
              <EmptyState icon="📅" label="Brak zadań na dziś." />
            ) : (
              <div className="divide-y divide-border-custom/30">
                {todayItems.map((i) => <TodoCardConnected key={i.id} item={i} inToday />)}
              </div>
            )}
            <div className="pt-2 px-1">
              {renderInlineQuickCapture('today')}
              {renderAddTodoButton('today')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (navDest === 'inbox') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
          <span className="text-xl leading-none">📥</span>
          <span className="text-xl font-extrabold text-text-primary tracking-tight">Skrzynka</span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">{inboxItems.length}</span>
        </div>
        <div className="todo-grouped-surface">
          <div className="todo-grouped-body">
            {inboxItems.length === 0 ? (
              <EmptyState icon="📥" label="Skrzynka pusta." />
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
        </div>
      </div>
    );
  }

  if (navDest === 'upcoming') {
    const lastDate: string | null = null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
          <span className="text-xl leading-none">🗓️</span>
          <span className="text-xl font-extrabold text-text-primary tracking-tight">Nadchodzące</span>
          <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full ml-1">{upcomingItems.length}</span>
        </div>
        <div className="todo-grouped-surface">
          <div className="todo-grouped-body">
            {upcomingItems.length === 0 ? (
              <EmptyState icon="🗓️" label="Brak zadań w najbliższych 7 dniach." />
            ) : (
              <div className="divide-y divide-border-custom/30">
                {upcomingItems.map((i, index) => {
                  const showDateHeader = index === 0 || i.due_date !== upcomingItems[index - 1].due_date;
                  return (
                    <Fragment key={i.id}>
                      {showDateHeader && i.due_date && (
                        <div className="px-3 pt-3 pb-1 text-xs font-black uppercase tracking-wider text-text-muted/50">
                          {formatUpcomingDateHeader(i.due_date)}
                        </div>
                      )}
                      <TodoCardConnected item={i} />
                    </Fragment>
                  );
                })}
              </div>
            )}
            <div className="pt-2 px-1">
              {renderInlineQuickCapture('upcoming')}
              {renderAddTodoButton('upcoming')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (navDest === 'all') {
    const activeItems = items.filter((i) => i.status !== 'done');
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
          <span className="text-xl leading-none">📥</span>
          <span className="text-xl font-extrabold text-text-primary tracking-tight">Wszystkie</span>
          <span className="text-xs font-bold text-text-secondary bg-surface-solid px-2 py-0.5 rounded-full ml-1">{activeItems.length}</span>
        </div>
        <div className="todo-grouped-surface">
          <div className="todo-grouped-body">
            {activeItems.length === 0 ? (
              <EmptyState icon="📋" label="Brak otwartych zadań." />
            ) : (
              <div className="divide-y divide-border-custom/30">
                {activeItems.map((i) => <TodoCardConnected key={i.id} item={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (navDest === 'flagged') {
    const flaggedItems = items.filter((i) => i.priority === 'urgent' || i.priority === 'high');
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
          <span className="text-xl leading-none">🚩</span>
          <span className="text-xl font-extrabold text-text-primary tracking-tight">Z flagą / Ważne</span>
          <span className="text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full ml-1">{flaggedItems.length}</span>
        </div>
        <div className="todo-grouped-surface">
          <div className="todo-grouped-body">
            {flaggedItems.length === 0 ? (
              <EmptyState icon="🚩" label="Brak oznaczonych zadań." />
            ) : (
              <div className="divide-y divide-border-custom/30">
                {flaggedItems.map((i) => <TodoCardConnected key={i.id} item={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (navDest === 'completed') {
    const doneItems = items.filter((i) => i.status === 'done');
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2 pb-1">
          <span className="text-xl leading-none">✅</span>
          <span className="text-xl font-extrabold text-text-primary tracking-tight">Ukończone</span>
          <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full ml-1">{doneItems.length}</span>
        </div>
        <div className="todo-grouped-surface">
          <div className="todo-grouped-body">
            {doneItems.length === 0 ? (
              <EmptyState icon="✅" label="Brak ukończonych zadań." />
            ) : (
              <div className="divide-y divide-border-custom/30">
                {doneItems.map((i) => <TodoCardConnected key={i.id} item={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeFilterSection) {
    return (
      <TodoSectionFlatView
        sectionId={activeFilterSection}
        renderInlineQuickCapture={renderInlineQuickCapture}
        renderAddTodoButton={renderAddTodoButton}
      />
    );
  }

  return null;
}

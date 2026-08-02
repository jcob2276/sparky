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

export default function TodoSmartListView({ navDest, renderInlineQuickCapture, renderAddTodoButton }: TodoSmartListViewProps) {
  const { items, todayItems, inboxItems, upcomingItems, activeFilterSection } = useTodoContext();

  if (navDest === 'today') {
    return (
      <div>
        <div className="flex items-center gap-2 px-1 pt-6 pb-4">
          <span className="text-xl leading-none">📅</span>
          <span className="text-2xl font-extrabold text-text-primary tracking-tight">Dziś</span>
          <span className="text-sm font-medium text-text-muted/50 ml-1">{todayItems.length}</span>
        </div>
        <div className="pt-1">
          {todayItems.length === 0 ? (
            <EmptyState icon="📅" label="Brak zadań na dziś." />
          ) : (
            todayItems.map((i) => <TodoCardConnected key={i.id} item={i} inToday />)
          )}
          {renderInlineQuickCapture('today')}
          {renderAddTodoButton('today')}
        </div>
      </div>
    );
  }

  if (navDest === 'inbox') {
    return (
      <div>
        <div className="flex items-center gap-2 px-1 pt-6 pb-4">
          <span className="text-xl leading-none">📥</span>
          <span className="text-2xl font-extrabold text-text-primary tracking-tight">Skrzynka</span>
          <span className="text-sm font-medium text-text-muted/50 ml-1">{inboxItems.length}</span>
        </div>
        <div className="pt-1">
          {inboxItems.length === 0 ? (
            <EmptyState icon="📥" label="Skrzynka pusta." />
          ) : (
            inboxItems.map((i) => <TodoCardConnected key={i.id} item={i} />)
          )}
          {renderInlineQuickCapture('inbox')}
          {renderAddTodoButton('inbox')}
        </div>
      </div>
    );
  }

  if (navDest === 'upcoming') {
    let lastDate: string | null = null;
    return (
      <div>
        <div className="flex items-center gap-2 px-1 pt-6 pb-4">
          <span className="text-xl leading-none">🗓️</span>
          <span className="text-2xl font-extrabold text-text-primary tracking-tight">Nadchodzące</span>
          <span className="text-sm font-medium text-text-muted/50 ml-1">{upcomingItems.length}</span>
        </div>
        <div className="pt-1">
          {upcomingItems.length === 0 ? (
            <EmptyState icon="🗓️" label="Brak zadań w najbliższych 7 dniach." />
          ) : (
            upcomingItems.map((i) => {
              const showDateHeader = i.due_date !== lastDate;
              lastDate = i.due_date;
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
            })
          )}
          {renderInlineQuickCapture('upcoming')}
          {renderAddTodoButton('upcoming')}
        </div>
      </div>
    );
  }

  if (navDest === 'all') {
    const activeItems = items.filter((i) => i.status !== 'done');
    return (
      <div>
        <div className="flex items-center gap-2 px-1 pt-6 pb-4">
          <span className="text-xl leading-none">📥</span>
          <span className="text-2xl font-extrabold text-text-primary tracking-tight">Wszystkie przypomnienia</span>
          <span className="text-sm font-medium text-text-muted/50 ml-1">{activeItems.length}</span>
        </div>
        <div className="pt-1">
          {activeItems.length === 0 ? (
            <EmptyState icon="📋" label="Brak otwartych przypomnień." />
          ) : (
            activeItems.map((i) => <TodoCardConnected key={i.id} item={i} />)
          )}
        </div>
      </div>
    );
  }

  if (navDest === 'flagged') {
    const flaggedItems = items.filter((i) => i.priority === 'urgent' || i.priority === 'high');
    return (
      <div>
        <div className="flex items-center gap-2 px-1 pt-6 pb-4">
          <span className="text-xl leading-none">🚩</span>
          <span className="text-2xl font-extrabold font-text-primary tracking-tight">Z flagą / Ważne</span>
          <span className="text-sm font-medium text-text-muted/50 ml-1">{flaggedItems.length}</span>
        </div>
        <div className="pt-1">
          {flaggedItems.length === 0 ? (
            <EmptyState icon="🚩" label="Brak oznaczonych przypomnień." />
          ) : (
            flaggedItems.map((i) => <TodoCardConnected key={i.id} item={i} />)
          )}
        </div>
      </div>
    );
  }

  if (navDest === 'completed') {
    const doneItems = items.filter((i) => i.status === 'done');
    return (
      <div>
        <div className="flex items-center gap-2 px-1 pt-6 pb-4">
          <span className="text-xl leading-none">✅</span>
          <span className="text-2xl font-extrabold text-text-primary tracking-tight">Ukończone</span>
          <span className="text-sm font-medium text-text-muted/50 ml-1">{doneItems.length}</span>
        </div>
        <div className="pt-1">
          {doneItems.length === 0 ? (
            <EmptyState icon="✅" label="Brak ukończonych zadań." />
          ) : (
            doneItems.map((i) => <TodoCardConnected key={i.id} item={i} />)
          )}
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

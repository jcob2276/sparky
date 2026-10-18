import { useTodoContext } from './context/TodoContext';
import BucketHeader from './BucketHeader';
import TodoCardConnected from './TodoCardConnected';
import EmptyState from './EmptyState';
import TodayRunway from './TodayRunway';
import DayCapacityBar from './DayCapacityBar';
import { dropState } from './todoDropState';

interface TodoTodayZoneProps {
  renderInlineQuickCapture: (sectionId: string) => React.ReactNode;
  renderAddTodoButton: (sectionId: string) => React.ReactNode;
}

export default function TodoTodayZone({ renderInlineQuickCapture, renderAddTodoButton }: TodoTodayZoneProps) {
  const {
    todayItems, draggingItem, dragTarget, todayZoneRef,
    collapsedSections, toggleSectionCollapse, userId, today,
  } = useTodoContext();

  const totalMin = todayItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);

  return (
    <div
      ref={todayZoneRef}
      className="todo-grouped-surface mb-4"
      data-drop={dropState(draggingItem !== null, dragTarget === 'today')}
    >
      <div className="todo-grouped-header">
        <BucketHeader
          icon=""
          title="Na dziś"
          count={todayItems.length}
          collapsed={!!collapsedSections['today']}
          onToggle={() => toggleSectionCollapse('today')}
          isDropTarget={dragTarget === 'today'}
        />
        <DayCapacityBar userId={userId} today={today} plannedMinutes={totalMin} />
      </div>

      {!collapsedSections['today'] && (
        <div className="todo-grouped-body">
          <TodayRunway />
          {todayItems.length === 0 ? (
            <EmptyState
              icon="🔥"
              label="Nic na dziś. Przeciągnij tu zadanie albo dodaj nowe."
              isDragOver={dragTarget === 'today'}
              dragColor="orange"
            />
          ) : (
            <div className="todo-focus-grid" data-drop-label="Upuść, aby zaplanować na dziś">
              {todayItems.map((i) => (
                <TodoCardConnected key={i.id} item={i} inToday />
              ))}
            </div>
          )}
          <div className="pt-2 px-1">
            {renderInlineQuickCapture('today')}
            {renderAddTodoButton('today')}
          </div>
        </div>
      )}
    </div>
  );
}

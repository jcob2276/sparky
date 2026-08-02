import { useTodoContext } from './context/TodoContext';
import DataStateNotice from '../core/DataStateNotice';
import TodoBatchClassifyChip from './TodoBatchClassifyChip';
import TodoOverviewDashboard from './TodoOverviewDashboard';
import TodoSmartListView from './TodoSmartListView';
import TodoDoneHistory from './TodoDoneHistory';
import { AppleRemindersSmartGrid } from './AppleRemindersSmartGrid';
import type { TodoNavDest } from './TodoSidebar';

interface TodoListViewProps {
  navDest: TodoNavDest;
  onSelectNavDest: (dest: TodoNavDest) => void;
  renderInlineQuickCapture: (sectionId: string) => React.ReactNode;
  renderAddTodoButton: (sectionId: string) => React.ReactNode;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleId?: (id: string) => void;
}

export default function TodoListView({
  navDest,
  onSelectNavDest,
  renderInlineQuickCapture,
  renderAddTodoButton,
  isSelectMode,
  selectedIds,
  onToggleId,
}: TodoListViewProps) {
  const { items, todayItems, upcomingItems, error, setExpandedId, activeFilterSection } = useTodoContext();
  const isSmartView = navDest !== 'overview' || !!activeFilterSection;

  const allCount = items.filter((i) => i.status !== 'done').length;
  const flaggedCount = items.filter((i) => (i.priority === 'urgent' || i.priority === 'high') && i.status !== 'done').length;
  const completedCount = items.filter((i) => i.status === 'done').length;

  return (
    <main className="flex-1 overflow-y-auto" onClick={() => setExpandedId(null)}>
      <div className="mx-auto max-w-[var(--content-default)] space-y-4 px-4 py-4 pb-24 lg:px-8">
        {error && <DataStateNotice tone="warning" title="Błąd" detail={error} />}

        <AppleRemindersSmartGrid
          navDest={navDest}
          onSelectNavDest={onSelectNavDest}
          todayCount={todayItems.length}
          upcomingCount={upcomingItems.length}
          allCount={allCount}
          flaggedCount={flaggedCount}
          completedCount={completedCount}
        />

        <TodoBatchClassifyChip />

        <div className="space-y-6">
          {isSmartView ? (
            <TodoSmartListView
              navDest={navDest}
              renderInlineQuickCapture={renderInlineQuickCapture}
              renderAddTodoButton={renderAddTodoButton}
            />
          ) : (
            <TodoOverviewDashboard
              renderInlineQuickCapture={renderInlineQuickCapture}
              renderAddTodoButton={renderAddTodoButton}
            />
          )}

          <TodoDoneHistory />
        </div>
      </div>
    </main>
  );
}

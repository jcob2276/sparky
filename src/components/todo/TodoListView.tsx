import { useRef, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Keyboard } from 'lucide-react';
import { useTodoContext } from './context/TodoContext';
import DataStateNotice from '../core/DataStateNotice';
import TodoBatchClassifyChip from './TodoBatchClassifyChip';
import TodoOverviewDashboard from './TodoOverviewDashboard';
import TodoSmartListView from './TodoSmartListView';
import TodoDoneHistory from './TodoDoneHistory';
import { AppleRemindersSmartGrid } from './AppleRemindersSmartGrid';
import type { TodoNavDest } from './TodoSidebar';
import TodoShortcutsHelp from './TodoShortcutsHelp';
import { useTodoRowNav } from './hooks/useTodoRowNav';
import { isStudySubject } from '../../lib/todo/studySubjects';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../store/useStore';
import { todoKeys } from '../../lib/queryKeys';
import { countDoneTodoItems } from '../../lib/todo/todo';

interface TodoListViewProps {
  navDest: TodoNavDest;
  onSelectNavDest: (dest: TodoNavDest) => void;
  renderInlineQuickCapture: (sectionId: string) => React.ReactNode;
  renderAddTodoButton: (sectionId: string) => React.ReactNode;
}

export default function TodoListView({
  navDest,
  onSelectNavDest,
  renderInlineQuickCapture,
  renderAddTodoButton,
}: TodoListViewProps) {
  const { items, todayItems, upcomingItems, error, setExpandedId, activeFilterSection } = useTodoContext();
  const mainRef = useRef<HTMLElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  useTodoRowNav(mainRef, () => setHelpOpen(true));
  const isSmartView = navDest !== 'overview' || !!activeFilterSection;

  const tasks = items.filter(item => !isStudySubject(item));
  const allCount = tasks.filter((i) => i.status !== 'done').length;
  const flaggedCount = tasks.filter((i) => (i.priority === 'urgent' || i.priority === 'high') && i.status !== 'done').length;
  const loadedDoneCount = tasks.filter((i) => i.status === 'done').length;
  const userId = useStore((state) => state.session?.user?.id);
  const doneCountQuery = useQuery({
    queryKey: [...todoKeys.items(userId ?? ''), 'done-count'],
    queryFn: () => countDoneTodoItems(userId!),
    enabled: Boolean(userId),
  });
  const completedCount = Math.max(loadedDoneCount, doneCountQuery.data ?? 0);

  return (
    <main ref={mainRef} className="flex-1 overflow-y-auto" onClick={() => setExpandedId(null)}>
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

        <Pressable haptic="none" onClick={(e) => { e.stopPropagation(); setHelpOpen(true); }}
          className="todo-instant mx-auto flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary focus-visible:shadow-focus"
          aria-label="Skróty klawiszowe" title="Skróty klawiszowe · ?">
          <Keyboard size={14} aria-hidden="true" /> Skróty <kbd className="rounded border border-border-custom px-1 font-mono">?</kbd>
        </Pressable>
        <TodoShortcutsHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import Button from '../ui/Button';
import { useTodoContext } from './context/TodoContext';
import BucketHeader from './BucketHeader';
import TodoCardConnected from './TodoCardConnected';
import { confirmDialog, notify } from '../../lib/notify';
import { deleteTodoItem } from '../../lib/todo/todo';

export default function TodoDoneHistory() {
  const { showDone, setShowDone, doneItems, setItems } = useTodoContext();
  const [visibleDoneCount, setVisibleDoneCount] = useState(30);
  const [isClearing, setIsClearing] = useState(false);

  if (!showDone || doneItems.length === 0) return null;

  const handleClearDone = async () => {
    const count = doneItems.length;
    const ok = await confirmDialog(`Czy na pewno chcesz usunąć wszystkie ukończone zadania (${count})?`);
    if (!ok) return;

    setIsClearing(true);
    try {
      const ids = doneItems.map(i => i.id);
      if (setItems) {
        setItems(prev => prev.filter(i => i.status !== 'done'));
      }
      await Promise.all(ids.map(id => deleteTodoItem(id)));
      notify(`Usunięto ${count} ukończonych zadań.`, 'success');
    } catch {
      notify('Wystąpił problem podczas usuwania ukończonych zadań.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="border-t border-border-custom/20 pt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <BucketHeader
          icon="✅"
          title="Historia"
          count={doneItems.length}
          collapsed={false}
          onToggle={() => setShowDone(false)}
          isDropTarget={false}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearDone}
          loading={isClearing}
          icon={!isClearing ? <Trash2 size={13} /> : undefined}
          className="shrink-0 text-3xs font-black uppercase tracking-wider text-danger hover:text-danger hover:bg-danger/10 !px-2.5 !py-1 !rounded-lg"
          title="Wyczyść wszystkie ukończone zadania"
        >
          Wyczyść ukończone
        </Button>
      </div>

      <div className="pt-1 space-y-1">
        {doneItems.slice(0, visibleDoneCount).map((i) => (
          <TodoCardConnected key={i.id} item={i} />
        ))}
      </div>

      {doneItems.length > visibleDoneCount && (
        <div className="flex justify-center mt-3 mb-2">
          <Pressable
            type="button"
            onClick={() => setVisibleDoneCount(prev => prev + 30)}
            className="px-4 py-2 rounded-xl border border-border-custom bg-surface hover:bg-surface-solid text-xs font-bold uppercase tracking-wider text-text-secondary ui-interactive active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Pokaż więcej ukończonych ({doneItems.length - visibleDoneCount} pozostało)
          </Pressable>
        </div>
      )}
    </div>
  );
}

import { Pressable } from '../ui/ControlPrimitives';
import { Sparkles } from 'lucide-react';
import { useTodoContext } from './context/TodoContext';

export default function TodoBatchClassifyChip() {
  const { items, batchClassify, batchClassifying } = useTodoContext();

  const unclassifiedCount = items.filter((i) => i.status === 'open' && !i.ai_bucket && !i.due_date).length;
  if (!unclassifiedCount) return null;

  return (
    <Pressable
      onClick={batchClassify}
      disabled={batchClassifying}
      className="w-full flex items-center justify-between rounded-xl bg-surface-solid/80 border border-border-custom/50 px-3 py-2 text-left ui-interactive hover:border-primary/40 active:scale-[var(--ds-arbitrary-0-99)] disabled:opacity-[var(--opacity-50)] cursor-pointer shadow-xs mb-1"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary shrink-0">
          <Sparkles size={13} className={batchClassifying ? 'animate-spin' : ''} />
        </div>
        <span className="text-xs font-semibold text-text-primary truncate">
          {batchClassifying ? 'Porządkowanie zadań...' : `${unclassifiedCount} zadań do przypisania przez AI`}
        </span>
      </div>
      <span className="text-3xs font-bold bg-primary/15 text-primary px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">
        Klasyfikuj
      </span>
    </Pressable>
  );
}

import { useRef, useState } from 'react';
import { ChevronRight, Pencil, Trash2, Check, X } from 'lucide-react';
import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { confirmDialog } from '../../lib/notify';

export interface BucketHeaderProps {
  icon: string;
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  isDropTarget: boolean;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export default function BucketHeader({ icon, title, count, collapsed, onToggle, isDropTarget, onRename, onDelete }: BucketHeaderProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const renameRef = useRef<HTMLButtonElement>(null);
  const finishRename = () => {
    setRenaming(false);
    requestAnimationFrame(() => renameRef.current?.focus());
  };
  const commitRename = () => {
    const next = draft.trim();
    if (!next) return;
    if (next !== title) onRename?.(next);
    finishRename();
  };
  const deleteSection = async () => {
    if (await confirmDialog(`Usunąć sekcję „${title}”? Zadania wrócą do skrzynki.`)) onDelete?.();
  };
  const actionClass = 'todo-instant flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 focus-visible:shadow-focus';

  return (
    <div className={`flex w-full items-center gap-1 ${isDropTarget ? 'text-primary' : 'text-text-primary'}`}>
      {renaming ? (
        <div className="flex flex-1 min-w-0 items-center gap-1">
          <ControlInput autoFocus aria-label="Nazwa sekcji" value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') finishRename();
            }}
            className="h-11 min-w-0 flex-1 rounded-lg border border-primary/40 bg-surface-solid px-3 text-base text-text-primary focus-visible:shadow-focus" />
          <Pressable onClick={commitRename} disabled={!draft.trim()} className={actionClass} aria-label="Zapisz nazwę sekcji"><Check size={18} /></Pressable>
          <Pressable onClick={finishRename} className={actionClass} aria-label="Anuluj zmianę nazwy"><X size={18} /></Pressable>
        </div>
      ) : (
        <Pressable onClick={onToggle} aria-expanded={!collapsed}
          className="todo-instant flex min-h-11 flex-1 min-w-0 items-center gap-2 rounded-lg text-left focus-visible:shadow-focus">
          <ChevronRight size={16} className={`text-text-secondary shrink-0 ${collapsed ? '' : 'rotate-90'}`} aria-hidden="true" />
          {icon && <span className="text-lg leading-none shrink-0" aria-hidden="true">{icon}</span>}
          <span className="text-base sm:text-lg font-bold tracking-tight truncate">{title}</span>
          <span className="text-sm tabular-nums text-text-secondary shrink-0">{count}</span>
        </Pressable>
      )}
      {!renaming && <>
        {onRename && <Pressable ref={renameRef} onClick={() => { setDraft(title); setRenaming(true); }}
          className={actionClass} aria-label={`Zmień nazwę sekcji ${title}`} title="Zmień nazwę"><Pencil size={16} /></Pressable>}
        {onDelete && <Pressable onClick={() => void deleteSection()} className={`${actionClass} hover:text-danger`}
          aria-label={`Usuń sekcję ${title}`} title="Usuń sekcję"><Trash2 size={16} /></Pressable>}
      </>}
    </div>
  );
}

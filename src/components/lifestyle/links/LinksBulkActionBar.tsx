import { useState } from 'react';
import { Pressable } from '../../ui/ControlPrimitives';
import {
  Check,
  CheckCheck,
  FolderInput,
  ListTodo,
  Trash2,
  X,
} from 'lucide-react';
import { CATEGORIES } from './linksUtils';

interface LinksBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBulkMarkRead: (status: 'read' | 'unread') => void;
  onBulkCategory: (category: string) => void;
  onBulkDelete: () => void;
  onBulkToTodo: () => void;
  busy?: boolean;
}

export function LinksBulkActionBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  onBulkMarkRead,
  onBulkCategory,
  onBulkDelete,
  onBulkToTodo,
  busy = false,
}: LinksBulkActionBarProps) {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <aside
      aria-label="Pasek masowych akcji linków"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-floating-bar)] flex flex-col items-center gap-2"
    >
      {showCategoryMenu && (
        <div className="rounded-2xl border border-border-custom bg-background/95 p-2 shadow-xl backdrop-blur-md min-w-[170px] animate-in fade-in zoom-in-95">
          <p className="px-2 py-1 text-3xs font-black uppercase text-text-muted">Kategoria</p>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onClick={() => {
                onBulkCategory(cat);
                setShowCategoryMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-surface-solid text-text-primary"
            >
              {cat}
            </Pressable>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-2xl border border-border-custom/50 bg-background/95 px-3 py-2 shadow-2xl backdrop-blur-xl ring-1 ring-border-custom/20">
        <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold text-text-primary">
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-on-accent text-3xs font-black px-1">
            {selectedCount}
          </span>
          <span className="hidden sm:inline">wybranych</span>
        </span>

        <div className="h-4 w-px bg-border-custom/40 mx-0.5" />

        <Pressable
          onClick={onSelectAll}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Zaznacz wszystkie widoczne"
        >
          <CheckCheck size={14} />
          <span className="hidden md:inline">Wszystkie</span>
        </Pressable>

        <Pressable
          onClick={() => onBulkMarkRead('read')}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Oznacz jako przeczytane"
        >
          <Check size={14} />
          <span className="hidden md:inline">Przeczytane</span>
        </Pressable>

        <Pressable
          onClick={() => setShowCategoryMenu(!showCategoryMenu)}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Zmień kategorię"
        >
          <FolderInput size={14} />
          <span className="hidden md:inline">Kategoria</span>
        </Pressable>

        <Pressable
          onClick={onBulkToTodo}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Konwertuj do zadań Todo"
        >
          <ListTodo size={14} />
          <span className="hidden md:inline">Do Todo</span>
        </Pressable>

        <Pressable
          onClick={onBulkDelete}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors btn-press cursor-pointer"
          title="Usuń wybrane linki"
        >
          <Trash2 size={14} />
          <span className="hidden md:inline">Usuń</span>
        </Pressable>

        <div className="h-4 w-px bg-border-custom/40 mx-0.5" />

        <Pressable
          onClick={onClearSelection}
          disabled={busy}
          className="p-1.5 rounded-xl text-text-muted hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Anuluj wybór (Esc)"
          aria-label="Wyczyść zaznaczenie"
        >
          <X size={14} />
        </Pressable>
      </div>
    </aside>
  );
}

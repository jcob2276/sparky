/**
 * @component TodoBulkActionBar
 * @role Floating action bar for mass/bulk operations on selected tasks in Todo (Apple Reminders multi-select).
 */

import React from 'react';
import { Calendar, CheckCircle2, Trash2, Flag, X, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

interface TodoBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkComplete: () => void;
  onBulkDelete: () => void;
  onBulkSetToday: () => void;
  onBulkSetTomorrow: () => void;
  onBulkSetPriority: (priority: 'urgent' | 'high' | 'normal' | 'low') => void;
  busy?: boolean;
}

export function TodoBulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkComplete,
  onBulkDelete,
  onBulkSetToday,
  onBulkSetTomorrow,
  onBulkSetPriority,
  busy,
}: TodoBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[var(--z-emergency)] flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border-custom/50 bg-background/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom duration-200 select-none max-w-[92vw] overflow-x-auto">
      <div className="flex items-center gap-2 pr-2 border-r border-border-custom/30 shrink-0">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-accent text-xs font-black">
          {selectedCount}
        </span>
        <span className="text-xs font-bold text-text-primary hidden sm:inline">
          wybranych
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={onBulkSetToday}
          className="flex items-center gap-1 text-2xs font-bold px-2.5 py-1.5 rounded-xl border border-border-custom/40 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
          title="Przesuń na dzisiaj"
        >
          <Calendar size={13} className="text-primary" />
          <span>Dziś</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onBulkSetTomorrow}
          className="flex items-center gap-1 text-2xs font-bold px-2.5 py-1.5 rounded-xl border border-border-custom/40 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
          title="Przesuń na jutro"
        >
          <ArrowRight size={13} className="text-warning" />
          <span>Jutro</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onBulkSetPriority('urgent')}
          className="flex items-center gap-1 text-2xs font-bold px-2.5 py-1.5 rounded-xl border border-border-custom/40 bg-surface-solid/50 text-text-secondary hover:text-text-primary hover:border-danger/40 active:scale-95 transition-all cursor-pointer"
          title="Ustaw wysoki priorytet (P1)"
        >
          <Flag size={13} className="text-danger" />
          <span>Ważne</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onBulkComplete}
          className="flex items-center gap-1 text-2xs font-bold px-2.5 py-1.5 rounded-xl bg-success/15 border border-success/30 text-success hover:bg-success/25 active:scale-95 transition-all cursor-pointer"
          title="Oznacz jako ukończone"
        >
          <CheckCircle2 size={13} />
          <span>Ukończ</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onBulkDelete}
          className="flex items-center gap-1 text-2xs font-bold px-2.5 py-1.5 rounded-xl bg-danger/15 border border-danger/30 text-danger hover:bg-danger/25 active:scale-95 transition-all cursor-pointer"
          title="Usuń wybrane zadania"
        >
          <Trash2 size={13} />
          <span>Usuń</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClearSelection}
        className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-solid/60 transition-colors ml-1 shrink-0"
        title="Odznacz wszystkie"
      >
        <X size={16} />
      </button>
    </div>
  );
}

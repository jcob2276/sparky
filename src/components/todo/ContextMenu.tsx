import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Calendar, Copy, Trash2 } from 'lucide-react';
import { Pressable, ControlSelect } from '../ui/ControlPrimitives';
import { shiftDateStr } from '../../lib/date';
import type { TodoItemRow } from '../../lib/todo/todo';

export interface ContextMenuProps {
  x: number;
  y: number;
  item: TodoItemRow;
  today: string;
  sections: { id: string; name: string }[];
  onClose: () => void;
  onDelete: () => void;
  onSetDueDate: (date: string | null) => void;
  onMoveSection: (sId: string | null) => void;
  onEditStart: () => void;
  onSetPriority: (priority: string) => void;
  onDuplicate: () => void;
}

export default function ContextMenu({ x, y, item, today, sections, onClose, onDelete, onSetDueDate, onMoveSection, onEditStart, onSetPriority, onDuplicate }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Keyboard openings stay instant; pointer openings communicate the trigger's location.
  const [pointerOpening] = useState(() => !document.activeElement?.matches(':focus-visible'));
  const width = Math.min(288, window.innerWidth - 16);
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - 430));

  useLayoutEffect(() => {
    const panel = ref.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (panel) {
      const fittedTop = Math.max(8, Math.min(y, window.innerHeight - panel.offsetHeight - 8));
      panel.style.top = `${fittedTop}px`;
      panel.style.transformOrigin = `${Math.max(0, x - left)}px ${Math.max(0, y - fittedTop)}px`;
    }
    panel?.querySelector<HTMLButtonElement>('button')?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (panel && !panel.contains(event.target as Node)) onClose();
    };
    const navigate = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (!(event.target instanceof Node) || !panel?.contains(event.target)) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)'));
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Tab') {
        event.preventDefault();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
      // Native selects retain their own arrow-key interaction.
      if (event.target instanceof HTMLSelectElement) return;
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
        controls[next]?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', navigate, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', navigate, true);
      if (document.activeElement === document.body || panel?.contains(document.activeElement)) trigger?.focus();
    };
  }, [onClose, x, y, left]);

  const act = (action: () => void) => { action(); onClose(); };
  const rowClass = 'todo-instant flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-medium hover:bg-surface-2 focus-visible:shadow-focus';
  const selectClass = 'todo-instant mt-1 h-11 w-full rounded-lg border border-border-custom bg-surface-solid px-3 text-sm text-text-primary focus-visible:shadow-focus';

  return createPortal(
    <div ref={ref} role="dialog" aria-label={`Opcje zadania: ${item.title}`} data-motion={pointerOpening ? 'pointer' : 'keyboard'}
      style={{ left, top, transformOrigin: `${Math.max(0, x - left)}px ${Math.max(0, y - top)}px` }}
      className="todo-action-menu fixed overflow-y-auto rounded-2xl border border-border-custom bg-surface p-2 shadow-xl text-sm text-text-primary">
      <Pressable onClick={() => act(onEditStart)} className={rowClass}><Pencil size={17} aria-hidden="true" />Edytuj zadanie</Pressable>
      <div className="my-2 border-t border-border-custom" />
      <p className="flex items-center gap-2 px-3 text-xs font-medium text-text-secondary"><Calendar size={14} aria-hidden="true" />Termin</p>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <Pressable onClick={() => act(() => onSetDueDate(today))} className={rowClass}>Dzisiaj</Pressable>
        <Pressable onClick={() => act(() => onSetDueDate(shiftDateStr(today, 1)))} className={rowClass}>Jutro</Pressable>
      </div>
      <Pressable onClick={() => act(() => onSetDueDate(null))} className={`${rowClass} text-text-secondary`}>Usuń termin</Pressable>
      <div className="grid gap-3 border-y border-border-custom px-3 py-3 my-2">
        <label className="text-xs font-medium text-text-secondary">Priorytet
          <ControlSelect value={item.priority} onChange={e => act(() => onSetPriority(e.target.value))} className={selectClass}>
            <option value="urgent">P1 · Pilne</option><option value="high">P2 · Ważne</option>
            <option value="normal">P3 · Normalne</option><option value="low">P4 · Niskie</option>
          </ControlSelect>
        </label>
        <label className="text-xs font-medium text-text-secondary">Przenieś do sekcji
          <ControlSelect value={item.section_id ?? ''} onChange={e => act(() => onMoveSection(e.target.value || null))} className={selectClass}>
            <option value="">Skrzynka</option>{sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
          </ControlSelect>
        </label>
      </div>
      <Pressable onClick={() => act(onDuplicate)} className={rowClass}><Copy size={17} aria-hidden="true" />Duplikuj zadanie</Pressable>
      <Pressable onClick={() => act(onDelete)} className={`${rowClass} text-danger hover:bg-danger/10`}><Trash2 size={17} aria-hidden="true" />Usuń zadanie</Pressable>
    </div>, document.body,
  );
}

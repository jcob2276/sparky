import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Flag, FolderInput, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import TodoAnchoredPopover, { type PopoverAnchor } from './TodoAnchoredPopover';
import { DatePresetsPanel, MovePanel, PriorityPanel } from './TodoRowPickers';
import { priorityTone } from './todoPriorityOptions';
import { TODO_ROW_COMMAND_EVENT, focusTodoRow, readTodoRowCommand, type TodoRowCommand } from './todoRowCommands';
import type { TodoItemRow } from '../../lib/todo/todo';

interface TodoGripHandlers {
  onGripTouchStart: (e: React.TouchEvent) => void;
  onGripTouchEnd: (e: React.TouchEvent) => void;
  onGripTouchMove: (e: React.TouchEvent) => void;
  onGripMouseDown: (e: React.MouseEvent) => void;
}

interface TodoRowQuickActionsProps {
  item: TodoItemRow;
  today: string;
  expanded: boolean;
  panelId: string;
  sections: { id: string; name: string }[];
  grip: TodoGripHandlers;
  onToggleExpand: () => void;
  onDelete: () => void;
  onSetSchedule: (patch: { due_date?: string | null }) => void;
  onSetPriority: (priority: string) => void;
  onMoveSection: (sectionId: string | null) => void;
  onShowContextMenu: (item: TodoItemRow, clientX: number, clientY: number) => void;
}

interface OpenPopover {
  kind: TodoRowCommand;
  anchor: PopoverAnchor;
  returnTo: HTMLElement | null;
}

const PANEL_LABEL: Record<TodoRowCommand, string> = { date: 'Termin', priority: 'Priorytet', move: 'Przenieś do sekcji' };
const PANEL_WIDTH: Record<TodoRowCommand, number> = { date: 232, priority: 200, move: 240 };
const BAR_BUTTON = 'todo-qa todo-instant hover:bg-surface-2 focus-visible:shadow-focus';
const QUIET = 'text-text-secondary hover:text-text-primary';

/** Linear-style hover bar: one click each for date, priority, move, delete. Also the target of d / p / m shortcuts. */
export default function TodoRowQuickActions({
  item, today, expanded, panelId, sections, grip,
  onToggleExpand, onDelete, onSetSchedule, onSetPriority, onMoveSection, onShowContextMenu,
}: TodoRowQuickActionsProps) {
  const [open, setOpen] = useState<OpenPopover | null>(null);
  const dateRef = useRef<HTMLButtonElement>(null);
  const priorityRef = useRef<HTMLButtonElement>(null);
  const moveRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback((kind: TodoRowCommand) => {
    const button = { date: dateRef, priority: priorityRef, move: moveRef }[kind].current;
    let rect = button?.getBoundingClientRect();
    // Touch layouts hide the bar buttons; anchor to the row instead.
    if (!rect || rect.width === 0) rect = barRef.current?.closest('[data-todo-id]')?.getBoundingClientRect() ?? rect;
    if (!rect) return;
    const active = document.activeElement;
    setOpen({
      kind,
      anchor: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
      returnTo: active instanceof HTMLElement ? active : null,
    });
  }, []);

  useEffect(() => {
    const onCommand = (event: Event) => {
      const detail = readTodoRowCommand(event);
      if (detail && detail.id === item.id) openPanel(detail.command);
    };
    window.addEventListener(TODO_ROW_COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(TODO_ROW_COMMAND_EVENT, onCommand);
  }, [item.id, openPanel]);

  const close = useCallback(() => setOpen(null), []);
  // Picked via keyboard (popover opened from the row shell): keep the row focused even if it re-renders elsewhere.
  const pick = (action: () => void) => {
    const fromRow = open?.returnTo?.dataset.todoId === item.id;
    close();
    action();
    if (fromRow) focusTodoRow(item.id);
  };
  const toggle = (kind: TodoRowCommand) => (open?.kind === kind ? close() : openPanel(kind));

  return (
    <div ref={barRef} role="group" aria-label={`Szybkie akcje: ${item.title}`} className="todo-focus-actions">
      <Pressable ref={dateRef} haptic="none" className={`${BAR_BUTTON} ${QUIET} todo-qa-fine`} data-tip="Termin · D"
        aria-label={`Ustaw termin: ${item.title}`} aria-haspopup="dialog" aria-expanded={open?.kind === 'date'}
        onClick={(e) => { e.stopPropagation(); toggle('date'); }}>
        <CalendarDays size={16} aria-hidden="true" />
      </Pressable>
      <Pressable ref={priorityRef} haptic="none" className={`${BAR_BUTTON} todo-qa-fine ${priorityTone(item.priority)}`} data-tip="Priorytet · P"
        aria-label={`Ustaw priorytet: ${item.title}`} aria-haspopup="dialog" aria-expanded={open?.kind === 'priority'}
        onClick={(e) => { e.stopPropagation(); toggle('priority'); }}>
        <Flag size={16} aria-hidden="true" />
      </Pressable>
      <Pressable ref={moveRef} haptic="none" className={`${BAR_BUTTON} ${QUIET} todo-qa-fine`} data-tip="Przenieś do… · M"
        aria-label={`Przenieś do sekcji: ${item.title}`} aria-haspopup="dialog" aria-expanded={open?.kind === 'move'}
        onClick={(e) => { e.stopPropagation(); toggle('move'); }}>
        <FolderInput size={16} aria-hidden="true" />
      </Pressable>
      <Pressable haptic="none" className="todo-qa todo-instant todo-qa-fine text-text-secondary hover:bg-danger/10 hover:text-danger focus-visible:shadow-focus" data-tip="Usuń · Del"
        aria-label={`Usuń: ${item.title}`} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 size={16} aria-hidden="true" />
      </Pressable>
      <Pressable haptic="none" className={`${BAR_BUTTON} ${QUIET}`} data-tip={expanded ? 'Zwiń szczegóły · Enter' : 'Szczegóły · Enter'}
        aria-label={`${expanded ? 'Zwiń' : 'Rozwiń'} szczegóły: ${item.title}`} aria-expanded={expanded} aria-controls={panelId}
        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
        <ChevronDown size={17} className={`todo-chevron ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Pressable>
      <div data-no-view-swipe onTouchStart={grip.onGripTouchStart} onTouchEnd={grip.onGripTouchEnd}
        onTouchMove={grip.onGripTouchMove} onMouseDown={grip.onGripMouseDown}
        className="todo-focus-grip todo-qa text-text-secondary" data-tip="Przeciągnij do sekcji" aria-hidden="true">
        <GripVertical size={16} aria-hidden="true" />
      </div>
      <Pressable haptic="none" className={`${BAR_BUTTON} ${QUIET}`} data-tip="Więcej opcji" aria-label="Więcej opcji"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          onShowContextMenu(item, rect.left, rect.bottom + 4);
        }}>
        <MoreHorizontal size={18} aria-hidden="true" />
      </Pressable>

      {open && (
        <TodoAnchoredPopover anchor={open.anchor} label={PANEL_LABEL[open.kind]} width={PANEL_WIDTH[open.kind]}
          onClose={close} returnFocusTo={open.returnTo}>
          {open.kind === 'date' && (
            <DatePresetsPanel today={today} dueDate={item.due_date}
              onPick={(date) => pick(() => onSetSchedule({ due_date: date }))} />
          )}
          {open.kind === 'priority' && (
            <PriorityPanel priority={item.priority || 'normal'}
              onPick={(priority) => pick(() => onSetPriority(priority))} />
          )}
          {open.kind === 'move' && (
            <MovePanel sections={sections} sectionId={item.section_id}
              onPick={(sectionId) => pick(() => onMoveSection(sectionId))} />
          )}
        </TodoAnchoredPopover>
      )}
    </div>
  );
}

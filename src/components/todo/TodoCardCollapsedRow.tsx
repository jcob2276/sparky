import { useEffect, useRef } from 'react';
import { CalendarDays, Check, Clock, Repeat2 } from 'lucide-react';
import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { getPlainText } from '../../lib/noteText';
import { RECURRENCE_LABELS } from './todoUtils';
import TodoRowQuickActions from './TodoRowQuickActions';
import type { TodoItemRow } from '../../lib/todo/todo';

interface TodoCardCollapsedRowProps {
  item: TodoItemRow;
  busy: boolean;
  isDone: boolean;
  icon: string | null;
  label: string;
  dateInfo: { text: string; color: string } | null;
  today: string;
  isEditing: boolean;
  editingTitle: string;
  onEditChange: (val: string) => void;
  onEditSave: () => void;
  onEditCancel?: () => void;
  expanded: boolean;
  /** Click on the title starts inline editing. */
  onTitlePress: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  sections: { id: string; name: string }[];
  onSetSchedule: (patch: { due_date?: string | null }) => void;
  onSetPriority: (priority: string) => void;
  onMoveSection: (sectionId: string | null) => void;
  panelId: string;
  totalSubtaskCount: number;
  doneSubtaskCount: number;
  isLinkedToPlan: boolean;
  sectionName?: string | null;
  dreamTitle?: string | null;
  swipe: {
    handleComplete: () => void;
    onGripTouchStart: (e: React.TouchEvent) => void;
    onGripTouchEnd: (e: React.TouchEvent) => void;
    onGripTouchMove: (e: React.TouchEvent) => void;
    onGripMouseDown: (e: React.MouseEvent) => void;
  };
  onShowContextMenu: (item: TodoItemRow, clientX: number, clientY: number) => void;
}

const PRIORITY_LABEL: Record<string, string> = { urgent: 'P1 · Pilne', high: 'P2 · Ważne', normal: 'P3', low: 'P4' };

export default function TodoCardCollapsedRow({ item, busy, isDone, icon, label, dateInfo, today,
  isEditing, editingTitle, onEditChange, onEditSave, onEditCancel, expanded, onTitlePress, onToggleExpand, onDelete, panelId, sections, onSetSchedule, onSetPriority, onMoveSection,
  totalSubtaskCount, doneSubtaskCount, isLinkedToPlan, sectionName, dreamTitle, swipe, onShowContextMenu,
}: TodoCardCollapsedRowProps) {
  const notes = getPlainText(item.notes || '').replace(/\bsource:(?:note|link):[0-9a-f-]+/gi, '').trim();
  const priority = item.priority || 'normal';
  // Enter/Esc end the edit explicitly; the blur that follows the unmount must not save a second time.
  const skipBlur = useRef(false);
  useEffect(() => { if (isEditing) skipBlur.current = false; }, [isEditing]);
  const finishEdit = (input: HTMLInputElement, action: () => void) => {
    skipBlur.current = true;
    const shell = input.closest<HTMLElement>('[data-todo-id]');
    action();
    requestAnimationFrame(() => shell?.focus({ preventScroll: true }));
  };
  return (
    <>
      <div className="todo-focus-top">
        {(dateInfo || (isDone && item.due_date)) && (
          <span className={`todo-focus-date ${dateInfo?.color || 'text-text-secondary'}`}>
            <CalendarDays size={13} aria-hidden="true" />{dateInfo?.text || item.due_date}
          </span>
        )}
        {(priority === 'urgent' || priority === 'high') && (
          <span className="todo-focus-priority todo-focus-important">{PRIORITY_LABEL[priority]}</span>
        )}
      </div>
      <div className="todo-focus-title-row">
        <Pressable haptic="none" onClick={e => { e.stopPropagation(); swipe.handleComplete(); }} disabled={busy}
          role="checkbox" aria-checked={isDone}
          aria-label={`${isDone ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}: ${item.title}`}
          className="todo-instant flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:shadow-focus">
          <span className={`todo-focus-check ${isDone ? 'is-done' : ''}`}>{isDone && <Check size={13} strokeWidth={3} aria-hidden="true" />}</span>
        </Pressable>
        {icon && <span aria-hidden="true" className="text-lg">{icon}</span>}
        {isEditing ? (
          <ControlInput autoFocus value={editingTitle} onChange={e => onEditChange(e.target.value)}
            aria-label="Tytuł zadania (Enter zapisuje, Esc anuluje)"
            onKeyDown={e => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') { e.preventDefault(); finishEdit(e.currentTarget, onEditSave); }
              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishEdit(e.currentTarget, onEditCancel ?? onEditSave); }
            }}
            onBlur={() => { if (skipBlur.current) { skipBlur.current = false; return; } onEditSave(); }}
            onClick={e => e.stopPropagation()}
            className="min-w-0 w-full rounded-lg border border-primary/40 bg-surface-solid px-2 py-2 text-base text-text-primary focus-visible:shadow-focus" />
        ) : (
          <Pressable title={item.title} onClick={e => { e.stopPropagation(); onTitlePress(); }}
            className={`todo-instant todo-focus-title cursor-text min-h-11 min-w-0 flex-1 rounded-lg text-left text-base font-semibold leading-snug tracking-tight focus-visible:shadow-focus ${isDone ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
            {label}
          </Pressable>
        )}
      </div>
      {!expanded && !!notes && <p className="todo-focus-note" title={notes}>{notes}</p>}
      <div className="todo-focus-footer">
        <div className="todo-focus-meta">
          {sectionName && <span title={sectionName}>{sectionName}</span>}
          {dreamTitle && <span title={dreamTitle}>{dreamTitle}</span>}
          {!sectionName && (item.tags || []).length > 0 && <span>{(item.tags || []).slice(0, 2).join(' · ')}</span>}
          {totalSubtaskCount > 0 && <span>{doneSubtaskCount}/{totalSubtaskCount} podzadań</span>}
          {item.duration_minutes != null && item.duration_minutes > 0 && !isDone && <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" />{item.duration_minutes} min</span>}
          {item.recurrence && <span><Repeat2 size={13} aria-hidden="true" />{RECURRENCE_LABELS[item.recurrence]}</span>}
          {isLinkedToPlan && <span>Plan</span>}
          {item.deadline_date && !isDone && <span className={item.deadline_date <= today ? 'text-danger' : ''}>do {item.deadline_date}</span>}
        </div>
        <TodoRowQuickActions item={item} today={today} expanded={expanded} panelId={panelId} sections={sections}
          grip={swipe} onToggleExpand={onToggleExpand} onDelete={onDelete} onSetSchedule={onSetSchedule}
          onSetPriority={onSetPriority} onMoveSection={onMoveSection} onShowContextMenu={onShowContextMenu} />
      </div>
    </>
  );
}

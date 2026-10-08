import { CalendarDays, Check, Clock, GripVertical, MoreHorizontal, Pencil, Repeat2, Trash2 } from 'lucide-react';
import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { getPlainText } from '../../lib/noteText';
import { RECURRENCE_LABELS } from './todoUtils';
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
  expanded: boolean;
  onTitlePress: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  isEditing, editingTitle, onEditChange, onEditSave, expanded, onTitlePress, onEdit, onDelete, panelId,
  totalSubtaskCount, doneSubtaskCount, isLinkedToPlan, sectionName, dreamTitle, swipe, onShowContextMenu,
}: TodoCardCollapsedRowProps) {
  const notes = getPlainText(item.notes || '').replace(/\bsource:(?:note|link):[0-9a-f-]+/gi, '').trim();
  const priority = item.priority || 'normal';
  return (
    <>
      <div className="todo-focus-top">
        <span className={`todo-focus-date ${dateInfo?.color || 'text-text-secondary'}`}>
          <CalendarDays size={15} aria-hidden="true" />{dateInfo?.text || (isDone && item.due_date ? item.due_date : 'Bez terminu')}
        </span>
        <span className={`todo-focus-priority ${priority === 'urgent' || priority === 'high' ? 'todo-focus-important' : ''}`}>
          {PRIORITY_LABEL[priority] || priority}
        </span>
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
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onEditSave(); }}
            onBlur={onEditSave} onClick={e => e.stopPropagation()}
            className="min-w-0 w-full rounded-lg border border-primary/40 bg-surface-solid px-2 py-2 text-base text-text-primary focus-visible:shadow-focus" />
        ) : (
          <Pressable onClick={e => { e.stopPropagation(); onTitlePress(); }}
            aria-expanded={expanded} aria-controls={panelId}
            className={`todo-instant min-h-11 min-w-0 flex-1 rounded-lg text-left text-base font-semibold leading-snug tracking-tight focus-visible:shadow-focus ${isDone ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
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
        <div className="todo-focus-actions">
          <div data-no-view-swipe onTouchStart={swipe.onGripTouchStart} onTouchEnd={swipe.onGripTouchEnd}
            onTouchMove={swipe.onGripTouchMove} onMouseDown={swipe.onGripMouseDown}
            className="todo-focus-grip flex h-11 w-11 touch-none items-center justify-center rounded-lg text-text-secondary" title="Przeciągnij zadanie" aria-hidden="true">
            <GripVertical size={16} aria-hidden="true" />
          </div>
          <Pressable haptic="none" onClick={e => { e.stopPropagation(); onEdit(); }}
            className="todo-instant flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 focus-visible:shadow-focus"
            aria-label={`Edytuj: ${item.title}`} title="Edytuj zadanie"><Pencil size={17} aria-hidden="true" /></Pressable>
          <Pressable haptic="none" onClick={e => { e.stopPropagation(); onDelete(); }}
            className="todo-instant flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-danger/10 hover:text-danger focus-visible:shadow-focus"
            aria-label={`Usuń: ${item.title}`} title="Usuń zadanie"><Trash2 size={17} aria-hidden="true" /></Pressable>
          <Pressable haptic="none" onClick={e => {
            e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect();
            onShowContextMenu(item, rect.left, rect.bottom + 4);
          }} className="todo-instant flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 focus-visible:shadow-focus"
            aria-label="Więcej opcji" title="Więcej opcji"><MoreHorizontal size={19} /></Pressable>
        </div>
      </div>
    </>
  );
}

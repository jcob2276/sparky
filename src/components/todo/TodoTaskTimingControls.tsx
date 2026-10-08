import { Bell, Calendar } from 'lucide-react';
import type { TodoItemRow } from '../../lib/todo/todo';
import { warsawTimeOfDay } from '../../lib/date';
import { ControlInput, ControlSelect, Pressable } from '../ui/ControlPrimitives';
import TodoDatePickerPopover from './TodoDatePickerPopover';
import TodoReminderPopover from './TodoReminderPopover';

type OpenPopover = 'date' | 'reminder' | null;

interface Props {
  item: TodoItemRow;
  today: string;
  openPopover: OpenPopover;
  setOpenPopover: (value: OpenPopover) => void;
  onSetSchedule: (patch: { due_date?: string | null; scheduled_time?: string | null }) => void;
  onSetDeadline: (date: string | null) => void;
  onSetRecurrence: (recurrence: string | null) => void;
  onSetReminder: (dateTime: string) => void;
}

export default function TodoTaskTimingControls({
  item, today, openPopover, setOpenPopover,
  onSetSchedule, onSetDeadline, onSetRecurrence, onSetReminder,
}: Props) {
  return (
    <>
      <div className="relative">
        <Pressable type="button" onClick={() => setOpenPopover(openPopover === 'date' ? null : 'date')} className={`todo-instant flex min-h-11 items-center gap-1.5 rounded-lg border border-border-custom/80 px-2.5 py-2 text-xs font-semibold ${item.due_date ? 'border-primary/30 bg-primary/5 text-primary' : 'text-text-secondary'}`}>
          <Calendar size={12} />
          {item.due_date ? `${item.due_date}${item.scheduled_time ? ` ${warsawTimeOfDay(item.scheduled_time)}` : ''}` : 'Zaplanuj'}
        </Pressable>
        {openPopover === 'date' && <TodoDatePickerPopover dueDate={item.due_date} scheduledTime={item.scheduled_time ? warsawTimeOfDay(item.scheduled_time) : null} recurrence={item.recurrence} today={today} onChange={onSetSchedule} onClose={() => setOpenPopover(null)} />}
      </div>
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">Termin końcowy
        <ControlInput type="date" min={item.due_date || undefined} value={item.deadline_date || ''}
          onChange={event => onSetDeadline(event.target.value || null)}
          className="todo-instant min-h-11 w-full rounded-lg border border-border-custom bg-surface-solid px-2 text-sm text-text-primary focus-visible:shadow-focus" />
      </label>
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">Powtarzanie
        <ControlSelect value={item.recurrence || ''} onChange={event => onSetRecurrence(event.target.value || null)}
          className="todo-instant min-h-11 w-full rounded-lg border border-border-custom bg-surface-solid px-2 text-sm text-text-primary focus-visible:shadow-focus">
          <option value="">Nie powtarzaj</option><option value="daily">Codziennie</option><option value="weekdays">W dni robocze</option><option value="weekly">Co tydzień</option><option value="biweekly">Co 2 tygodnie</option><option value="monthly">Co miesiąc</option>
        </ControlSelect>
      </label>
      <div className="relative">
        <Pressable type="button" onClick={() => setOpenPopover(openPopover === 'reminder' ? null : 'reminder')} className={`todo-instant flex min-h-11 items-center gap-1.5 rounded-lg border border-border-custom/80 px-2.5 py-2 text-xs font-semibold ${item.reminder_at ? 'border-primary/30 bg-primary/5 text-primary' : 'text-text-secondary'}`}>
          <Bell size={12} /> {item.reminder_at ? new Date(item.reminder_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Przypomnienie'}
        </Pressable>
        {openPopover === 'reminder' && <TodoReminderPopover dueDate={item.due_date} scheduledTime={item.scheduled_time ? warsawTimeOfDay(item.scheduled_time) : null} onSetReminder={onSetReminder} onClose={() => setOpenPopover(null)} />}
      </div>
    </>
  );
}

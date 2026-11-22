import { useRef } from 'react';
import { Bell, Calendar, Clock, Flag, Repeat2 } from 'lucide-react';
import type { TodoItemRow } from '../../lib/todo/todo';
import { warsawTimeOfDay } from '../../lib/date';
import { ControlInput, ControlSelect, Pressable } from '../ui/ControlPrimitives';
import TodoReminderPopover from './TodoReminderPopover';
import TodoSwitchRow from './TodoSwitchRow';

export type TimingPopover = 'reminder' | null;

/** iOS-style settings rows: label left, value right. */
export const ROW = 'flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm text-text-primary';
export const DIVIDER = 'ios-glass-divider';
const VALUE_INPUT = 'min-h-11 w-auto min-w-0 rounded-none border-0 bg-transparent px-0 text-right text-sm text-text-secondary';

interface DateTimeProps {
  item: TodoItemRow;
  today: string;
  onSetSchedule: (patch: { due_date?: string | null; scheduled_time?: string | null }) => void;
}

/** "Data i czas": a switch each for the day and the hour, the native pickers appear while a switch is on. */
export function TodoDateTimeGroup({ item, today, onSetSchedule }: DateTimeProps) {
  const time = item.scheduled_time ? warsawTimeOfDay(item.scheduled_time) : '';
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker?.();
    } catch {
      dateInputRef.current?.focus();
    }
  };

  const openTimePicker = () => {
    try {
      timeInputRef.current?.showPicker?.();
    } catch {
      timeInputRef.current?.focus();
    }
  };

  return (
    <div className="ios-glass-group">
      <TodoSwitchRow
        icon={Calendar}
        label="Data"
        checked={Boolean(item.due_date)}
        onChange={(on) => {
          onSetSchedule(on ? { due_date: today } : { due_date: null, scheduled_time: null });
          if (on) setTimeout(openDatePicker, 60);
        }}
      >
        <div
          onClick={(e) => { e.stopPropagation(); openDatePicker(); }}
          className="flex items-center gap-1.5 cursor-pointer rounded-lg bg-surface-2/60 px-2 py-1 text-xs font-semibold text-text-primary hover:bg-surface-2 active:scale-95 transition-all"
        >
          <ControlInput
            ref={dateInputRef}
            type="date"
            aria-label="Data"
            value={item.due_date || ''}
            onChange={(event) => onSetSchedule({ due_date: event.target.value || null })}
            onClick={(e) => { e.stopPropagation(); openDatePicker(); }}
            className="cursor-pointer bg-transparent border-0 p-0 text-xs font-semibold text-text-primary outline-none"
          />
        </div>
      </TodoSwitchRow>
      <div className={DIVIDER} />
      <TodoSwitchRow
        icon={Clock}
        label="Godzina"
        checked={Boolean(item.scheduled_time)}
        onChange={(on) => {
          onSetSchedule(on ? { due_date: item.due_date ?? today, scheduled_time: '09:00' } : { scheduled_time: null });
          if (on) setTimeout(openTimePicker, 60);
        }}
      >
        <div
          onClick={(e) => { e.stopPropagation(); openTimePicker(); }}
          className="flex items-center gap-1.5 cursor-pointer rounded-lg bg-surface-2/60 px-2 py-1 text-xs font-semibold text-text-primary hover:bg-surface-2 active:scale-95 transition-all"
        >
          <ControlInput
            ref={timeInputRef}
            type="time"
            aria-label="Godzina"
            value={time}
            onChange={(event) => onSetSchedule({ due_date: item.due_date ?? today, scheduled_time: event.target.value || null })}
            onClick={(e) => { e.stopPropagation(); openTimePicker(); }}
            className="cursor-pointer bg-transparent border-0 p-0 text-xs font-semibold text-text-primary outline-none"
          />
        </div>
      </TodoSwitchRow>
    </div>
  );
}

interface ExtrasProps {
  item: TodoItemRow;
  openPopover: TimingPopover;
  setOpenPopover: (value: TimingPopover) => void;
  onSetDeadline: (date: string | null) => void;
  onSetRecurrence: (recurrence: string | null) => void;
  onSetReminder: (dateTime: string) => void;
}

/** Deadline, repeat and reminder rows (they sit under the place row in the same group). */
export function TodoScheduleExtras({ item, openPopover, setOpenPopover, onSetDeadline, onSetRecurrence, onSetReminder }: ExtrasProps) {
  const deadlineRef = useRef<HTMLInputElement>(null);
  const reminderValue = item.reminder_at
    ? new Date(item.reminder_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Brak';

  const openDeadlinePicker = () => {
    try {
      deadlineRef.current?.showPicker?.();
    } catch {
      deadlineRef.current?.focus();
    }
  };

  return (
    <>
      <div className={DIVIDER} />
      <div
        onClick={openDeadlinePicker}
        className={`${ROW} cursor-pointer hover:bg-surface-2/40 active:bg-surface-2/70 transition-colors select-none`}
      >
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Flag size={16} className={item.deadline_date ? 'text-primary' : 'text-text-secondary'} aria-hidden="true" />
          <span className="font-medium">Termin końcowy</span>
        </span>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <ControlInput
            ref={deadlineRef}
            type="date"
            min={item.due_date || undefined}
            value={item.deadline_date || ''}
            onChange={(event) => onSetDeadline(event.target.value || null)}
            onClick={(e) => { e.stopPropagation(); openDeadlinePicker(); }}
            className={`todo-instant ${VALUE_INPUT} w-32 cursor-pointer font-medium text-text-primary hover:text-primary transition-colors`}
          />
        </div>
      </div>
      <div className={DIVIDER} />
      <div className={`${ROW} cursor-pointer hover:bg-surface-2/40 transition-colors`}>
        <span className="flex items-center gap-2">
          <Repeat2 size={16} className={item.recurrence ? 'text-primary' : 'text-text-secondary'} aria-hidden="true" />
          <span className="font-medium">Powtarzanie</span>
        </span>
        <ControlSelect
          value={item.recurrence || ''}
          onChange={(event) => onSetRecurrence(event.target.value || null)}
          className={`todo-instant ${VALUE_INPUT} w-44 justify-end gap-1 [&>span]:text-right`}
        >
          <option value="">Nie powtarzaj</option>
          <option value="daily">Codziennie</option>
          <option value="weekdays">W dni robocze</option>
          <option value="weekly">Co tydzień</option>
          <option value="biweekly">Co 2 tygodnie</option>
          <option value="monthly">Co miesiąc</option>
        </ControlSelect>
      </div>
      <div className={DIVIDER} />
      <div className="relative">
        <Pressable
          type="button"
          data-todo-popover-trigger=""
          aria-expanded={openPopover === 'reminder'}
          onClick={() => setOpenPopover(openPopover === 'reminder' ? null : 'reminder')}
          className={`todo-instant ${ROW} hover:bg-surface-2/40 active:bg-surface-2/70 transition-colors`}
        >
          <span className="flex items-center gap-2">
            <Bell size={16} className={item.reminder_at ? 'text-primary' : 'text-text-secondary'} aria-hidden="true" />
            <span className="font-medium">Przypomnienie</span>
          </span>
          <span className={`text-xs font-semibold ${item.reminder_at ? 'text-primary' : 'text-text-secondary'}`}>
            {reminderValue}
          </span>
        </Pressable>
        {openPopover === 'reminder' && (
          <TodoReminderPopover
            inline
            dueDate={item.due_date}
            scheduledTime={item.scheduled_time ? warsawTimeOfDay(item.scheduled_time) : null}
            onSetReminder={onSetReminder}
            onClose={() => setOpenPopover(null)}
          />
        )}
      </div>
    </>
  );
}

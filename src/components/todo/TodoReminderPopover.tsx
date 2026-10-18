import { Pressable, ControlInput, ControlSelect } from '../ui/ControlPrimitives';
import { useEffect, useRef, useState } from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import { combineDateTimeWarsawISO } from '../../lib/date';

interface TodoReminderPopoverProps {
  inline?: boolean;
  dueDate: string | null;
  scheduledTime: string | null;
  onSetReminder: (isoDatetime: string) => void;
  onClose: () => void;
}

const OFFSET_OPTIONS = [
  { value: 0, label: 'O wskazanej godzinie' },
  { value: 15, label: '15 minut przed' },
  { value: 30, label: '30 minut przed' },
  { value: 60, label: '1 godzinę przed' },
  { value: 60 * 24, label: '1 dzień przed' },
];

export default function TodoReminderPopover({
  inline = false,
  dueDate,
  scheduledTime,
  onSetReminder,
  onClose,
}: TodoReminderPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'datetime' | 'before'>(dueDate ? 'before' : 'datetime');
  const [datetimeVal, setDatetimeVal] = useState('');
  const [offsetMinutes, setOffsetMinutes] = useState(0);

  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      // The trigger toggles the popover itself; closing here would make its click reopen it.
      if (target?.closest?.('[data-todo-popover-trigger]')) return;
      if (ref.current && !ref.current.contains(target as Node)) onClose();
    };
    // Capture + stopPropagation: Esc closes only the popover, not the modal/card behind it.
    const closeKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', close);
      document.addEventListener('touchstart', close);
      document.addEventListener('keydown', closeKey, true);
    }, 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', closeKey, true);
    };
  }, [onClose]);

  // Wall-clock times are Europe/Warsaw, never the browser zone.
  const dueTimestamp = dueDate ? new Date(combineDateTimeWarsawISO(dueDate, scheduledTime || '09:00')) : null;

  const commitDatetime = () => {
    if (!datetimeVal) return;
    onSetReminder(new Date(combineDateTimeWarsawISO(datetimeVal.slice(0, 10), datetimeVal.slice(11, 16))).toISOString());
    onClose();
  };

  const commitBefore = () => {
    if (!dueTimestamp) return;
    const at = new Date(dueTimestamp.getTime() - offsetMinutes * 60000);
    onSetReminder(at.toISOString());
    onClose();
  };

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={`${inline ? 'relative w-full' : 'absolute z-[var(--z-overlay)] top-full left-0 mt-2 w-[var(--ds-w-290px)] todo-popover-fit shadow-2xl'} rounded-2xl border border-border-custom bg-surface-solid flex flex-col gap-3 p-4 animate-in fade-in zoom-in-95 duration-[var(--motion-medium)] origin-top-left`}
    >
      <p className="text-sm font-black text-text-primary">Przypomnienia</p>

      <div className="flex items-center gap-4 border-b border-border-custom/40">
        <Pressable
          type="button"
          onClick={() => setTab('datetime')}
          className={`pb-2 text-sm font-bold transition-colors border-b-2 -mb-px ${
            tab === 'datetime' ? 'text-text-primary border-primary' : 'text-text-muted/50 border-transparent hover:text-text-primary'
          }`}
        >
          Data i godzina
        </Pressable>
        <Pressable
          type="button"
          onClick={() => setTab('before')}
          className={`pb-2 text-sm font-bold transition-colors border-b-2 -mb-px ${
            tab === 'before' ? 'text-text-primary border-primary' : 'text-text-muted/50 border-transparent hover:text-text-primary'
          }`}
        >
          Przed zadaniem
        </Pressable>
      </div>

      {tab === 'datetime' ? (
        <ControlInput
          type="datetime-local"
          value={datetimeVal}
          onChange={(e) => setDatetimeVal(e.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); commitDatetime(); } }}
          aria-label="Data i godzina przypomnienia"
          autoFocus
          className="w-full rounded-xl border border-border-custom/60 bg-surface/60 px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary/40 [color-scheme:light] dark:[color-scheme:dark]"
        />
      ) : dueTimestamp ? (
        <ControlSelect
          value={offsetMinutes}
          onChange={(e) => setOffsetMinutes(Number(e.target.value))}
          className="w-full rounded-xl border border-border-custom/60 bg-surface/60 px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary/40 cursor-pointer"
        >
          {OFFSET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </ControlSelect>
      ) : (
        <p className="text-xs text-text-muted/60 leading-relaxed">
          Ustaw najpierw termin zadania, aby dodać przypomnienie względem niego.
        </p>
      )}

      <p className="text-xs text-text-muted/60 leading-relaxed">
        Otrzymaj powiadomienie, kiedy nadejdzie czas wykonania zadania.
      </p>

      <div className="flex items-center justify-between">
        <HelpCircle size={16} className="text-text-muted/40" />
        <Pressable
          type="button"
          onClick={tab === 'datetime' ? commitDatetime : commitBefore}
          disabled={tab === 'datetime' ? !datetimeVal : !dueTimestamp}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-black text-on-accent disabled:opacity-[var(--opacity-30)] hover:bg-primary/90 transition-colors"
        >
          <Bell size={12} /> Dodaj przypomnienie
        </Pressable>
      </div>
    </div>
  );
}

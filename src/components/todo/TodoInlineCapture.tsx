import { useRef, useState } from 'react';
import { Calendar, Camera, Flag, Hash, MapPin, MoreHorizontal } from 'lucide-react';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import { formatShortMonthLabel, shiftDateStr } from '../../lib/date';
import TodoDatePickerPopover from './TodoDatePickerPopover';
import type { AddTodoOptions } from './hooks/useTodoQuickCapture';

interface InlineForm { title: string; notes: string; tagsText: string; priority: string; due_date: string; scheduled_time: string; recurrence: string }

interface Props<F extends InlineForm> {
  captureRef: React.RefObject<HTMLDivElement | null>;
  form: F;
  setForm: React.Dispatch<React.SetStateAction<F>>;
  parsedInput: {
    priority: string | null; due_date: string | null; scheduled_time: string | null; recurrence?: string | null;
    tokens: Array<{ type: string; value: string; label: string }>;
  };
  today: string;
  busy: boolean;
  addItem: (options?: AddTodoOptions) => void;
  onCancel: () => void;
  /** Opens the full form (notes, tags, reminder, dictation) with the draft carried over. */
  onMore: () => void;
}

const CHIP = 'todo-instant inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium focus-visible:shadow-focus';

/** Reminders-style add row: a new line at the end of the list, options as chips underneath, no modal. */
export default function TodoInlineCapture<F extends InlineForm>({
  captureRef, form, setForm, parsedInput, today, busy, addItem, onCancel, onMore,
}: Props<F>) {
  const [dateOpen, setDateOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(Boolean(form.tagsText));
  const [location, setLocation] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const dueDate = parsedInput.due_date || form.due_date || '';
  const scheduledTime = parsedInput.scheduled_time || form.scheduled_time || '';
  const recurrence = parsedInput.recurrence || form.recurrence || '';
  const priority = parsedInput.priority || form.priority;
  const isImportant = priority === 'urgent' || priority === 'high';
  const dateLabel = dueDate === today ? 'Dziś' : dueDate === shiftDateStr(today, 1) ? 'Jutro'
    : dueDate ? formatShortMonthLabel(`${dueDate}T12:00:00Z`).toLowerCase() : 'Dodaj datę';

  const submit = (keepOpen: boolean) => {
    if (busy || !form.title.trim()) return;
    addItem({ keepOpen, location: location.trim() || undefined, photo: photo ?? undefined });
    setLocation('');
    setLocationOpen(false);
    setPhoto(null);
    if (keepOpen) document.getElementById('todo-title-input')?.focus();
  };

  return (
    <div
      ref={captureRef}
      onBlur={(event) => {
        // Leaving the row with nothing typed closes it, like tapping away in Reminders; clicks on its own chips do not.
        if (!event.currentTarget.contains(event.relatedTarget) && !form.title.trim()) onCancel();
      }}
      className="todo-focus-grid"
    >
      <div>
      <div className="flex items-center gap-1 pl-1">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="todo-focus-check" />
        </span>
        <label htmlFor="todo-title-input" className="sr-only">Co chcesz zrobić?</label>
        <ControlInput
          id="todo-title-input"
          autoFocus
          autoComplete="off"
          aria-describedby="todo-title-hint"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              // Enter adds and stays for the next task; Ctrl/Cmd+Enter adds and closes.
              submit(!(event.ctrlKey || event.metaKey));
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder="Nowe zadanie"
          className="todo-inline-input min-h-11 min-w-0 flex-1 rounded-none bg-transparent px-0 text-[length:var(--todo-row-title-size)] font-[number:var(--todo-row-title-weight)] text-text-primary placeholder:text-text-muted"
        />
      </div>
      <p id="todo-title-hint" className="sr-only">Enter dodaje zadanie i zostawia pole dla kolejnego, Ctrl+Enter dodaje i zamyka, Esc anuluje. Można użyć !p1, #lista, @tag.</p>

      <div className="ml-12 pr-2">
        <ControlInput aria-label="Notatki" autoComplete="off" value={form.notes} placeholder="Notatki"
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onCancel(); } }}
          className="todo-inline-input min-h-8 w-full rounded-none bg-transparent px-0 text-[length:var(--todo-row-note-size)] text-text-secondary placeholder:text-text-muted" />
        {tagsOpen || form.tagsText ? (
          <ControlInput aria-label="Tagi" autoComplete="off" autoFocus={tagsOpen && !form.tagsText} value={form.tagsText} placeholder="Dodaj tagi"
            onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
            onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onCancel(); } }}
            className="todo-inline-input min-h-8 w-full rounded-none bg-transparent px-0 text-[length:var(--todo-row-note-size)] text-text-secondary placeholder:text-text-muted" />
        ) : null}
        {locationOpen || location ? (
          <ControlInput aria-label="Miejsce" autoComplete="off" maxLength={200} autoFocus={locationOpen && !location} value={location} placeholder="Dodaj miejsce"
            onChange={(event) => setLocation(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onCancel(); } }}
            className="todo-inline-input min-h-8 w-full rounded-none bg-transparent px-0 text-[length:var(--todo-row-note-size)] text-text-secondary placeholder:text-text-muted" />
        ) : null}
      </div>

      <div className="ml-12 flex flex-wrap items-center gap-1.5 pb-2 pr-2">
        <Pressable haptic="none" aria-expanded={dateOpen} aria-controls="todo-inline-date" data-todo-popover-trigger=""
          onClick={() => setDateOpen((value) => !value)}
          className={`${CHIP} ${dueDate ? 'bg-primary/10 font-semibold text-primary' : 'bg-surface-2 font-semibold text-text-secondary'}`}>
          <Calendar size={14} aria-hidden="true" />{dateLabel}{scheduledTime ? ` · ${scheduledTime}` : ''}
        </Pressable>
        <Pressable haptic="none" aria-label="Tagi" aria-pressed={tagsOpen || Boolean(form.tagsText)} onClick={() => setTagsOpen((value) => !value)}
          className={`${CHIP} ${form.tagsText ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-text-secondary'}`}>
          <Hash size={14} aria-hidden="true" />
        </Pressable>
        <Pressable haptic="none" aria-label="Miejsce" aria-pressed={locationOpen || Boolean(location)} onClick={() => setLocationOpen((value) => !value)}
          className={`${CHIP} ${location ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-text-secondary'}`}>
          <MapPin size={14} aria-hidden="true" />
        </Pressable>
        <ControlInput ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Zrób zdjęcie"
          onChange={(event) => { setPhoto(event.target.files?.[0] ?? null); event.target.value = ''; }} />
        <Pressable haptic="none" aria-label={photo ? 'Usuń zdjęcie' : 'Zrób zdjęcie'} aria-pressed={Boolean(photo)}
          onClick={() => (photo ? setPhoto(null) : photoInput.current?.click())}
          className={`${CHIP} ${photo ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-text-secondary'}`}>
          <Camera size={14} aria-hidden="true" />{photo ? '1' : null}
        </Pressable>
        <Pressable haptic="none" aria-pressed={isImportant} aria-label="Ważne"
          onClick={() => setForm({ ...form, priority: isImportant ? 'normal' : 'high' })}
          className={`${CHIP} ${isImportant ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-secondary'}`}>
          <Flag size={14} aria-hidden="true" />
        </Pressable>
        <Pressable haptic="none" aria-label="Więcej opcji" onClick={onMore} className={`${CHIP} bg-surface-2 text-text-secondary`}>
          <MoreHorizontal size={14} aria-hidden="true" />
        </Pressable>
        {parsedInput.tokens.filter((token) => token.type === 'tag').map((token, index) => (
          <span key={`${token.type}-${index}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{token.label}</span>
        ))}
      </div>

      {dateOpen ? (
        <div id="todo-inline-date" className="ml-12 mr-2 pb-2">
          <TodoDatePickerPopover inline dueDate={dueDate || null} scheduledTime={scheduledTime || null} recurrence={recurrence || null} today={today}
            onChange={(patch) => setForm((current) => ({
              ...current,
              ...(patch.due_date !== undefined ? { due_date: patch.due_date || '' } : {}),
              ...(patch.scheduled_time !== undefined ? { scheduled_time: patch.scheduled_time || '' } : {}),
              ...(patch.recurrence !== undefined ? { recurrence: patch.recurrence || '' } : {}),
            }))}
            onClose={() => setDateOpen(false)} />
        </div>
      ) : null}
      </div>
    </div>
  );
}

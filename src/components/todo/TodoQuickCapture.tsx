import { useState } from 'react';
import { Bell, Calendar, ChevronDown, Folder, ScanText, Sparkles, SlidersHorizontal, Tag } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { ControlInput, ControlSelect, ControlTextarea, Pressable } from '../ui/ControlPrimitives';
import { formatShortMonthLabel, shiftDateStr } from '../../lib/date';
import { matchSectionByTag } from '../../lib/todo/todoParser';
import TodoDatePickerPopover from './TodoDatePickerPopover';
import TodoReminderPopover from './TodoReminderPopover';
import TodoDictationBar from './TodoDictationBar';
import TodoPriorityChips from './TodoPriorityChips';
import { useDictationCapture } from './hooks/useDictationCapture';
import { notify } from '../../lib/notify';

interface TodoFormState {
  title: string; notes: string; priority: string; tagsText: string; due_date: string; deadline_date: string;
  recurrence: string; section_id: string; scheduled_time: string; reminder_at: string;
}

interface Props {
  quickCaptureRef: React.RefObject<HTMLDivElement | null>;
  form: TodoFormState;
  setForm: React.Dispatch<React.SetStateAction<TodoFormState>>;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  busy: boolean;
  addItem: (options?: { keepOpen?: boolean }) => void;
  sections: { id: string; name: string }[];
  parsedInput: {
    title: string; priority: string | null; due_date: string | null; deadline_date?: string | null; scheduled_time: string | null;
    recurrence?: string | null; tags?: string[]; tokens: Array<{ type: string; value: string; label: string }>;
  };
  today: string;
  onOpenScanText?: () => void;
  /** Rozpisuje tekst/dyktando przez AI na wiele zadań; zwraca liczbę dodanych. */
  onBrainDump?: (text: string) => Promise<number>;
}

const EMPTY_FORM: TodoFormState = {
  title: '', notes: '', priority: 'normal', tagsText: '', due_date: '', deadline_date: '', recurrence: '',
  section_id: '', scheduled_time: '', reminder_at: '',
};

export default function TodoQuickCapture({
  quickCaptureRef, form, setForm, isExpanded, setIsExpanded, busy, addItem,
  sections, parsedInput, today, onOpenScanText, onBrainDump,
}: Props) {
  const [openPopover, setOpenPopover] = useState<'date' | 'reminder' | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const runBrainDump = async (text: string) => {
    if (!onBrainDump || !text.trim()) return;
    setAiBusy(true);
    try {
      const count = await onBrainDump(text);
      if (count === 0) { notify('Nie znalazłem w tym żadnych zadań', 'error'); return; }
      notify(`Dodano ${count} ${count === 1 ? 'zadanie' : 'zadań'}`, 'success');
      setForm(EMPTY_FORM);
      setIsExpanded(false);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'AI nie rozpisało zadań', 'error');
    } finally {
      setAiBusy(false);
    }
  };
  const dictation = useDictationCapture(runBrainDump);
  const [showDetails, setShowDetails] = useState(Boolean(form.notes || form.tagsText || form.reminder_at));
  const dueDate = parsedInput.due_date || form.due_date || '';
  const priority = parsedInput.priority || form.priority;
  const scheduledTime = parsedInput.scheduled_time || form.scheduled_time || '';
  const recurrence = parsedInput.recurrence || form.recurrence || '';
  const sectionMatch = matchSectionByTag(parsedInput.tags ?? [], sections);
  const matchedTag = sectionMatch.sectionId ? (parsedInput.tags ?? []).find((tag) => !sectionMatch.tags.includes(tag)) : undefined;
  const sectionValue = sectionMatch.sectionId ?? form.section_id ?? '';
  const dateLabel = dueDate === today ? 'Dziś' : dueDate === shiftDateStr(today, 1) ? 'Jutro' : dueDate ? formatShortMonthLabel(`${dueDate}T12:00:00Z`).toLowerCase() : 'Bez terminu';

  if (!isExpanded || typeof document === 'undefined') return null;

  const submit = (keepOpen: boolean) => {
    if (busy || !form.title.trim()) return;
    addItem({ keepOpen });
    if (keepOpen) document.getElementById('todo-title-input')?.focus();
  };

  const cancel = () => {
    setForm(EMPTY_FORM);
    setIsExpanded(false);
  };

  return (
    <Modal isOpen={isExpanded} onClose={() => setIsExpanded(false)} title="Nowe zadanie" size="xl" containerRef={quickCaptureRef} className="bg-surface-1">
        <div>
          {onBrainDump ? <div className="mb-4"><TodoDictationBar state={aiBusy ? 'processing' : dictation.state} seconds={dictation.seconds} onStart={() => void dictation.start()} onStop={dictation.stop} /></div> : null}
          <div>
            <label htmlFor="todo-title-input" className="sr-only">Co chcesz zrobić?</label>
            <ControlInput
              id="todo-title-input"
              autoFocus
              autoComplete="off"
              aria-describedby="todo-title-hint"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  // Enter adds and stays for the next task; Ctrl/Cmd+Enter adds and closes.
                  submit(!(event.ctrlKey || event.metaKey));
                }
              }}
              placeholder="Albo wpisz: Zadzwonić do Marka jutro 15:00"
              className="min-h-14 w-full rounded-md border border-border-custom bg-surface-1 px-3 text-base font-medium text-text-primary placeholder:font-normal placeholder:text-text-muted focus:border-primary"
            />
            {parsedInput.tokens.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-live="polite">
                {parsedInput.tokens.map((token, index) => (
                  <span key={`${token.type}-${index}`} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {token.type === 'tag' && token.value === matchedTag ? `Lista: ${sectionMatch.sectionName}` : token.label}
                  </span>
                ))}
              </div>
            ) : null}
            <p id="todo-title-hint" className="sr-only">Enter dodaje zadanie i zostawia pole dla kolejnego, Ctrl+Enter dodaje i zamyka. Można użyć !p1, #lista, @tag.</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div>
              <Pressable data-todo-popover-trigger="" aria-expanded={openPopover === 'date'} aria-controls="todo-capture-date" onClick={() => setOpenPopover((value) => value === 'date' ? null : 'date')} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-xs font-medium ${dueDate ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'}`}>
                <Calendar size={16} /><span>{dateLabel}{scheduledTime ? ` · ${scheduledTime}` : ''}</span><ChevronDown size={12} />
              </Pressable>
            </div>

            <TodoPriorityChips value={priority} onChange={(value) => setForm({ ...form, priority: value })} />

            <div className="relative min-w-0 max-w-full">
              <Folder size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <ControlSelect value={sectionValue} onChange={(event) => setForm({ ...form, section_id: event.target.value })} className="min-h-11 max-w-full cursor-pointer rounded-md border border-border-custom bg-surface-1 pl-9 pr-3 text-xs font-medium text-text-secondary" aria-label="Lista zadań">
                <option value="">Skrzynka</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </ControlSelect>
            </div>
          </div>

          {openPopover === 'date' ? <div id="todo-capture-date" className="mt-3"><TodoDatePickerPopover inline dueDate={dueDate || null} scheduledTime={scheduledTime || null} recurrence={recurrence || null} today={today} onChange={(patch) => setForm((current) => ({ ...current, ...(patch.due_date !== undefined ? { due_date: patch.due_date || '' } : {}), ...(patch.scheduled_time !== undefined ? { scheduled_time: patch.scheduled_time || '' } : {}), ...(patch.recurrence !== undefined ? { recurrence: patch.recurrence || '' } : {}) }))} onClose={() => setOpenPopover(null)} /></div> : null}

          <Pressable aria-expanded={showDetails} aria-controls="todo-capture-details" onClick={() => { setShowDetails((value) => !value); setOpenPopover(null); }} className="mt-3 flex min-h-11 items-center gap-2 rounded-md px-1 text-xs font-medium text-text-secondary hover:text-text-primary">
            <SlidersHorizontal size={16} />{showDetails ? 'Mniej opcji' : 'Więcej opcji'}<ChevronDown size={14} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </Pressable>

          {showDetails ? (
            <div id="todo-capture-details" className="space-y-3 border-t border-border-custom/50 pt-3">
              <ControlTextarea aria-label="Notatka" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="Notatka lub kontekst…" className="w-full resize-y rounded-md border border-border-custom bg-surface-solid px-3 py-3 text-sm text-text-primary placeholder:text-text-muted" />
              <div className="flex items-center gap-2 rounded-md border border-border-custom bg-surface-solid px-3">
                <Tag size={15} className="text-text-muted" /><ControlInput aria-label="Tagi" value={form.tagsText} onChange={(event) => setForm({ ...form, tagsText: event.target.value })} placeholder="Tagi, oddzielone przecinkami" className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-text-primary" />
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex min-h-11 items-center gap-2 rounded-md border border-border-custom bg-surface-solid px-3 text-xs font-bold text-text-secondary">
                  <Calendar size={15} /> Termin końcowy
                  <ControlInput type="date" min={dueDate || undefined} value={parsedInput.deadline_date || form.deadline_date} onChange={(event) => setForm((current) => ({ ...current, deadline_date: event.target.value }))} className="bg-transparent text-xs text-text-primary" />
                </label>
                <div className="relative">
                  <Pressable data-todo-popover-trigger="" aria-expanded={openPopover === 'reminder'} onClick={() => setOpenPopover((value) => value === 'reminder' ? null : 'reminder')} className="flex min-h-11 items-center gap-2 rounded-md border border-border-custom bg-surface-solid px-3 text-xs font-bold text-text-secondary"><Bell size={15} /> {form.reminder_at ? 'Przypomnienie ustawione' : 'Przypomnienie'}</Pressable>
                </div>
                {onOpenScanText ? <Pressable onClick={onOpenScanText} className="flex min-h-11 items-center gap-2 rounded-md border border-border-custom bg-surface-solid px-3 text-xs font-bold text-primary"><ScanText size={15} /> Skanuj tekst</Pressable> : null}
                {recurrence ? <span className="flex min-h-11 items-center rounded-md bg-primary/10 px-3 text-xs font-bold text-primary">Powtarzanie: {recurrence}</span> : null}
              </div>
              {openPopover === 'reminder' ? <TodoReminderPopover inline dueDate={dueDate || null} scheduledTime={scheduledTime || null} onSetReminder={(iso) => setForm((current) => ({ ...current, reminder_at: iso }))} onClose={() => setOpenPopover(null)} /> : null}
            </div>
          ) : null}

        <footer className="mt-4 flex items-center justify-end gap-2 border-t border-border-custom/50 pt-4">
          <Button variant="ghost" onClick={cancel} className="text-text-secondary">Anuluj</Button>
          {onBrainDump ? <Button variant="outline" onClick={() => void runBrainDump(form.title)} disabled={aiBusy || !form.title.trim()} loading={aiBusy} icon={<Sparkles size={16} />}>Rozpisz AI</Button> : null}
          <Button onClick={() => submit(false)} disabled={busy || !form.title.trim()} loading={busy}>Dodaj</Button>
        </footer>
        </div>
    </Modal>
  );
}

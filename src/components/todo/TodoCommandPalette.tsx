import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Search } from 'lucide-react';
import { useTodoContext } from './context/TodoContext';
import { isStudySubject } from '../../lib/todo/studySubjects';
import { TODO_PALETTE_EVENT } from './todoPaletteNav';
import { useTodoPaletteHandlers } from './hooks/useTodoPaletteHandlers';
import {
  PALETTE_LISTBOX_ID, buildPaletteGroups, paletteOptionId, type PaletteEntry, type PaletteMode, type PaletteTask,
} from './todoPaletteEntries';
import { ControlInput } from '../ui/ControlPrimitives';
import TodoPaletteList from './TodoPaletteList';

const ROOT: PaletteMode = { kind: 'root' };

const PLACEHOLDERS: Record<PaletteMode['kind'], string> = {
  root: 'Szukaj zadań lub wpisz polecenie…',
  'pick-task': 'Które zadanie przenieść?',
  'pick-section': 'Dokąd przenieść?',
};

export default function TodoCommandPalette() {
  const { items, sections, today } = useTodoContext();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>(ROOT);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const tasks = useMemo<PaletteTask[]>(() => {
    const sectionName = new Map(sections.map((s) => [s.id, s.name]));
    return items
      .filter((item) => !isStudySubject(item))
      .map((item) => ({
        id: item.id, title: item.title, tags: item.tags, status: item.status, due_date: item.due_date,
        section_id: item.section_id, sectionName: item.section_id ? sectionName.get(item.section_id) ?? null : null,
      }));
  }, [items, sections]);

  const close = useCallback(() => {
    setOpen(false);
    setMode(ROOT);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const show = useCallback((initial: string) => {
    if (document.activeElement instanceof HTMLElement) returnFocusRef.current = document.activeElement;
    setMode(initial.startsWith('>') ? { kind: 'pick-task' } : ROOT);
    setQuery(initial.replace(/^>\s*/, ''));
    setActiveIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => show((event as CustomEvent<{ query?: string }>).detail?.query ?? '');
    window.addEventListener(TODO_PALETTE_EVENT, onOpen);
    return () => window.removeEventListener(TODO_PALETTE_EVENT, onOpen);
  }, [show]);

  // Focus the input on open and restore the previous focus on close. No enter animation:
  // the palette is keyboard-initiated and used constantly, so it must feel instant.
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    return () => { returnFocusRef.current?.focus?.(); };
  }, [open]);

  const handlers = useTodoPaletteHandlers({ close, setMode, setQuery, setActiveIndex });

  const groups = useMemo(
    () => (open ? buildPaletteGroups({ mode, query, tasks, sections, today, handlers }) : []),
    [open, mode, query, tasks, sections, today, handlers],
  );
  const flat = useMemo<PaletteEntry[]>(() => groups.flatMap((g) => g.entries), [groups]);
  const clampedIndex = Math.min(activeIndex, Math.max(flat.length - 1, 0));

  if (!open) return null;

  const goBack = () => { setMode(ROOT); setQuery(''); setActiveIndex(0); };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const key = event.key;
    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'k') {
      event.preventDefault(); event.stopPropagation(); close(); return;
    }
    if (key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (mode.kind === 'root') close(); else goBack();
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (flat.length === 0) return;
      const delta = key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((clampedIndex + delta + flat.length) % flat.length);
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault();
      setActiveIndex(key === 'Home' ? 0 : Math.max(flat.length - 1, 0));
    } else if (key === 'Enter') {
      event.preventDefault();
      flat[clampedIndex]?.run();
    } else if (key === 'Tab') {
      event.preventDefault(); // focus trap: the input is the only tab stop
      const taskId = mode.kind === 'root' ? flat[clampedIndex]?.taskId : undefined;
      const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
      if (task && !event.shiftKey) handlers.pickTaskToMove(task);
    } else if (key === 'Backspace' && query === '' && mode.kind !== 'root') {
      event.preventDefault(); goBack();
    }
  };

  const onChange = (value: string) => {
    if (mode.kind === 'root' && value.startsWith('>')) {
      setMode({ kind: 'pick-task' });
      setQuery(value.slice(1).trimStart());
    } else {
      setQuery(value);
    }
    setActiveIndex(0);
  };

  const breadcrumb = mode.kind === 'pick-task' ? 'Przenieś' : mode.kind === 'pick-section' ? 'Przenieś →' : null;

  return createPortal(
    <div
      ref={backdropRef}
      className="todo-palette-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta poleceń"
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border-custom bg-surface-solid shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border-custom/60 px-3.5">
          {breadcrumb
            ? <span className="flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 todo-text-micro font-black text-primary"><ChevronLeft size={11} aria-hidden="true" />{breadcrumb}</span>
            : <Search size={15} aria-hidden="true" className="shrink-0 text-text-muted" />}
          <ControlInput
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={PALETTE_LISTBOX_ID}
            aria-activedescendant={flat.length > 0 ? paletteOptionId(clampedIndex) : undefined}
            aria-autocomplete="list"
            aria-label="Paleta poleceń"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => window.setTimeout(() => { if (panelRef.current && !panelRef.current.contains(document.activeElement)) inputRef.current?.focus(); }, 0)}
            placeholder={PLACEHOLDERS[mode.kind]}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted/60 rounded-none focus-visible:shadow-none"
          />
          <kbd className="shrink-0 rounded border border-border-custom px-1.5 py-0.5 font-sans todo-text-micro font-bold text-text-muted">Esc</kbd>
        </div>
        <TodoPaletteList groups={groups} activeIndex={clampedIndex} query={query} onHover={setActiveIndex} onSelect={(entry) => entry.run()} />
        <div className="flex items-center gap-3 border-t border-border-custom/60 px-3.5 py-2 todo-text-micro text-text-muted">
          <span><kbd className="font-sans font-bold">↑↓</kbd> wybór</span>
          <span><kbd className="font-sans font-bold">Enter</kbd> {mode.kind === 'root' ? 'otwórz' : mode.kind === 'pick-task' ? 'wybierz' : 'przenieś'}</span>
          {mode.kind === 'root' && <span><kbd className="font-sans font-bold">&gt;</kbd> przenieś</span>}
          <span className="ml-auto">{flat.length} wyników</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

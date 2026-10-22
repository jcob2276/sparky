import { useMemo } from 'react';
import { SearchX, X } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { useTodoContext } from './context/TodoContext';
import { matchesSmartQuery } from './todoUtils';
import { isStudySubject } from '../../lib/todo/studySubjects';
import { extractFilterTokens, removeFilterToken } from './smartQueryAliases';

const SEARCH_SUGGESTIONS: { token: string; hint: string }[] = [
  { token: 'termin:dziś', hint: 'na dziś' },
  { token: 'termin:tydzień', hint: 'w 7 dni' },
  { token: 'termin:zaległe', hint: 'po terminie' },
  { token: 'priorytet:pilny', hint: 'pilne' },
  { token: 'tag:', hint: 'po tagu' },
  { token: 'sekcja:', hint: 'po sekcji' },
];

interface SearchHintsProps {
  query: string;
  onPick: (nextQuery: string) => void;
}

/** Clickable syntax suggestions, shown while the filter input is focused. */
export function SearchHints({ query, onPick }: SearchHintsProps) {
  const unused = SEARCH_SUGGESTIONS.filter((s) => !query.includes(s.token));
  if (unused.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Podpowiedzi składni"
      className="absolute inset-x-0 top-full z-[var(--z-overlay)] mt-1.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-border-custom bg-surface-solid p-2 shadow-2xl"
      onMouseDown={(event) => event.preventDefault()}
    >
      <span className="px-1 todo-text-micro font-black uppercase tracking-wider text-text-muted/70">Filtry</span>
      {unused.map((suggestion) => (
        <Pressable
          key={suggestion.token}
          onClick={() => onPick(`${query.trim()} ${suggestion.token}`.trim())}
          className="rounded-full border border-border-custom/60 px-2 py-0.5 text-xs font-bold text-text-secondary hover:border-primary/40 hover:text-primary"
          title={suggestion.hint}
        >
          {suggestion.token}
        </Pressable>
      ))}
    </div>
  );
}

interface SearchStatusProps {
  /** The committed (debounced) query that actually filters the list. */
  query: string;
  pending: boolean;
  onChange: (nextQuery: string) => void;
}

/** Active filter chips (with remove), result counter, and the empty / pending states. */
export function SearchStatus({ query, pending, onChange }: SearchStatusProps) {
  const { items, sections, today } = useTodoContext();
  const trimmed = query.trim();
  const chips = useMemo(() => extractFilterTokens(trimmed), [trimmed]);
  const count = useMemo(() => {
    if (!trimmed) return 0;
    const names = Object.fromEntries(sections.map((s) => [s.id, s.name]));
    // Lista filtruje tylko otwarte zadania, chyba że filtr sam wskazuje status.
    const includeDone = /(^|s)status:/i.test(trimmed);
    return items.filter((i) => (includeDone || i.status !== 'done') && !isStudySubject(i) && matchesSmartQuery(trimmed, i, today, names)).length;
  }, [trimmed, items, sections, today]);

  if (!trimmed) return null;
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 pt-1" aria-live="polite">
      {chips.map((chip) => (
        <span key={chip.raw} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-bold text-primary">
          {chip.label}
          <Pressable
            onClick={() => onChange(removeFilterToken(query, chip.raw))}
            aria-label={`Usuń filtr ${chip.label}`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
          >
            <X size={10} />
          </Pressable>
        </span>
      ))}
      {pending ? (
        <span className="h-4 w-20 animate-pulse rounded-full bg-surface-solid/80 motion-reduce:animate-none" aria-label="Wyszukiwanie…" />
      ) : count > 0 ? (
        <span className="text-xs font-semibold text-text-muted">
          {count} {count === 1 ? 'wynik' : count < 5 ? 'wyniki' : 'wyników'}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          <SearchX size={12} aria-hidden="true" /> Brak zadań pasujących do filtra
          <Pressable onClick={() => onChange('')} className="font-black text-primary hover:underline">Wyczyść</Pressable>
        </span>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import Modal from '../../ui/Modal';
import EmptyState from '../../ui/EmptyState';
import Spinner from '../../ui/Spinner';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';
import ExercisePickerRow from './ExercisePickerRow';
import ExercisePickerGroupChips from './ExercisePickerGroupChips';
import { MUSCLE_GROUPS } from './muscleGroups';
import { resolveExercisePickName } from '../../../lib/health/exerciseSearch';
import { useExerciseSearch, type ExerciseMatch } from './useExerciseSearch';

interface ExercisePickerModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSelect: (name: string, tags: string[]) => void;
}

export default function ExercisePickerModal({
  isOpen,
  initialQuery = '',
  onClose,
  onSelect,
}: ExercisePickerModalProps) {
  const haptics = useHaptics();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState<string>('');
  const { matches: allMatches, loading, canUseCustom, queryTrim } = useExerciseSearch(query, isOpen);
  const groupTags = MUSCLE_GROUPS.find((g) => g.id === group)?.tags;
  const matches = groupTags ? allMatches.filter((m) => m.tags.some((t) => groupTags.includes(t))) : allMatches;

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery(initialQuery);
      setGroup('');
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  function pick(item: ExerciseMatch) {
    haptics.light();
    // Close before parent re-render so the sheet click cannot reopen the trigger.
    onClose();
    onSelect(resolveExercisePickName(item.name), item.tags);
  }

  function pickCustom() {
    if (!queryTrim) return;
    haptics.light();
    onClose();
    // EN/PL synonym → kanoniczna nazwa Sparky (historia / PR w jednym kubełku)
    onSelect(resolveExercisePickName(queryTrim), []);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ćwiczenie"
      showCloseButton
      size="md"
      padding="px-4 pt-4 pb-0"
      overflowY={false}
      className="trening-theme !bg-surface !text-text-primary !border-border-custom !h-[min(92svh,720px)] !max-h-[92svh] !flex !flex-col !rounded-t-[28px] sm:!rounded-2xl overflow-hidden"
      overlayClassName="items-end sm:items-center !p-0 sm:!p-5"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 -mx-4 border-b border-border-custom px-4 pb-3">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <ControlInput
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (matches[0]) pick(matches[0]);
                  else if (canUseCustom) pickCustom();
                }
              }}
              placeholder="Szukaj ćwiczenia…"
              autoComplete="off"
              enterKeyHint="search"
              aria-label="Szukaj ćwiczenia"
              className="tren-picker-search w-full rounded-xl border border-border-custom bg-surface-1 py-2.5 pl-9 pr-9 text-base font-semibold text-text-primary placeholder:text-text-muted outline-none"
            />
            {query ? (
              <Pressable
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text-primary"
                aria-label="Wyczyść wyszukiwanie"
              >
                <X size={14} />
              </Pressable>
            ) : null}
          </label>
          <ExercisePickerGroupChips group={group} onChange={setGroup} />
        </div>

        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {canUseCustom ? (
            <Pressable
              type="button"
              onClick={pickCustom}
              className="tren-picker-row flex w-full items-center gap-3 border-b border-border-custom px-4 py-3 text-left ui-interactive"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-surface-tonal text-sm font-black text-primary">
                +
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-text-primary">
                  Użyj „{queryTrim}”
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">Własna nazwa</span>
              </span>
            </Pressable>
          ) : null}

          {matches.length > 0 ? (
            <p className="px-4 pb-1 pt-3 text-2xs font-bold uppercase tracking-wider text-text-tertiary">
              {queryTrim ? 'Wyniki' : 'Częste z dziennika'}
            </p>
          ) : null}

          {matches.length > 0 ? (
            <ul className="divide-y divide-border-custom" role="listbox" aria-label="Wyniki ćwiczeń">
              {matches.map((item) => (
                <li key={`${item.source}-${item.name}`} role="option">
                  <ExercisePickerRow item={item} onSelect={pick} />
                </li>
              ))}
            </ul>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-text-muted">
              <Spinner size="sm" />
              <span className="text-xs font-semibold">Szukam w katalogu…</span>
            </div>
          ) : null}

          {!loading && matches.length === 0 && !canUseCustom ? (
            <div className="px-3 py-2">
              <EmptyState
                icon="🔍"
                label={
                  queryTrim
                    ? 'Brak wyników. Spróbuj innej nazwy albo dodaj własną.'
                    : 'Brak ćwiczeń do pokazania.'
                }
                action={
                  queryTrim
                    ? { label: `Użyj „${queryTrim}”`, onClick: pickCustom }
                    : undefined
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

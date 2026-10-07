import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EXERCISES, normalize } from '../../../data/exercises';
import { searchOpenGymCatalog, preloadOpenGymCatalog, mapTargetToSparkyTags, type OpenGymExercise } from '../../../data/openGymCatalog';
import { Card } from '../../ui/Card';

interface ExerciseNameInputProps {
  value: string;
  tags: string[];
  onChange: (name: string, tags: string[]) => void;
}

interface MatchItem {
  name: string;
  tags: string[];
  source: 'standard' | 'opengym';
  equipment?: string;
}

export default function ExerciseNameInput({
  value,
  tags,
  onChange,
}: ExerciseNameInputProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rawOpenGymMatches, setRawOpenGymMatches] = useState<{ query: string; matches: MatchItem[] }>({ query: '', matches: [] });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Sync external value → local query (e.g. on reset)
  useEffect(() => {
    void (async () => { setQuery(value); })();
  }, [value]);

  const queryTrim = query.trim();
  const standardMatches: MatchItem[] = useMemo(() => {
    if (queryTrim.length === 0) return [];
    return EXERCISES.filter((e) => normalize(e.name).includes(normalize(queryTrim)))
      .slice(0, 6)
      .map((e) => ({ name: e.name, tags: e.tags, source: 'standard' as const }));
  }, [queryTrim]);

  const shouldFetchOpenGym = open && queryTrim.length >= 2 && standardMatches.length < 8;

  useEffect(() => {
    if (!shouldFetchOpenGym) return;
    let active = true;
    void searchOpenGymCatalog(queryTrim, 8 - standardMatches.length)
      .then((results) => {
        if (!active) return;
        const matches: MatchItem[] = results
          .filter((og: OpenGymExercise) => !standardMatches.some((sm) => sm.name.toLowerCase() === og.name.toLowerCase()))
          .map((og: OpenGymExercise) => ({
            name: og.name.charAt(0).toUpperCase() + og.name.slice(1),
            tags: mapTargetToSparkyTags(og.target, og.secondaries),
            source: 'opengym' as const,
            equipment: og.equipment,
          }));
        setRawOpenGymMatches({ query: queryTrim, matches });
      })
      .catch(() => {
        if (active) setRawOpenGymMatches({ query: queryTrim, matches: [] });
      });
    return () => {
      active = false;
    };
  }, [queryTrim, standardMatches, shouldFetchOpenGym]);

  const openGymMatches = shouldFetchOpenGym && rawOpenGymMatches.query === queryTrim ? rawOpenGymMatches.matches : [];
  const allMatches: MatchItem[] = [...standardMatches, ...openGymMatches];

  function select(item: MatchItem) {
    setQuery(item.name);
    onChange(item.name, item.tags);
    setOpen(false);
    setEditing(false);
    inputRef.current?.blur();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v, tags); // keep existing tags when typing freely
    setOpen(true);
  }

  return (
    <div className="relative w-full min-w-0"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setEditing(false);
        }
      }}>
      {!editing && value.trim() ? (
        <Button variant="ghost" onClick={() => setEditing(true)} aria-label={`Zmień ćwiczenie: ${value}`}
          className="w-full !justify-start !px-0 !text-lg !text-text-primary text-left whitespace-normal break-words leading-snug">
          {value}
        </Button>
      ) : (
      <ControlInput
        ref={inputRef}
        type="text"
        aria-label="Nazwa ćwiczenia"
        value={query}
        onChange={handleChange}
        onFocus={() => {
          setEditing(true);
          setOpen(true);
          preloadOpenGymCatalog();
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter') { setOpen(false); event.currentTarget.blur(); }
        }}
        placeholder="Szukaj ćwiczenia…"
        autoComplete="off"
        enterKeyHint="done"
        className="w-full rounded-lg bg-surface-solid px-2 text-base font-bold text-text-primary placeholder:text-text-secondary"
      />
      )}
      {open && allMatches.length > 0 && (
        <Card
          variant="surface"
          padding="0"
          className="absolute left-0 right-0 top-full mt-1 z-[var(--z-overlay)] border border-border-custom shadow-lg max-h-60 overflow-y-auto overscroll-contain"
          style={{ borderRadius: 'var(--ds-inline-style-12px)' }}
        >
          {allMatches.map((item) => (
            <Button
              key={`${item.name}-${item.source}`}
              type="button"
              variant="ghost"
              onPointerDown={event => event.preventDefault()}
              onClick={() => select(item)}
              className="w-full !h-auto flex flex-col !items-start !gap-1 rounded-none !px-3 !py-3 text-left whitespace-normal border-b border-border-custom last:border-b-0 hover:bg-surface-2"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-base font-semibold text-text-primary whitespace-normal break-words leading-snug">{item.name}</span>
                {item.equipment && (
                  <span className="text-xs text-text-secondary capitalize">{item.equipment}</span>
                )}
              </div>
              <span className="text-xs text-text-secondary whitespace-normal">{item.tags.slice(0, 3).join(' · ')}</span>
            </Button>
          ))}
        </Card>
      )}
    </div>
  );
}

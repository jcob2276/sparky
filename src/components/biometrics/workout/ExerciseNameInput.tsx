import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EXERCISES, tagClass, normalize } from '../../../data/exercises';
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
  const [rawOpenGymMatches, setRawOpenGymMatches] = useState<MatchItem[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

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

  const shouldFetchOpenGym = queryTrim.length >= 2 && standardMatches.length < 8;

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
        setRawOpenGymMatches(matches);
      })
      .catch(() => {
        if (active) setRawOpenGymMatches([]);
      });
    return () => {
      active = false;
    };
  }, [queryTrim, standardMatches, shouldFetchOpenGym]);

  const openGymMatches = shouldFetchOpenGym ? rawOpenGymMatches : [];
  const allMatches: MatchItem[] = [...standardMatches, ...openGymMatches];

  function select(item: MatchItem) {
    setQuery(item.name);
    onChange(item.name, item.tags);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v, tags); // keep existing tags when typing freely
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <ControlInput
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => {
          setOpen(true);
          preloadOpenGymCatalog();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Nazwa ćwiczenia (np. bench, siad, cable)..."
        className="w-full bg-transparent text-sm font-bold text-text-primary outline-none placeholder:text-text-muted/40"
      />
      {open && allMatches.length > 0 && (
        <Card
          variant="surface"
          padding="0"
          className="absolute left-0 right-0 top-full mt-2 z-[var(--z-overlay)] border border-border-custom shadow-lg max-h-72 overflow-y-auto"
          style={{ borderRadius: 'var(--ds-inline-style-12px)' }}
        >
          {allMatches.map((item) => (
            <Button
              key={`${item.name}-${item.source}`}
              type="button"
              variant="ghost"
              onMouseDown={() => select(item)}
              className="w-full flex items-center justify-between rounded-none px-3 py-2 text-left hover:bg-text-primary/[0.04] gap-3"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-text-primary truncate">{item.name}</span>
                {item.equipment && (
                  <span className="text-3xs text-text-muted truncate capitalize">{item.equipment}</span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {item.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className={`text-3xs font-black uppercase px-1.5 py-0.5 rounded-full border ${tagClass(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Button>
          ))}
        </Card>
      )}
    </div>
  );
}

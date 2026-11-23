import { Check, ChevronDown, Film } from 'lucide-react';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import { BASELINE_PLACEHOLDER, isBaselineSkipped, type BaselineResult, type BaselineTest } from '../../../lib/health/baselineTests';
import type { BaselinePatch } from '../../../lib/health/baselineApi';
import BaselineVideoCell, { baselineInputClass } from './BaselineVideoCell';
import BaselineSetsEditor from './BaselineSetsEditor';
import { heaviestSetKg, summarizeSets, type SetRow } from '../../../lib/health/baselineRamp';

interface Props {
  test: BaselineTest;
  result?: BaselineResult;
  /** Naprzemienne tło: dwa kolory jak w arkuszu trenera. */
  tone: 'a' | 'b';
  expanded: boolean;
  onToggle: () => void;
  onSave: (patch: BaselinePatch) => void;
  onUpload: (file: File) => Promise<void>;
  onRemoveVideo: (path: string) => void;
}

const TONE: Record<Props['tone'], { row: string; badge: string }> = {
  a: { row: 'baseline-tone-yellow', badge: 'baseline-badge-yellow' },
  b: { row: 'baseline-tone-orange', badge: 'baseline-badge-orange' },
};

/** Wiersz testu: zwinięty pokazuje numer, nazwę i wynik; po dotknięciu rozwija pola serii, maxa i wideo. */
export default function BaselineRow({ test, result, tone, expanded, onToggle, onSave, onUpload, onRemoveVideo }: Props) {
  const skipped = isBaselineSkipped(test, result);
  const hint = BASELINE_PLACEHOLDER[test.unit];
  const max = result?.max_value?.trim();
  const main = result?.main_set?.trim();
  const hasVideo = Boolean(result?.video_path || result?.video_url);
  const done = Boolean(max || main);
  const palette = TONE[tone];

  return (
    <li className={`overflow-hidden rounded-2xl ${palette.row} ${skipped && !expanded ? 'opacity-55' : ''}`} data-testid={`baseline-${test.key}`}>
      <Pressable
        variant="ghost"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${test.no}. ${test.name}`}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${palette.badge}`}>{test.no}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold leading-snug text-text-primary ${skipped ? 'line-through' : ''}`}>{test.name}</span>
          {skipped ? <span className="block text-2xs font-semibold text-text-muted">Pominięty</span>
            : done ? <span className="block truncate text-xs text-text-secondary">{[main && `seria ${main}`, max && `max ${max}`].filter(Boolean).join(' · ')}</span> : null}
        </span>
        {!skipped && hasVideo && <Film size={15} className="shrink-0 text-text-muted" aria-label="Ma wideo" />}
        {!skipped && done && <Check size={16} className="shrink-0 text-success" aria-label="Wpisany wynik" />}
        <ChevronDown size={16} className={`shrink-0 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </Pressable>

      {expanded && (
        <div className="space-y-3 px-3 pb-3">
          {!skipped && (
            <>
              {test.unit === 'weight' ? (
                <>
                  <BaselineSetsEditor
                    sets={result?.sets?.length ? result.sets : [{ kg: null, reps: null }]}
                    onCommit={(rows: SetRow[]) => {
                      const filled = rows.filter((r) => r.kg != null || r.reps != null);
                      onSave({ sets: filled.length ? filled : null, main_set: summarizeSets(filled) || null });
                    }}
                  />
                  <label className="block space-y-1 text-2xs font-semibold text-text-muted">Mój max
                    <ControlInput className={baselineInputClass} placeholder={heaviestSetKg(result?.sets ?? []) != null ? `${heaviestSetKg(result?.sets ?? [])} kg` : hint.max} defaultValue={result?.max_value ?? ''} aria-label={`Mój max: ${test.name}`}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (result?.max_value ?? '')) onSave({ max_value: v || null }); }} />
                  </label>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-2xs font-semibold text-text-muted">Główna seria
                    <ControlInput className={baselineInputClass} placeholder={hint.main} defaultValue={result?.main_set ?? ''} aria-label={`Główna seria: ${test.name}`}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (result?.main_set ?? '')) onSave({ main_set: v || null }); }} />
                  </label>
                  <label className="space-y-1 text-2xs font-semibold text-text-muted">Mój max
                    <ControlInput className={baselineInputClass} placeholder={hint.max} defaultValue={result?.max_value ?? ''} aria-label={`Mój max: ${test.name}`}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (result?.max_value ?? '')) onSave({ max_value: v || null }); }} />
                  </label>
                </div>
              )}
              <BaselineVideoCell test={test} result={result} onSave={onSave} onUpload={onUpload} onRemoveVideo={onRemoveVideo} />
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => onSave({ skipped: !skipped })}>{skipped ? 'Przywróć test' : 'Pomiń test'}</Button>
        </div>
      )}
    </li>
  );
}

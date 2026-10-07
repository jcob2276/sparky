import { Pressable } from '../../ui/ControlPrimitives';
import { formatLastSession, type ExerciseHistoryRow } from './workoutUtils';
import {
  formatSuggestionShort,
  suggestionProgressed,
  suggestionReason,
  suggestionRegressed,
  type ExerciseSuggestion,
} from '../../../lib/health/exerciseSuggestion';

interface ExerciseCardSubheaderProps {
  lastSession: ExerciseHistoryRow[] | null;
  daysAgo: number | null;
  historyAlias: string | null;
  suggestion: ExerciseSuggestion | null;
  lastFatigue: { repDropPct: number; message?: string } | null;
  onFillHistory: () => void;
  onFillSuggestion: () => void;
}

export function ExerciseCardSubheader({
  lastSession,
  daysAgo,
  historyAlias,
  suggestion,
  lastFatigue,
  onFillHistory,
  onFillSuggestion,
}: ExerciseCardSubheaderProps) {
  if (!lastSession?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border-custom px-3 py-2">
      <Pressable
        type="button"
        onClick={onFillHistory}
        className="flex w-full min-h-11 flex-col items-start gap-1 rounded-lg p-1 hover:bg-primary/5"
        title="Wstaw wszystkie serie z ostatniej sesji"
      >
        <span className="text-xs font-semibold text-text-secondary">Ostatnio</span>
        <span className="text-sm font-semibold text-text-primary whitespace-normal text-left">{formatLastSession(lastSession)}</span>
        {daysAgo != null && (
          <span className="text-xs text-text-secondary text-left">
            {daysAgo === 0 ? '(dziś)' : daysAgo === 1 ? '(1d temu)' : `(${daysAgo}d temu)`}
            {historyAlias ? ` · jako ${historyAlias}` : ''}
          </span>
        )}
      </Pressable>
      {suggestion && (
        <Pressable
          type="button"
          onClick={onFillSuggestion}
          className={`min-h-11 text-sm font-semibold rounded-lg px-3 ${
            suggestionProgressed(suggestion)
              ? 'text-success bg-success/10'
              : suggestionRegressed(suggestion)
                ? 'text-warning bg-warning/10'
                : 'text-text-secondary bg-surface'
          }`}
          title={suggestionReason(suggestion)}
        >
          {formatSuggestionShort(suggestion)}
        </Pressable>
      )}
      {lastFatigue && lastFatigue.repDropPct >= 5 && (
        <span className="text-2xs font-bold text-warning shrink-0" title={lastFatigue.message}>
          ↓{lastFatigue.repDropPct}%
        </span>
      )}
    </div>
  );
}

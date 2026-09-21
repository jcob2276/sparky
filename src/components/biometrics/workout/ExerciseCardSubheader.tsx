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
    <div className="flex items-center gap-2 border-t border-border-custom bg-text-primary/[0.01] px-4 py-2">
      <Pressable
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onFillHistory();
        }}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-0.5 cursor-pointer hover:bg-primary/5 transition-colors"
        title="Wstaw wszystkie serie z ostatniej sesji"
      >
        <span className="text-2xs font-black uppercase tracking-widest text-text-muted shrink-0">Ostatnio</span>
        <span className="text-xs font-bold text-text-secondary truncate">{formatLastSession(lastSession)}</span>
        {daysAgo != null && (
          <span className="text-2xs font-bold text-text-muted/50 shrink-0">
            {daysAgo === 0 ? '(dziś)' : daysAgo === 1 ? '(1d temu)' : `(${daysAgo}d temu)`}
            {historyAlias ? ` · jako ${historyAlias}` : ''}
          </span>
        )}
      </Pressable>
      {suggestion && (
        <Pressable
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onFillSuggestion();
          }}
          className={`shrink-0 text-xs font-black rounded-lg px-2 py-1 ${
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

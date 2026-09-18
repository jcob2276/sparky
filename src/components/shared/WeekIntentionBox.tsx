import { Sparkles, Pencil, Check, X, Award } from 'lucide-react';
import { Pressable, ControlInput } from '../ui/ControlPrimitives';

interface WeekIntentionBoxProps {
  intention: string | null;
  showWeek: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  draftIntention: string;
  setDraftIntention: (v: string) => void;
  saving: boolean;
  aiSuggesting: boolean;
  handleAiSuggest: () => void;
  handleSaveIntention: () => void;
  onStartWeeklyReview?: () => void;
  weekStart?: string;
  sourceFallback?: boolean;
  promptText: string;
}

export function WeekIntentionBox({
  intention,
  showWeek,
  isEditing,
  setIsEditing,
  draftIntention,
  setDraftIntention,
  saving,
  aiSuggesting,
  handleAiSuggest,
  handleSaveIntention,
  onStartWeeklyReview,
  weekStart,
  sourceFallback,
  promptText,
}: WeekIntentionBoxProps) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-3xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
          <Sparkles size={11} /> Intencja bieżącego tygodnia
        </span>
        {sourceFallback && (
          <span className="text-3xs font-extrabold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
            Z poprzedniego tyg.
          </span>
        )}
      </div>

      {showWeek && !isEditing ? (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-text-primary leading-snug flex-1">
            {intention}
          </p>
          {weekStart && (
            <Pressable
              type="button"
              onClick={() => {
                setDraftIntention(intention ?? '');
                setIsEditing(true);
              }}
              title="Edytuj intencję tygodnia"
              className="p-1 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
            >
              <Pencil size={13} />
            </Pressable>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary/90 flex items-center gap-1.5 truncate">
              <Sparkles size={12} className="shrink-0 text-primary" />
              {promptText}
            </p>
            <Pressable
              type="button"
              onClick={handleAiSuggest}
              disabled={aiSuggesting}
              className="inline-flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              <Sparkles size={11} className={aiSuggesting ? 'animate-spin' : ''} />
              {aiSuggesting ? 'Myśli…' : '✨ AI sugestia'}
            </Pressable>
          </div>
          <div className="flex items-center gap-2">
            <ControlInput
              type="text"
              placeholder="Wpisz intencję tygodnia..."
              value={draftIntention}
              onChange={(e) => setDraftIntention(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSaveIntention();
                if (e.key === 'Escape' && showWeek) setIsEditing(false);
              }}
              className="flex-1 rounded-xl border border-primary/30 bg-surface px-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary placeholder:text-text-muted transition-colors"
            />
            <Pressable
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSaveIntention}
              disabled={saving || !draftIntention.trim()}
              loading={saving}
              className="rounded-xl px-3 py-1.5 text-xs font-bold shrink-0"
            >
              <Check size={12} className="mr-1 inline" /> Ustaw
            </Pressable>
            {isEditing && showWeek && (
              <Pressable
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-text-muted hover:text-text-primary px-2 shrink-0"
              >
                <X size={13} />
              </Pressable>
            )}
          </div>
          {!showWeek && onStartWeeklyReview && (
            <div className="pt-1">
              <Pressable
                type="button"
                onClick={onStartWeeklyReview}
                className="text-2xs font-semibold text-text-muted hover:text-primary transition-colors flex items-center gap-1"
              >
                <Award size={11} /> Lub otwórz pełny rytuał planowania
              </Pressable>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

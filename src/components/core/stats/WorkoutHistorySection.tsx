import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dumbbell, Trash2, ChevronDown, ChevronUp, Flame, Zap } from 'lucide-react';
import type { WorkoutSessionRow, EditFormState } from '../hooks/useStatsData';
import { WorkoutSessionEditor } from './WorkoutSessionEditor';

const POLISH_DAYS: Record<number, string> = {
  0: 'Niedziela',
  1: 'Poniedziałek',
  2: 'Wtorek',
  3: 'Środa',
  4: 'Czwartek',
  5: 'Piątek',
  6: 'Sobota',
};

function getPolishWeekday(isoDate?: string | null): string {
  if (!isoDate) return '';
  try {
    const d = parseISO(isoDate);
    return POLISH_DAYS[d.getDay()] || '';
  } catch {
    return '';
  }
}

export function WorkoutHistorySection({
  recentSessions,
  showAllSessions,
  setShowAllSessions,
  editingSession,
  editForm,
  setEditForm,
  startEditing,
  updateSession,
  deleteSession,
  deleteLog,
  setEditingSession,
}: {
  recentSessions: WorkoutSessionRow[];
  showAllSessions: boolean;
  setShowAllSessions: React.Dispatch<React.SetStateAction<boolean>>;
  editingSession: string | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  startEditing: (session: WorkoutSessionRow) => void;
  updateSession: () => void;
  deleteSession: (id: string) => void;
  deleteLog: (id: string) => void;
  setEditingSession: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);

  const displayedSessions = recentSessions.slice(0, showAllSessions ? 16 : 4);

  return (
    <section id="kronika-silownia" className="rounded-2xl border border-border-custom bg-surface/50 backdrop-blur-[var(--blur-md)] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted font-display">
              Siłownia & Jednostki
            </p>
          </div>
          <h2 className="mt-0.5 font-display text-lg font-black tracking-tight text-text-primary flex items-center gap-2">
            Historia treningów
            <span className="text-xs font-mono font-bold text-text-muted">
              ({recentSessions.length})
            </span>
          </h2>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-warning/10 text-warning border border-warning/20">
          <Dumbbell size={16} />
        </div>
      </div>

      {/* Session Stream Cards */}
      <div className="space-y-2.5">
        {displayedSessions.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-text-muted bg-surface rounded-xl border border-border-custom">
            Brak zarejestrowanych sesji siłowych
          </div>
        ) : (
          displayedSessions.map((s) => {
            const isEditing = editingSession === s.id;
            const weekday = getPolishWeekday(s.date);
            const dateFormatted = s.date ? format(parseISO(s.date), 'dd.MM') : '--';
            const logs = s.exercise_logs || [];
            const isWellness = logs.length > 0 && logs.every((l) =>
              (l.muscle_tags || []).includes('wellness') ||
              ['sauna', 'lodowata', 'zimny prysznic', 'stretching', 'foam rolling'].some(w => (l.exercise_name || '').toLowerCase().startsWith(w))
            );

            // Compute tonnage
            const totalTonnageKg = logs.reduce((acc, l) => {
              const w = Number(l.weight) || 0;
              const r = Number(l.reps) || 0;
              return acc + (w > 0 && r > 0 ? w * r : 0);
            }, 0);

            if (isEditing) {
              return (
                <WorkoutSessionEditor
                  key={s.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  updateSession={updateSession}
                  deleteLog={deleteLog}
                  onCancel={() => setEditingSession(null)}
                />
              );
            }

            const isSummaryExpanded = expandedSummaryId === s.id;

            return (
              <div
                key={s.id}
                className="rounded-xl border border-border-custom bg-surface p-3 transition-all hover:border-border-custom/80 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2.5">
                  {/* Left: Date + Weekday badge */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-11 rounded-lg bg-surface-2/60 border border-border-custom/60 text-center">
                      <span className="text-xs font-black text-text-primary font-mono leading-none">
                        {dateFormatted}
                      </span>
                      <span className="text-3xs font-semibold text-text-muted uppercase mt-0.5 leading-none">
                        {weekday.slice(0, 3)}
                      </span>
                    </div>

                    {/* Center info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black uppercase tracking-tight text-text-primary truncate">
                          {s.workout_day || 'Trening'}
                        </h4>
                        {isWellness && (
                          <span className="inline-flex items-center gap-0.5 text-3xs font-bold text-info bg-info/10 border border-info/20 px-1.5 py-0.2 rounded">
                            <Flame size={9} /> Wellness
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-3xs font-medium text-text-muted">
                        {logs.length > 0 && <span>{logs.length} ćwiczeń</span>}
                        {totalTonnageKg > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-bold text-primary">{(totalTonnageKg / 1000).toFixed(1)} Mg tonażu</span>
                          </>
                        )}
                        {s.session_rpe != null && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-text-secondary">RPE {s.session_rpe}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1">
                    {logs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedSummaryId(isSummaryExpanded ? null : s.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
                        title={isSummaryExpanded ? 'Zwiń ćwiczenia' : 'Pokaż ćwiczenia'}
                      >
                        {isSummaryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditing(s)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Edytuj"
                    >
                      <Zap size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSession(s.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      title="Usuń"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded exercise chips preview */}
                {isSummaryExpanded && logs.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-border-custom/50 flex flex-wrap gap-1.5">
                    {logs.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 text-3xs font-medium bg-surface-2/60 border border-border-custom/50 px-2 py-1 rounded-md text-text-secondary"
                      >
                        <span className="font-bold text-text-primary">{l.exercise_name}</span>
                        {l.weight != null && l.reps != null && (
                          <span className="text-text-muted">({l.weight}kg × {l.reps})</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Show more toggle */}
      {recentSessions.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAllSessions((v) => !v)}
          className="w-full py-2 rounded-xl border border-border-custom bg-surface text-2xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-solid transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          {showAllSessions ? (
            <>
              <ChevronUp size={13} />
              Zwiń historię
            </>
          ) : (
            <>
              <ChevronDown size={13} />
              Pokaż więcej ({recentSessions.length - 4} sesji)
            </>
          )}
        </button>
      )}
    </section>
  );
}

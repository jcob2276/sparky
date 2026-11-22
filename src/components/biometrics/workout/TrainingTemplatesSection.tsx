import { Play, Zap, Sparkles, Dumbbell } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { WorkoutTemplateSummary } from '../../../lib/health/workoutApi';
import { formatWorkoutTonnage, normalizeSessionRpe } from '../../../lib/health/workoutDisplay';
import { withNextRotationFlag } from '../../../lib/health/templateRotation';

interface TrainingTemplatesSectionProps {
  templates: WorkoutTemplateSummary[];
  onSelectTemplate: (template: WorkoutTemplateSummary) => void;
}

export default function TrainingTemplatesSection({
  templates,
  onSelectTemplate,
}: TrainingTemplatesSectionProps) {
  if (templates.length === 0) return null;

  const marked = withNextRotationFlag(templates);

  const getPolishPlural = (count: number) => {
    if (count === 1) return 'schemat';
    if (count >= 2 && count <= 4) return 'schematy';
    return 'schematów';
  };

  return (
    <section className="space-y-2.5" aria-label="Plany i schematy treningowe">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Plany & Schematy
          </h2>
        </div>
        <span className="text-2xs font-bold text-text-tertiary tabular-nums">
          {templates.length} {getPolishPlural(templates.length)}
        </span>
      </div>

      <div className="space-y-2">
        {marked.map((tpl) => {
          const tonnageLabel = formatWorkoutTonnage(tpl.totalTonnageKg);
          const rpe = normalizeSessionRpe(tpl.sessionRpe);
          const formattedDate = tpl.date
            ? tpl.date.slice(5).replace('-', '.')
            : null;

          return (
            <Pressable
              key={tpl.sessionId}
              onClick={() => onSelectTemplate(tpl)}
              className={`trening-panel w-full rounded-[var(--tren-radius-card)] p-3.5 text-left ui-interactive group cursor-pointer transition-all hover:border-primary/40 ${
                tpl.isNextInRotation
                  ? 'border-primary/50 shadow-sm ring-1 ring-primary/20 bg-primary/[0.03]'
                  : 'border-border-custom/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-text-primary font-display group-hover:text-primary transition-colors leading-tight">
                      {tpl.workoutDay}
                    </h3>
                    {tpl.isNextInRotation && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-bold text-primary border border-primary/25">
                        <Sparkles size={10} /> Kolejny w rotacji
                      </span>
                    )}
                    {formattedDate && (
                      <span className="text-2xs text-text-muted tabular-nums ml-auto font-medium">
                        Ostatnio: {formattedDate}
                      </span>
                    )}
                  </div>

                  {tpl.exercises.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      {tpl.exercises.slice(0, 4).map((ex, idx) => (
                        <span
                          key={`${ex}-${idx}`}
                          className="rounded-md bg-surface-1 px-1.5 py-0.5 text-2xs font-medium text-text-secondary border border-border-custom/40 truncate max-w-[140px]"
                        >
                          {ex}
                        </span>
                      ))}
                      {tpl.exercises.length > 4 && (
                        <span className="rounded-md bg-surface-1 px-1.5 py-0.5 text-2xs font-semibold text-text-muted border border-border-custom/40">
                          +{tpl.exercises.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {(tonnageLabel || rpe != null) && (
                    <div className="flex items-center gap-3 text-2xs font-medium text-text-muted pt-0.5">
                      {tonnageLabel && (
                        <span className="flex items-center gap-1">
                          <Dumbbell size={11} className="text-primary/70" />
                          <span className="font-mono font-semibold text-text-secondary">{tonnageLabel}</span>
                        </span>
                      )}
                      {rpe != null && (
                        <span className="font-mono">
                          RPE <span className="font-semibold text-text-secondary">{rpe}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-on-accent shrink-0 mt-0.5 transition-transform group-hover:scale-105 shadow-sm ${
                    tpl.isNextInRotation
                      ? 'bg-primary'
                      : 'bg-primary/90'
                  }`}
                  aria-label="Rozpocznij ten trening"
                >
                  <Play size={13} className="fill-current ml-0.5" />
                </div>
              </div>
            </Pressable>
          );
        })}
      </div>
    </section>
  );
}

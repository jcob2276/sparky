import { Play, Zap } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { WorkoutTemplateSummary } from '../../../lib/health/workoutApi';
import { formatWorkoutTonnage, normalizeSessionRpe } from '../../../lib/health/workoutDisplay';
import { withNextRotationFlag } from '../../../lib/health/templateRotation';

interface TrainingTemplatesSectionProps {
  templates: WorkoutTemplateSummary[];
  onSelectTemplate: (template: WorkoutTemplateSummary) => void;
}

/** Compact 1-tap schemes — demoted below map / PRs / insight (not the hero). */
export default function TrainingTemplatesSection({
  templates,
  onSelectTemplate,
}: TrainingTemplatesSectionProps) {
  if (templates.length === 0) return null;

  const marked = withNextRotationFlag(templates);

  return (
    <section className="space-y-2" aria-label="Szybkie schematy">
      <div className="flex items-center gap-1.5 px-0.5">
        <Zap size={12} className="text-primary" />
        <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
          1-tap start
        </span>
        <span className="text-3xs font-bold text-text-tertiary tabular-nums ml-auto">
          {templates.length} schemat{templates.length === 1 ? '' : 'y'}
        </span>
      </div>

      <div className="space-y-1.5">
        {marked.map((tpl) => {
          const tonnageLabel = formatWorkoutTonnage(tpl.totalTonnageKg);
          const rpe = normalizeSessionRpe(tpl.sessionRpe);
          return (
            <Pressable
              key={tpl.sessionId}
              onClick={() => onSelectTemplate(tpl)}
              className={`trening-panel-muted w-full rounded-[var(--tren-radius-card)] px-3 py-2 text-left ui-interactive group cursor-pointer hover:border-primary/35 ${
                tpl.isNextInRotation ? 'border-primary/40' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-text-primary font-display truncate group-hover:text-primary transition-colors">
                      {tpl.workoutDay}
                      {tpl.isNextInRotation && (
                        <span className="ml-1.5 text-3xs font-black uppercase tracking-wider text-primary">
                          następny
                        </span>
                      )}
                    </h3>
                    {tpl.date && (
                      <span className="text-3xs text-text-muted tabular-nums shrink-0">
                        {tpl.date.slice(5)}
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-text-secondary line-clamp-1 leading-snug mt-0.5">
                    {tpl.exercises.join(' · ')}
                    {tonnageLabel ? ` · ${tonnageLabel}` : ''}
                    {rpe != null ? ` · RPE ${rpe}` : ''}
                  </p>
                </div>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-on-accent shrink-0 ${
                    tpl.isNextInRotation ? 'bg-primary' : 'bg-primary/90'
                  }`}
                >
                  <Play size={11} className="fill-current ml-0.5" />
                </div>
              </div>
            </Pressable>
          );
        })}
      </div>
    </section>
  );
}

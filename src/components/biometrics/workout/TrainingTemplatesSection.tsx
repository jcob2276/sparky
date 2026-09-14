import { Play, Sparkles, Plus, Dumbbell, History, ArrowRight } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import type { WorkoutTemplateSummary } from '../../../lib/health/workoutApi';

interface TrainingTemplatesSectionProps {
  templates: WorkoutTemplateSummary[];
  onSelectTemplate: (template: WorkoutTemplateSummary) => void;
  onStartBlank: () => void;
  onOpenNlCapture: () => void;
}

export default function TrainingTemplatesSection({
  templates,
  onSelectTemplate,
  onStartBlank,
  onOpenNlCapture,
}: TrainingTemplatesSectionProps) {
  return (
    <div className="space-y-4">
      {/* 1-Tap Quick Starts from History */}
      {templates.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <History size={13} className="text-text-muted" />
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
              Powtórz ostatnie schematy (1-Tap)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {templates.map((tpl) => {
              const tonnageMg = (tpl.totalTonnageKg / 1000).toFixed(1);
              return (
                <Pressable
                  key={tpl.sessionId}
                  onClick={() => onSelectTemplate(tpl)}
                  className="rounded-2xl border border-border-custom bg-surface hover:border-primary/50 p-3.5 text-left transition-all active:scale-[0.98] group cursor-pointer space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-text-primary font-display group-hover:text-primary transition-colors">
                      {tpl.workoutDay}
                    </h3>
                    <div className="p-1 rounded-lg bg-primary/10 text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                      <Play size={12} className="fill-current" />
                    </div>
                  </div>

                  <div className="text-3xs text-text-secondary line-clamp-1">
                    {tpl.exercises.join(' · ')}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border-custom/40 text-3xs font-mono text-text-muted">
                    <span>{tpl.exerciseCount} ćwiczeń</span>
                    {tpl.totalTonnageKg > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-primary">{tonnageMg} Mg</span>
                      </>
                    )}
                    {tpl.sessionRpe != null && (
                      <>
                        <span>·</span>
                        <span>RPE {tpl.sessionRpe}</span>
                      </>
                    )}
                  </div>
                </Pressable>
              );
            })}
          </div>
        </div>
      )}

      {/* Alternative Start Options: Blank or AI Capture */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <Pressable
          onClick={onStartBlank}
          className="rounded-2xl border border-dashed border-border-custom bg-surface/50 hover:bg-surface hover:border-primary/45 p-4 text-center transition-all active:scale-[0.98] cursor-pointer space-y-1.5"
        >
          <div className="mx-auto w-8 h-8 rounded-xl bg-surface border border-border-custom flex items-center justify-center text-text-secondary">
            <Plus size={16} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-text-primary block">
            Czysty Trening
          </span>
          <span className="text-3xs text-text-muted block">Rozpocznij od zera</span>
        </Pressable>

        <Pressable
          onClick={onOpenNlCapture}
          className="rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/15 p-4 text-center transition-all active:scale-[0.98] cursor-pointer space-y-1.5 shadow-sm"
        >
          <div className="mx-auto w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-primary block">
            AI Zrzut (NL)
          </span>
          <span className="text-3xs text-text-muted block">Głos lub wklejenie tekstu</span>
        </Pressable>
      </div>
    </div>
  );
}

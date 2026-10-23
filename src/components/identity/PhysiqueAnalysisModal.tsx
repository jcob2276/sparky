import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Activity, Dumbbell, ShieldCheck, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { PhysiqueAnalysisResult, MuscleGroupAnalysis } from '../../lib/physiqueApi';
import { Pressable } from '../ui/ControlPrimitives';
import { Card } from '../ui/Card';

interface Props {
  analysis: PhysiqueAnalysisResult;
  photoDate?: string;
  onClose: () => void;
}

export default function PhysiqueAnalysisModal({ analysis, photoDate, onClose }: Props) {
  const [showAllMuscles, setShowAllMuscles] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const displayedMuscles = showAllMuscles
    ? analysis.muscle_groups
    : analysis.muscle_groups.slice(0, 6);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-overlay,50)] flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-[var(--blur-md)] animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-border-custom rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-custom bg-surface-solid/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display tracking-tight text-text-primary">
                Analiza sylwetki AI
              </h2>
              {photoDate && (
                <p className="text-xs text-text-muted">
                  Check-in: {photoDate}
                </p>
              )}
            </div>
          </div>
          <Pressable
            onClick={onClose}
            variant="ghost"
            icon={<X size={18} />}
            aria-label="Zamknij analizę"
            className="flex h-11 w-11 items-center justify-center text-text-muted hover:text-text-primary rounded-xl"
          />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:none]">
          
          {/* Main Score Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="1rem" className="text-center bg-primary/5 border-primary/20">
              <span className="text-xs font-medium text-text-muted">Wynik sylwetki</span>
              <p className="mt-1 text-3xl font-semibold font-display ui-num text-primary">{analysis.overall_score}<span className="text-xs text-text-muted">/100</span></p>
            </Card>

            <Card padding="1rem" className="text-center">
              <span className="text-xs font-medium text-text-muted">Tkanka tłuszczowa</span>
              <p className="mt-1 text-xl font-semibold font-display ui-num text-text-primary">{analysis.body_fat_estimate}</p>
            </Card>

            <Card padding="1rem" className="text-center">
              <span className="text-xs font-medium text-text-muted">Kondycja</span>
              <p className="mt-1 text-xl font-semibold font-display ui-num text-text-primary">{analysis.conditioning_score}<span className="text-xs text-text-muted">/100</span></p>
            </Card>

            <Card padding="1rem" className="text-center">
              <span className="text-xs font-medium text-text-muted">Symetria</span>
              <p className="mt-1 text-xl font-semibold font-display ui-num text-text-primary">{analysis.symmetry_score}<span className="text-xs text-text-muted">/100</span></p>
            </Card>
          </div>

          {/* AI Coaching Summary */}
          {analysis.coaching_summary && (
            <Card padding="1.25rem" className="border-border-custom bg-surface-solid/30 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary font-display">
                <Activity size={15} />
                <span>Wnioski AI trenera</span>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">
                {analysis.coaching_summary}
              </p>
            </Card>
          )}

          {/* Priorities */}
          {analysis.priorities && analysis.priorities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-primary font-display">
                Priorytety treningowe
              </h3>
              <div className="space-y-2">
                {analysis.priorities.map((priority, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-surface border border-border-custom text-sm text-text-primary">
                    <div className="mt-0.5 shrink-0 text-primary">
                      <Dumbbell size={14} />
                    </div>
                    <span>{priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 15 Muscle Groups Breakdown */}
          {analysis.muscle_groups && analysis.muscle_groups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary font-display">
                  Rozbicie grup mięśniowych ({analysis.muscle_groups.length})
                </h3>
                <Pressable
                  onClick={() => setShowAllMuscles(!showAllMuscles)}
                  className="min-h-[44px] text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                >
                  <span>{showAllMuscles ? 'Pokaż mniej' : `Pokaż wszystkie (${analysis.muscle_groups.length})`}</span>
                  {showAllMuscles ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Pressable>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {displayedMuscles.map((muscle, idx) => (
                  <MuscleGroupCard key={idx} muscle={muscle} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-border-custom bg-surface-solid/50">
          <Pressable
            onClick={onClose}
            variant="ghost"
            className="min-h-[44px] px-6 py-2 bg-primary text-on-accent font-display font-semibold text-sm rounded-xl hover:bg-primary-hover ui-interactive"
          >
            Zamknij
          </Pressable>
        </div>

      </div>
    </div>,
    document.body
  );
}

function MuscleGroupCard({ muscle }: { muscle: MuscleGroupAnalysis }) {
  const isLagging = muscle.status === 'lagging';
  const isStrong = muscle.status === 'strong';

  const badgeColor = isStrong
    ? 'bg-success/10 text-success border-success/20'
    : isLagging
    ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-primary/10 text-primary border-primary/20';

  const StatusIcon = isStrong ? ShieldCheck : isLagging ? AlertCircle : CheckCircle2;

  return (
    <div className="p-3 rounded-2xl border border-border-custom bg-surface space-y-1.5 hover:border-border-custom/80 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary font-display">{muscle.name}</span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ui-num ${badgeColor}`}>
          <StatusIcon size={12} />
          <span>{muscle.score}/100</span>
        </div>
      </div>
      <p className="text-xs text-text-secondary leading-snug">
        {muscle.notes}
      </p>
    </div>
  );
}

import type {
  DecisionCandidate,
  DomainTrajectory,
  SparkySynthesis,
  SynthesisDomain,
} from '@vanguard/domain';
import { AlertTriangle, Check, ChevronRight, Clock3, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';

const domainLabels: Partial<Record<SynthesisDomain, string>> = {
  recovery: 'Regeneracja',
  training: 'Trening',
  nutrition: 'Żywienie',
  execution: 'Wykonanie',
  medical: 'Zdrowie',
  calendar: 'Kalendarz',
};

const trajectoryMark: Record<DomainTrajectory, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
  volatile: '↕',
  insufficient_data: '·',
};

const trajectoryTone: Record<DomainTrajectory, string> = {
  improving: 'text-success',
  stable: 'text-text-secondary',
  declining: 'text-danger',
  volatile: 'text-warning',
  insufficient_data: 'text-text-muted',
};

const supportsDecision = (candidate: DecisionCandidate) => (
  candidate.source === 'todo'
  || candidate.source === 'system_proposal'
  || candidate.source === 'oracle_recommendation'
  || candidate.source === 'medical_prevention'
);

const positiveDecision = (candidate: DecisionCandidate) => (
  candidate.source === 'medical_prevention' ? 'complete' : 'accept'
);

interface Props {
  synthesis: SparkySynthesis;
  onDecision: (
    candidate: DecisionCandidate,
    decision: 'accept' | 'dismiss' | 'complete' | 'snooze',
  ) => void;
}

export default function SynthesisMobileCard({ synthesis, onDecision }: Props) {
  const primaryConflict = synthesis.conflicts[0];

  return (
    <Card variant="accent" padding="1rem" className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-primary">
            <Sparkles size={12} /> Synteza Sparky
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-text-primary">
            {synthesis.overallState}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{synthesis.summary}</p>
        </div>
        <div className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-2xs font-black text-primary">
          {synthesis.confidence.overall}% pewności
        </div>
      </header>

      <div className="grid grid-cols-3 gap-1.5">
        {Object.entries(synthesis.trajectories).map(([domain, trajectory]) => (
          <div key={domain} className="rounded-xl bg-surface-2 px-2 py-2 text-center">
            <p className="truncate text-3xs font-bold uppercase tracking-wide text-text-muted">
              {domainLabels[domain as SynthesisDomain]}
            </p>
            <p className={`mt-0.5 text-sm font-black ${trajectoryTone[trajectory]}`}>
              {trajectoryMark[trajectory]}
            </p>
          </div>
        ))}
      </div>

      <section aria-labelledby="levers-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 id="levers-heading" className="text-2xs font-black uppercase tracking-widest text-text-muted">
            Trzy dźwignie
          </h3>
          <span className="text-3xs font-semibold text-text-muted">{synthesis.levers.length}/3</span>
        </div>
        {synthesis.levers.map((lever, index) => (
          <div key={lever.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-border-custom bg-surface px-2.5 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-black text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-primary">{lever.title}</p>
              <p className="text-3xs text-text-muted">{domainLabels[lever.domain]}</p>
            </div>
            {lever.source === 'todo' ? (
              <Pressable
                aria-label={`Wykonaj: ${lever.title}`}
                onClick={() => onDecision(lever, 'complete')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-success hover:bg-success/10"
              >
                <Check size={16} />
              </Pressable>
            ) : supportsDecision(lever) ? (
              <>
                {lever.source === 'medical_prevention' && (
                  <Pressable
                    aria-label={`Odłóż: ${lever.title}`}
                    onClick={() => onDecision(lever, 'snooze')}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-primary/10 hover:text-primary"
                  >
                    <Clock3 size={15} />
                  </Pressable>
                )}
                <Pressable
                  aria-label={`Odrzuć: ${lever.title}`}
                  onClick={() => onDecision(lever, 'dismiss')}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <X size={15} />
                </Pressable>
                <Pressable
                  aria-label={`Akceptuj: ${lever.title}`}
                  onClick={() => onDecision(lever, positiveDecision(lever))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                >
                  <ChevronRight size={16} />
                </Pressable>
              </>
            ) : null}
          </div>
        ))}
      </section>

      {primaryConflict && (
        <section className="rounded-xl border border-warning/20 bg-warning/[0.05] px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="text-xs font-bold text-text-primary">{primaryConflict.title}</p>
              <p className="mt-0.5 text-3xs leading-relaxed text-text-secondary">
                {primaryConflict.recommendedResolution}
              </p>
            </div>
          </div>
        </section>
      )}

      <footer className="flex items-center gap-1.5 border-t border-border-custom pt-2 text-3xs text-text-muted">
        <ShieldCheck size={11} />
        Pokrycie {synthesis.confidence.coverage}% · świeżość {synthesis.confidence.freshness}%
      </footer>
    </Card>
  );
}

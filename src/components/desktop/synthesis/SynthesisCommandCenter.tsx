import type {
  DecisionCandidate,
  DomainTrajectory,
  SparkySynthesis,
  SynthesisDomain,
} from '@vanguard/domain';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Check, Clock3, X } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

const domainLabel: Partial<Record<SynthesisDomain, string>> = {
  recovery: 'Regeneracja',
  training: 'Trening',
  nutrition: 'Żywienie',
  execution: 'Wykonanie',
  medical: 'Zdrowie',
  calendar: 'Kalendarz',
};

const trajectoryView: Record<DomainTrajectory, { label: string; tone: string; icon: typeof ArrowRight }> = {
  improving: { label: 'rośnie', tone: 'text-success', icon: ArrowUpRight },
  stable: { label: 'stabilnie', tone: 'text-text-secondary', icon: ArrowRight },
  declining: { label: 'spada', tone: 'text-danger', icon: ArrowDownRight },
  volatile: { label: 'niestabilnie', tone: 'text-warning', icon: AlertTriangle },
  insufficient_data: { label: 'mało danych', tone: 'text-text-muted', icon: ArrowRight },
};

interface Props {
  synthesis: SparkySynthesis;
  healthspan?: {
    ageRange: { low: number; high: number };
    pace: number | null;
    recentScore: number;
    baselineScore: number;
    coverage: number;
  };
  onDecision: (
    candidate: DecisionCandidate,
    decision: 'accept' | 'dismiss' | 'complete' | 'snooze',
  ) => void;
}

const supportsDecision = (candidate: DecisionCandidate) => (
  candidate.source === 'todo'
  || candidate.source === 'system_proposal'
  || candidate.source === 'oracle_recommendation'
  || candidate.source === 'medical_prevention'
  || candidate.source === 'healthspan'
);

const positiveDecision = (candidate: DecisionCandidate) => (
  candidate.source === 'todo' || candidate.source === 'medical_prevention' ? 'complete' : 'accept'
);

export default function SynthesisCommandCenter({ synthesis, healthspan, onDecision }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-custom bg-surface shadow-sm">
      <header className="grid gap-px bg-border-custom xl:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
        <div className="bg-surface p-5">
          <p className="text-2xs font-black uppercase tracking-widest text-primary">Synteza Sparky</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Centrum decyzji</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{synthesis.summary}</p>
        </div>
        <Metric label="Stan" value={synthesis.overallState} />
        <Metric label="Największe ryzyko" value={synthesis.topRisk ?? 'brak'} />
        <Metric label="Wiarygodność" value={`${synthesis.confidence.overall}% pewności`} />
      </header>

      {healthspan && (
        <div className="grid gap-px border-t border-border-custom bg-border-custom sm:grid-cols-4">
          <Metric label="Wiek funkcjonalny" value={`${healthspan.ageRange.low}–${healthspan.ageRange.high} lat`} />
          <Metric
            label="Tempo Healthspan"
            value={healthspan.pace == null ? 'Kalibracja' : `${healthspan.pace.toFixed(2)}×`}
          />
          <Metric label="Zmiana wyniku" value={`${healthspan.recentScore} vs ${healthspan.baselineScore}`} />
          <Metric label="Pokrycie danych" value={`${healthspan.coverage}%`} />
        </div>
      )}

      <div className="grid gap-5 p-5 2xl:grid-cols-3">
        <div className="space-y-4">
          <PanelTitle>Trajektorie domen</PanelTitle>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(synthesis.trajectories).map(([domain, trajectory]) => {
              const view = trajectoryView[trajectory];
              const Icon = view.icon;
              return (
                <div key={domain} className="rounded-xl bg-surface-2 px-3 py-2.5">
                  <p className="text-3xs font-bold uppercase tracking-wide text-text-muted">
                    {domainLabel[domain as SynthesisDomain]}
                  </p>
                  <p className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${view.tone}`}>
                    <Icon size={14} /> {view.label}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-3xs text-text-muted">
            Pokrycie {synthesis.confidence.coverage}% · świeżość {synthesis.confidence.freshness}%
          </p>
        </div>

        <div className="space-y-4">
          <PanelTitle>Trzy dźwignie</PanelTitle>
          <div className="space-y-2">
            {synthesis.levers.map((lever, index) => (
              <article key={lever.id} className="flex items-center gap-3 rounded-xl border border-border-custom px-3 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{lever.title}</p>
                  <p className="text-3xs text-text-muted">
                    {domainLabel[lever.domain]} · priorytet {lever.score ?? '—'}
                  </p>
                </div>
                {supportsDecision(lever) && (
                  <div className="flex gap-1">
                    {lever.source !== 'todo' && (
                      <Pressable
                        aria-label={`Odrzuć: ${lever.title}`}
                        onClick={() => onDecision(lever, 'dismiss')}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <X size={15} />
                      </Pressable>
                    )}
                    {lever.source === 'medical_prevention' && (
                      <Pressable
                        aria-label={`Odłóż: ${lever.title}`}
                        onClick={() => onDecision(lever, 'snooze')}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Clock3 size={15} />
                      </Pressable>
                    )}
                    <Pressable
                      aria-label={`Zatwierdź: ${lever.title}`}
                      onClick={() => onDecision(lever, positiveDecision(lever))}
                      className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                    >
                      <Check size={15} />
                    </Pressable>
                  </div>
                )}
              </article>
            ))}
            {!synthesis.levers.length && (
              <p className="rounded-xl bg-surface-2 p-4 text-sm text-text-muted">Brak pilnych ruchów.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <PanelTitle>Dlaczego teraz</PanelTitle>
          <div className="space-y-2">
            {synthesis.factors.slice(0, 3).map((factor) => (
              <article key={factor.id} className="rounded-xl bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold">{factor.title}</p>
                  <span className={factor.direction === 'positive' ? 'text-success' : 'text-danger'}>
                    {factor.score ?? '—'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{factor.evidence}</p>
              </article>
            ))}
          </div>
          {synthesis.conflicts.slice(0, 2).map((conflict) => (
            <article key={conflict.id} className="rounded-xl border border-warning/20 bg-warning/[0.05] p-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <AlertTriangle size={14} className="text-warning" /> {conflict.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {conflict.recommendedResolution}
              </p>
            </article>
          ))}
        </div>
      </div>
      <CandidateQueue candidates={synthesis.candidates} />
      <RecommendationOutcomes outcomes={synthesis.recommendationOutcomes} />
    </section>
  );
}

const outcomeLabel = {
  success: 'Sprawdziło się',
  fail: 'Nie zadziałało',
  inconclusive: 'Niejednoznaczne',
  no_data: 'Brak danych',
} as const;

function CandidateQueue({ candidates }: { candidates: DecisionCandidate[] }) {
  if (!candidates.length) return null;
  return (
    <div className="border-t border-border-custom px-5 py-4">
      <PanelTitle>Jedna kolejka kandydatów</PanelTitle>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {candidates.slice(0, 8).map((candidate) => (
          <div key={candidate.id} className="min-w-56 rounded-xl border border-border-custom px-3 py-2.5">
            <p className="text-3xs font-bold uppercase tracking-wide text-text-muted">
              {domainLabel[candidate.domain]} · {candidate.source.replaceAll('_', ' ')}
            </p>
            <p className="mt-1 truncate text-sm font-bold">{candidate.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationOutcomes({ outcomes }: { outcomes: SparkySynthesis['recommendationOutcomes'] }) {
  if (!outcomes.length) return null;
  return (
    <div className="border-t border-border-custom px-5 py-4">
      <PanelTitle>Rozliczone rekomendacje</PanelTitle>
      <div className="mt-3 grid gap-2 xl:grid-cols-3">
        {outcomes.slice(0, 3).map((item) => (
          <article key={item.id} className="rounded-xl bg-surface-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold">{item.title}</p>
              <span className={`shrink-0 text-3xs font-black uppercase ${
                item.outcome === 'success' ? 'text-success' : item.outcome === 'fail' ? 'text-danger' : 'text-text-muted'
              }`}>
                {outcomeLabel[item.outcome]}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{item.explanation}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="text-3xs font-black uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-bold leading-snug text-text-primary">{value}</p>
    </div>
  );
}

function PanelTitle({ children }: { children: string }) {
  return <h3 className="text-2xs font-black uppercase tracking-widest text-text-muted">{children}</h3>;
}

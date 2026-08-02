import {
  HEALTHSPAN_METHODOLOGY,
  type FunctionalAgeProfile,
  type HealthspanPace,
  type HealthspanSource,
} from '@vanguard/domain';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Database, ShieldCheck } from 'lucide-react';
import type { HealthspanToday } from '../../../lib/healthspanProjection';

const sourceLabel: Record<HealthspanSource, string> = {
  garmin: 'Garmin',
  oura: 'Oura',
  sparky: 'Sparky',
  manual: 'Wpis ręczny',
};

const paceView = {
  improving: { label: 'korzystniejszy trend', icon: ArrowDownRight, tone: 'text-success' },
  stable: { label: 'stabilny trend', icon: ArrowRight, tone: 'text-text-secondary' },
  worsening: { label: 'mniej korzystny trend', icon: ArrowUpRight, tone: 'text-warning' },
  unknown: { label: 'trwa kalibracja', icon: ArrowRight, tone: 'text-text-muted' },
} as const;

interface Props {
  profile: FunctionalAgeProfile;
  pace: HealthspanPace;
  today?: HealthspanToday;
}

export default function HealthspanProfilePanel({ profile, pace, today }: Props) {
  const paceMeta = paceView[pace.direction];
  const PaceIcon = paceMeta.icon;
  const positive = profile.contributors.filter((item) => item.direction === 'positive');
  const opportunities = profile.contributors.filter((item) => item.direction === 'opportunity');
  const methodologySources = [...new Map(
    profile.contributors.map((item) => {
      const source = HEALTHSPAN_METHODOLOGY[item.key];
      return [source.sourceUrl, source] as const;
    }),
  ).values()];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-surface-1">
        <div className="grid gap-px bg-white/10 sm:grid-cols-3">
          <div className="bg-surface-1 p-5 sm:col-span-2">
            <p className="text-2xs font-black uppercase tracking-widest text-primary">Healthspan Intelligence</p>
            <h2 className="mt-2 text-2xl font-light tracking-tight">Wiek funkcjonalny</h2>
            <p className="mt-3 text-4xl font-light tracking-tight text-white">
              {profile.ageRange.low}–{profile.ageRange.high} lat
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Estymata centralna {profile.estimatedAge} · wiek chronologiczny {profile.chronologicalAge}
            </p>
          </div>
          <div className="bg-surface-1 p-5">
            <p className="text-2xs font-bold uppercase tracking-widest text-text-muted">Tempo zmian</p>
            <p className="mt-3 text-3xl font-light">
              {pace.multiplier == null ? 'Kalibracja' : `${pace.multiplier.toFixed(2)}×`}
            </p>
            <p className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${paceMeta.tone}`}>
              <PaceIcon size={14} /> {paceMeta.label}
            </p>
          </div>
        </div>
        <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-3">
          <Stat label="Healthspan score" value={`${profile.score}/100`} />
          <Stat label="Pewność" value={`${profile.confidence.overall}%`} />
          <Stat label="Pokrycie danych" value={`${profile.confidence.coverage}%`} />
        </div>
        {today && (
          <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2">
            <div className="bg-surface-1 p-4">
              <p className="text-3xs font-bold uppercase tracking-widest text-text-muted">Pojemność dzisiaj</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {today.capacity.score == null ? 'Brak danych' : `${today.capacity.score}/100 · ${today.capacity.state}`}
              </p>
              {today.capacity.limiter && <p className="text-xs text-text-muted">Limiter: {today.capacity.limiter}</p>}
            </div>
            <div className="bg-surface-1 p-4">
              <p className="text-3xs font-bold uppercase tracking-widest text-text-muted">Wsparcie snu</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {today.sleepSupport.score == null ? 'Brak danych' : `${today.sleepSupport.score}/100 · ${today.sleepSupport.label}`}
              </p>
            </div>
          </div>
        )}
      </section>

      <ContributorSection title="Pozytywne czynniki" contributors={positive} />
      <ContributorSection title="Możliwości poprawy" contributors={opportunities} />

      {pace.confounders.length > 0 && (
        <section className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <p className="text-xs font-bold text-warning">Kontekst ostatniego trendu</p>
          <p className="mt-1 text-sm text-text-secondary">
            {pace.confounders.join(', ')} może tymczasowo zmieniać Tempo. Pewność: {pace.confidence}%.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-surface-1 p-4">
        <h3 className="text-sm font-bold text-white">Metodologia</h3>
        <div className="mt-3 grid gap-3 text-xs leading-relaxed text-text-secondary sm:grid-cols-2">
          <p>
            <strong className="text-text-primary">Wiek funkcjonalny:</strong> wiek chronologiczny skorygowany
            ograniczonym wpływem wydolności, RHR, snu, ruchu, siły, składu ciała, stresu i stylu życia.
          </p>
          <p>
            <strong className="text-text-primary">Tempo:</strong> odporny trend tygodniowych median z minimum
            12 tygodni tej samej wersji modelu. Do tego czasu wynik pokazuje uczciwą kalibrację.
          </p>
          <p>
            <strong className="text-text-primary">Pierwszeństwo źródeł:</strong> świeży Garmin dla VO₂ i stref,
            Oura dla snu i regeneracji, Sparky dla siły i ciała. Check-in tylko uzupełnia braki.
          </p>
          <p>
            <strong className="text-text-primary">Dźwignie:</strong> maksymalnie trzy największe możliwości.
            Sukces oznacza poprawę wyniku względem zapisanej bazy, nie dowód przyczynowości.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
          {methodologySources.map((source) => (
            <a
              key={source.sourceUrl}
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/5 px-2 py-1 text-2xs font-semibold text-primary hover:bg-white/10"
            >
              {source.sourceTitle} · {source.evidenceClass}
            </a>
          ))}
        </div>
      </section>

      <footer className="rounded-2xl border border-white/10 p-4 text-xs leading-relaxed text-text-muted">
        <p className="flex items-center gap-2 font-bold text-text-secondary">
          <ShieldCheck size={14} /> Jak czytać ten wynik
        </p>
        <p className="mt-2">
          To transparentna estymata wellness oparta na dostępnych sygnałach, nie pomiar wieku biologicznego,
          diagnoza ani prognoza długości życia. Model {profile.modelVersion}.
        </p>
      </footer>
    </div>
  );
}

function ContributorSection({
  title,
  contributors,
}: {
  title: string;
  contributors: FunctionalAgeProfile['contributors'];
}) {
  if (!contributors.length) return null;
  return (
    <section>
      <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-text-muted">{title}</h3>
      <div className="space-y-2">
        {contributors.map((item) => (
          <article key={item.key} className="rounded-2xl border border-white/10 bg-surface-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-text-muted">{item.benchmark}</p>
              </div>
              <div className="text-right">
                <p className={item.ageImpactYears <= 0 ? 'font-bold text-success' : 'font-bold text-warning'}>
                  {item.ageImpactYears > 0 ? '+' : ''}{item.ageImpactYears.toFixed(1)} roku
                </p>
                <p className="mt-1 text-2xs text-text-muted">{item.score}/100</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-2xs text-text-muted">
              <span className="flex items-center gap-1"><Database size={11} /> {sourceLabel[item.source]}</span>
              <span>{item.value}</span>
              <span>{item.sampleCount} pomiarów</span>
              <span>{item.measuredAt}</span>
              <span>{item.confidence}% pewności</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <p className="text-3xs font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

import { buildHealthDirection } from '../../../lib/biometrics/healthDirection';
import { buildScoreRings } from '../../../lib/biometrics/ouraScoreBands';
import { formatShortDateWarsaw, getTodayWarsaw } from '../../../lib/date';
import { OuraBaselineSection } from './OuraBaselineSection';
import { OuraContextSection } from './OuraContextSection';
import { OuraDayNightSection } from './OuraDayNightSection';
import { OuraPersonalEvidence } from './OuraPersonalEvidence';
import { OuraScoreRings } from './OuraScoreRings';
import { OuraSleepRegularitySection } from './OuraSleepRegularitySection';
import type { OuraHealthHubData } from './types';

interface OuraOverviewViewProps {
  data: OuraHealthHubData;
  onOpenSleep: () => void;
  onOpenVitals: () => void;
}

export function OuraOverviewView({ data, onOpenSleep, onOpenVitals }: OuraOverviewViewProps) {
  const asOf = data.date ?? data.oura?.date ?? data.enhanced?.date ?? getTodayWarsaw();
  const direction = buildHealthDirection({
    asOf,
    summaries: [...(data.ouraHistory ?? []), ...(data.oura ? [data.oura] : [])],
    enhanced: [...(data.enhancedHistory ?? []), ...(data.enhanced ? [data.enhanced] : [])],
  });
  const currentRange = `${formatShortDateWarsaw(direction.currentStart)}–${formatShortDateWarsaw(asOf)}`;
  const previousRange = `${formatShortDateWarsaw(direction.previousStart)}–${formatShortDateWarsaw(direction.previousEnd)}`;

  return (
    <div className="space-y-8">
      <section className="space-y-5" aria-labelledby="health-direction-title">
        <header>
          <p className="text-sm text-text-muted">Przegląd zdrowia · pomiary do {asOf}</p>
          <h1 id="health-direction-title" className="mt-2 text-3xl font-light tracking-tight sm:text-4xl">Twój kierunek</h1>
        </header>
        <div className="rounded-2xl border border-white/10 bg-surface-tonal p-5 sm:p-6">
          <p className="text-xs uppercase tracking-wider text-info">Tydzień do tygodnia</p>
          <h2 className="mt-3 text-2xl font-light leading-snug">{direction.headline}</h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {currentRange} wobec {previousRange}. Porównujemy średnie z zapisanych dni.
            Potrzeba co najmniej 4 dni z pomiarem w każdym tygodniu, osobno dla każdego wskaźnika.
          </p>
        </div>
        <OuraScoreRings
          rings={buildScoreRings({
            asOf,
            summaries: [...(data.ouraHistory ?? []), ...(data.oura ? [data.oura] : [])],
            enhanced: [...(data.enhancedHistory ?? []), ...(data.enhanced ? [data.enhanced] : [])],
            strainScore: data.strainRow?.strain_score,
          })}
          onOpenSleep={onOpenSleep}
          onOpenVitals={onOpenVitals}
        />
        <p className="text-xs leading-5 text-text-muted">Zmiana opisuje pomiary, sama nie przesądza o poprawie zdrowia. Strzałki pokazują różnicę względem średniej z 7 dni, nie jej przyczynę.</p>
      </section>

      {data.userId && <OuraBaselineSection userId={data.userId} asOf={asOf} />}

      {data.userId && <OuraDayNightSection data={data} latestNight={asOf} />}

      {data.userId && <OuraSleepRegularitySection userId={data.userId} />}

      <section className="space-y-4" aria-labelledby="health-context-title">
        <div>
          <h2 id="health-context-title" className="text-2xl font-light">Dzień → noc → regeneracja</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Aktywność, jedzenie, kofeina i ekran tworzą kontekst pomiarów. Osobiste zależności poniżej pomagają sprawdzić, co powtarza się u Ciebie.</p>
        </div>
        {data.nightContext ? <OuraContextSection context={data.nightContext} title="Przed ostatnią nocą"
          subtitle={`Dzień ${data.nightContext.date} → noc zakończona ${asOf}. Kofeina jest szacunkiem z wpisów jedzenia; godziny dotyczą zapisów.`} />
          : <p className="rounded-xl border border-white/5 bg-surface-1 p-5 text-sm text-text-muted">Brak kontekstu dnia poprzedzającego ostatnią noc. Nie można przypisać zmiany snu konkretnemu zachowaniu.</p>}
      </section>

      <OuraPersonalEvidence data={data} />

      {data.todayContext && <OuraContextSection context={data.todayContext} title="Kontekst bieżącego dnia"
        subtitle={`Zapisy z ${data.todayContext.date}. Dzień może być niepełny. To kontekst kolejnej nocy, nie wyjaśnienie poprzedniej. Kofeina jest szacowana; godziny dotyczą wpisów.`} />}
    </div>
  );
}

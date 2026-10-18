import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react';
import { buildHealthDirection } from '../../../lib/biometrics/healthDirection';
import { formatShortDateWarsaw, getTodayWarsaw } from '../../../lib/date';
import { OuraContextSection } from './OuraContextSection';
import { OuraPersonalEvidence } from './OuraPersonalEvidence';
import type { OuraHealthHubData } from './types';
import Button from '../../ui/Button';

interface OuraOverviewViewProps {
  data: OuraHealthHubData;
  onOpenSleep: () => void;
  onOpenVitals: () => void;
}

const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

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
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {direction.metrics.map(metric => {
            const Icon = metric.delta == null || metric.delta === 0 ? Minus : metric.delta > 0 ? ArrowUpRight : ArrowDownRight;
            const deltaText = metric.delta == null ? 'Za mało danych'
              : `${metric.delta > 0 ? '+' : ''}${number.format(metric.delta)} ${metric.unit}`;
            return (
              <Button key={metric.key} variant="ghost" onClick={metric.key === 'sleep' ? onOpenSleep : onOpenVitals}
                className="block min-w-0 !rounded-xl !border !border-white/5 !bg-surface-1 !p-3 text-left !font-normal !text-text-primary transition-colors hover:!bg-surface-2 sm:!p-5">
                <span className="flex items-center justify-between gap-2 text-xs text-text-secondary sm:text-sm">{metric.label}<ChevronRight size={16} className="hidden shrink-0 sm:block" aria-hidden="true" /></span>
                <span className="mt-3 block text-3xl font-light tabular-nums">{metric.latest == null ? '—' : number.format(metric.latest)}<span className="ml-1 text-sm text-text-muted">{metric.unit}</span></span>
                <span className="mt-1 hidden text-xs text-text-muted sm:block">Pomiar {asOf}</span>
                <span className="mt-4 flex items-start gap-1 text-xs text-info sm:mt-5 sm:gap-1.5 sm:text-sm"><Icon size={16} className="shrink-0" aria-hidden="true" /><span>{deltaText}{metric.delta != null && <span className="hidden sm:inline"> tydzień do tygodnia</span>}</span></span>
                <span className="mt-2 block text-xs leading-5 text-text-muted">
                  Średnia: {metric.previous == null ? '—' : number.format(metric.previous)} → {metric.current == null ? '—' : number.format(metric.current)} {metric.unit}<br />
                  Dni z pomiarem: {metric.previousCount}/7 → {metric.currentCount}/7
                </span>
              </Button>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-text-muted">Zmiana HRV opisuje pomiary, sama nie przesądza o poprawie zdrowia. Strzałki pokazują zmianę średniej, nie jej przyczynę.</p>
      </section>

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

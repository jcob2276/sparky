import { Activity, BedDouble, Flame, HeartPulse, Moon, Sprout } from 'lucide-react';
import type { OuraHealthHubData } from './types';
import { OuraContextSection } from './OuraContextSection';
import Button from '../../ui/Button';

interface OuraTodayViewProps {
  data: OuraHealthHubData;
  onOpenSleep: () => void;
}

function scoreStatus(score: number | null | undefined): string {
  if (score == null) return 'Brak danych';
  if (score >= 85) return 'Optymalny';
  if (score >= 70) return 'Dobry';
  return 'Wymaga uwagi';
}

export function OuraTodayView({ data, onOpenSleep }: OuraTodayViewProps) {
  const readiness = data.oura?.readiness_score;
  const sleep = data.enhanced?.sleep_score ?? data.oura?.sleep_score;
  const activity = data.enhanced?.activity_score;
  const stressMinutes = data.enhanced?.stress_high_minutes;
  const recoveryMinutes = data.enhanced?.recovery_high_minutes;
  const shortcuts = [
    { label: 'Gotowość', value: readiness, icon: Sprout, color: 'text-info' },
    { label: 'Sen', value: sleep, icon: Moon, color: 'text-success', onClick: onOpenSleep },
    { label: 'Aktywność', value: activity, icon: Flame, color: 'text-warning' },
    { label: 'Stres', value: stressMinutes, icon: Activity, color: 'text-primary', suffix: 'm' },
    { label: 'Serce', value: data.oura?.rhr_avg, icon: HeartPulse, color: 'text-danger', suffix: ' bpm' },
  ];

  return (
    <div className="space-y-5">
      <div className="oura-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {shortcuts.map(({ color, icon: Icon, label, onClick, suffix = '', value }) => (
          <Button
            key={label}
            className="!min-h-24 !min-w-24 !flex-col !rounded-full border border-white/10 !bg-transparent !px-3 !py-3 text-center"
            onClick={onClick}
            variant="ghost"
          >
            <Icon className={`mx-auto ${color}`} size={21} strokeWidth={1.7} />
            <p className="mt-2 text-2xl font-light text-white">{value ?? '—'}{value != null ? suffix : ''}</p>
            <p className="mt-1 text-xs text-text-secondary">{label}</p>
          </Button>
        ))}
      </div>

      <section className="oura-hero relative min-h-80 overflow-hidden rounded-xl border border-white/5 p-7 text-center">
        <div className="absolute inset-x-10 top-10 h-40 rounded-full bg-info/10 blur-3xl" />
        <Sprout className="relative mx-auto text-info" size={31} strokeWidth={1.4} />
        {readiness != null ? (
          <>
            <p className="relative mt-3 text-7xl font-extralight tracking-tighter text-text-primary">{readiness}</p>
            <p className="relative mt-2 text-xs font-semibold uppercase tracking-widest text-info">Gotowość na dziś</p>
            <h2 className="relative mt-6 text-4xl font-light text-text-primary">{scoreStatus(readiness)}</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm leading-6 text-text-secondary">
              Wynik pochodzi z pomiarów Oura dla {data.date ?? 'wybranego dnia'}.
            </p>
          </>
        ) : (
          <div className="relative py-10">
            <h2 className="text-xl text-white">Brak wyniku gotowości dla tego dnia</h2>
            <p className="mt-2 text-sm text-text-secondary">Pozostałe dostępne pomiary nadal są widoczne poniżej.</p>
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="!block !rounded-xl border border-white/5 !bg-surface-2 !p-5 text-left"
          onClick={onOpenSleep}
          variant="ghost"
        >
          <BedDouble className="text-success" size={23} />
          <p className="mt-8 text-sm text-text-secondary">Sen</p>
          <p className="mt-1 text-2xl font-light text-white">{scoreStatus(sleep)}</p>
          <p className="mt-2 text-sm text-text-muted">Otwórz dokładny przebieg nocy</p>
        </Button>
        <article className="rounded-xl border border-white/5 bg-surface-2 p-5">
          <Activity className="text-primary" size={23} />
          <p className="mt-8 text-sm text-text-secondary">Stres i odnowa</p>
          <p className="mt-1 text-2xl font-light text-white">
            {stressMinutes ?? '—'} min / {recoveryMinutes ?? '—'} min
          </p>
          <p className="mt-2 text-sm text-text-muted">Napięcie / regeneracja</p>
        </article>
      </div>
      <OuraContextSection context={data.todayContext ?? data.context} title="Kontekst dnia" />
    </div>
  );
}

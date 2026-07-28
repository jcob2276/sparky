import { Activity, BedDouble, Flame, HeartPulse, Moon, Sprout } from 'lucide-react';
import type { OuraHealthHubData } from './types';

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
    { label: 'Gotowość', value: readiness, icon: Sprout, color: 'text-sky-300' },
    { label: 'Sen', value: sleep, icon: Moon, color: 'text-emerald-300', onClick: onOpenSleep },
    { label: 'Aktywność', value: activity, icon: Flame, color: 'text-orange-300' },
    { label: 'Stres', value: stressMinutes, icon: Activity, color: 'text-violet-300', suffix: 'm' },
    { label: 'Serce', value: data.oura?.rhr_avg, icon: HeartPulse, color: 'text-rose-300', suffix: ' bpm' },
  ];

  return (
    <div className="space-y-5">
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {shortcuts.map(({ color, icon: Icon, label, onClick, suffix = '', value }) => (
          <button
            key={label}
            className="min-h-28 min-w-24 rounded-3xl border border-white/5 bg-white/[0.035] px-3 py-4 text-center active:scale-[0.97]"
            onClick={onClick}
            type="button"
          >
            <Icon className={`mx-auto ${color}`} size={21} strokeWidth={1.7} />
            <p className="mt-2 text-2xl font-light text-white">{value ?? '—'}{value != null ? suffix : ''}</p>
            <p className="mt-1 text-xs text-slate-400">{label}</p>
          </button>
        ))}
      </div>

      <section className="relative overflow-hidden rounded-[34px] border border-sky-300/10 bg-gradient-to-b from-sky-900/70 via-slate-900 to-slate-950 p-7 text-center">
        <div className="absolute inset-x-10 top-10 h-40 rounded-full bg-sky-400/10 blur-3xl" />
        <Sprout className="relative mx-auto text-sky-200" size={31} strokeWidth={1.4} />
        {readiness != null ? (
          <>
            <p className="relative mt-3 text-7xl font-extralight tracking-tighter text-white">{readiness}</p>
            <p className="relative mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Gotowość na dziś</p>
            <h2 className="relative mt-6 text-3xl font-light text-white">{scoreStatus(readiness)}</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">
              Wynik pochodzi z pomiarów Oura dla {data.date ?? 'wybranego dnia'}.
            </p>
          </>
        ) : (
          <div className="relative py-10">
            <h2 className="text-xl text-white">Brak wyniku gotowości dla tego dnia</h2>
            <p className="mt-2 text-sm text-slate-400">Pozostałe dostępne pomiary nadal są widoczne poniżej.</p>
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-[28px] border border-white/5 bg-white/[0.045] p-5 text-left active:scale-[0.98]"
          onClick={onOpenSleep}
          type="button"
        >
          <BedDouble className="text-emerald-300" size={23} />
          <p className="mt-8 text-sm text-slate-400">Sen</p>
          <p className="mt-1 text-2xl font-light text-white">{scoreStatus(sleep)}</p>
          <p className="mt-2 text-sm text-slate-500">Otwórz dokładny przebieg nocy</p>
        </button>
        <article className="rounded-[28px] border border-white/5 bg-white/[0.045] p-5">
          <Activity className="text-violet-300" size={23} />
          <p className="mt-8 text-sm text-slate-400">Stres i odnowa</p>
          <p className="mt-1 text-2xl font-light text-white">
            {stressMinutes ?? '—'} min / {recoveryMinutes ?? '—'} min
          </p>
          <p className="mt-2 text-sm text-slate-500">Napięcie / regeneracja</p>
        </article>
      </div>
    </div>
  );
}

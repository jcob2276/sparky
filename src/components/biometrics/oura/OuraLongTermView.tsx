import { HeartPulse, Moon, Sparkles, TrendingUp } from 'lucide-react';
import type { OuraHealthHubData } from './types';

function average(values: Array<number | null>): number | null {
  const measured = values.filter((entry): entry is number => entry != null);
  if (measured.length === 0) return null;
  return Math.round(measured.reduce((sum, entry) => sum + entry, 0) / measured.length);
}

export function OuraLongTermView({ data }: { data: OuraHealthHubData }) {
  const recent = (data.ouraHistory ?? []).slice(-14);
  const sleepAverage = average(recent.map((day) => day.sleep_score));
  const readinessAverage = average(recent.map((day) => day.readiness_score));
  const hrvAverage = average(recent.map((day) => day.hrv_avg));
  const calibrating = recent.length < 7;
  const areas = [
    { icon: Moon, label: 'Zdrowie snu', value: sleepAverage, color: 'text-emerald-300' },
    { icon: Sparkles, label: 'Regeneracja', value: readinessAverage, color: 'text-sky-300' },
    { icon: HeartPulse, label: 'Zdrowie serca', value: hrvAverage, suffix: ' ms', color: 'text-rose-300' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">Perspektywa długoterminowa</p>
        <h2 className="mt-1 text-3xl font-light text-white">Moje zdrowie</h2>
      </header>
      <section className="overflow-hidden rounded-[34px] border border-white/5 bg-gradient-to-br from-sky-950 via-slate-900 to-emerald-950/60 p-6">
        <TrendingUp className="text-sky-300" size={26} />
        <h3 className="mt-8 text-2xl font-light text-white">
          {calibrating ? 'Trwa kalibracja' : 'Twój obraz z ostatnich 14 dni'}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Dostępne dni: {recent.length}/14. Oceny powstają wyłącznie z zapisanych pomiarów.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {areas.map(({ color, icon: Icon, label, suffix = '', value }) => (
          <article key={label} className="min-h-48 rounded-[28px] border border-white/5 bg-white/[0.045] p-5">
            <Icon className={color} size={23} />
            <p className="mt-10 text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-light text-white">
              {value == null ? 'Kalibracja' : `${value}${suffix}`}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

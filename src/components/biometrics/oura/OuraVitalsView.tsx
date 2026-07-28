import { Activity, Footprints, Gauge, HeartPulse, Moon, Thermometer } from 'lucide-react';
import { OuraMetricCard } from './OuraMetricCard';
import type { OuraHealthHubData } from './types';

interface OuraVitalsViewProps {
  data: OuraHealthHubData;
  onOpenSleep: () => void;
}

const value = (input: number | null | undefined, suffix = '') =>
  input == null ? 'Brak danych' : `${Math.round(input)}${suffix}`;

export function OuraVitalsView({ data, onOpenSleep }: OuraVitalsViewProps) {
  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-slate-500">{data.date ?? 'Ostatni dostępny dzień'}</p>
        <h2 className="mt-1 text-3xl font-light text-white">Parametry życiowe</h2>
      </header>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-slate-200">
          <Activity size={20} className="text-sky-300" /> Gotowość
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="blue" icon={Gauge} label="Wynik gotowości" status="Bieżący wynik" value={value(data.oura?.readiness_score)} />
          <OuraMetricCard accent="green" icon={HeartPulse} label="HRV" status="Średnia nocna" value={value(data.oura?.hrv_avg, ' ms')} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-slate-200">
          <Moon size={20} className="text-emerald-300" /> Sen
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="green" icon={Moon} label="Wynik snu" status="Szczegóły nocy" value={value(data.enhanced?.sleep_score ?? data.oura?.sleep_score)} onClick={onOpenSleep} />
          <OuraMetricCard accent="blue" icon={HeartPulse} label="Najniższe tętno" status="Podczas snu" value={value(data.enhanced?.sleep_lowest_heart_rate, ' bpm')} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-slate-200">
          <HeartPulse size={20} className="text-rose-300" /> Metryki podstawowe
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="purple" icon={Thermometer} label="Odchylenie temperatury" value={data.enhanced?.temperature_deviation == null ? 'Brak danych' : `${data.enhanced.temperature_deviation > 0 ? '+' : ''}${data.enhanced.temperature_deviation.toFixed(2)}°C`} />
          <OuraMetricCard accent="orange" icon={Footprints} label="Kroki" value={value(data.oura?.steps)} />
        </div>
      </section>
    </div>
  );
}

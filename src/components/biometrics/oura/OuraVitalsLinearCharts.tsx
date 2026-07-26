/**
 * Displays only measured nightly Oura vitals. Detailed curves are intentionally
 * omitted until real timestamped samples are available.
 */
import type { OuraHealthHubData } from './types';

export function OuraVitalsLinearCharts({ enhanced, oura, ouraHistory }: OuraHealthHubData) {
  const lowestHR = enhanced?.sleep_lowest_heart_rate ?? oura?.rhr_avg ?? null;
  const currentHRV = enhanced?.sleep_average_hrv ?? oura?.hrv_avg ?? null;
  const spo2 = enhanced?.spo2_percentage ?? null;
  const breathRate = enhanced?.sleep_average_breath ?? null;

  const historicalRhr = (ouraHistory ?? [])
    .map((night) => night.rhr_avg)
    .filter((value): value is number => value != null && value > 0);
  const historicalHrv = (ouraHistory ?? [])
    .map((night) => night.hrv_avg)
    .filter((value): value is number => value != null && value > 0);

  const averageRhr = historicalRhr.length > 0
    ? Math.round(historicalRhr.reduce((sum, value) => sum + value, 0) / historicalRhr.length)
    : null;
  const maximumHrv = historicalHrv.length > 0 ? Math.max(...historicalHrv) : null;

  const metrics = [
    { label: 'Saturacja krwi (SpO₂)', value: spo2 != null ? `${spo2}%` : '--' },
    { label: 'Oddech podczas snu', value: breathRate != null ? `${breathRate}/min` : '--' },
    { label: 'Tętno nocne', value: lowestHR != null ? `${lowestHR} bpm` : '--' },
    { label: 'HRV nocne', value: currentHRV != null ? `${currentHRV} ms` : '--' },
    { label: 'Średnie RHR z historii', value: averageRhr != null ? `${averageRhr} bpm` : '--' },
    { label: 'Najwyższe HRV w historii', value: maximumHrv != null ? `${maximumHrv} ms` : '--' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 text-white">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-3xl border border-white/10 bg-slate-900/90 p-4 space-y-1 shadow-xl"
        >
          <p className="text-3xs font-black uppercase tracking-widest text-slate-400">
            {metric.label}
          </p>
          <p className="text-xl font-black text-white">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

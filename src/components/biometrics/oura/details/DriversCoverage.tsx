import { AlertTriangle } from 'lucide-react';
import type { DriverCoverage } from '../../../../lib/biometrics/sleepDrivers/types';
import { DRIVER_META, DRIVER_ORDER } from './driverMeta';

const range = (c: DriverCoverage) =>
  c.firstDate && c.lastDate ? `${c.firstDate} – ${c.lastDate}` : 'brak dat';

/** „Pokrycie danych”: uczciwie, skąd i ile nocy ma każdy czynnik. Tu trafiają też braki. */
export function DriversCoverage({ coverage, noConclusion }: { coverage: DriverCoverage[]; noConclusion: string[] }) {
  if (coverage.length === 0) return null;
  const sorted = [...coverage].sort((a, b) => DRIVER_ORDER.indexOf(a.driver) - DRIVER_ORDER.indexOf(b.driver));
  return (
    <section className="space-y-3" aria-labelledby="drivers-coverage-title">
      <div>
        <h3 id="drivers-coverage-title" className="text-xl font-light text-text-primary">Pokrycie danych</h3>
        <p className="mt-1 text-sm text-text-secondary">Ile nocy mamy dla każdego czynnika. Bez danych nie ma wniosków.</p>
      </div>
      <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-surface-1">
        {sorted.map((item) => (
          <li key={item.driver} className="space-y-1 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-semibold text-text-primary">{DRIVER_META[item.driver].label}</span>
              <span className="text-xs tabular-nums text-text-secondary">{item.n} nocy · {range(item)}</span>
            </div>
            {item.stale && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle size={13} aria-hidden="true" /> Dane nieaktualne
              </p>
            )}
            {item.note && <p className="text-xs leading-5 text-text-muted">{item.note}</p>}
            {noConclusion.includes(item.driver) && (
              <p className="text-xs text-text-muted">Zbyt mało nocy na wniosek.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

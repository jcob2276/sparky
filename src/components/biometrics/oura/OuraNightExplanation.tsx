import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import { buildOuraNightAnalysis } from '../../../lib/biometrics/ouraNightAnalysis';
import type { OuraHealthHubData } from './types';

export function OuraNightExplanation({ data }: { data: OuraHealthHubData }) {
  const history = data.enhancedHistory ?? [];
  const current = data.enhanced ?? null;
  const analysis = buildOuraNightAnalysis(
    current,
    history,
    data.strainRow?.strain_score ?? null,
  );
  const visibleDrivers = analysis.drivers.slice(0, 3);

  return (
    <section className="rounded-xl border border-white/5 bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-info">Co ukształtowało tę noc</p>
          <h3 className="mt-2 text-xl font-light text-white">{analysis.summary}</h3>
        </div>
        <Sparkles className="shrink-0 text-info" size={22} />
      </div>

      {visibleDrivers.length > 0 ? (
        <div className="mt-5 space-y-3">
          {visibleDrivers.map((driver) => {
            const Icon = driver.direction === 'down'
              ? ArrowDown
              : driver.direction === 'up' ? ArrowUp : Minus;
            return (
              <div key={driver.key} className="flex items-center gap-3">
                <Icon
                  className={driver.direction === 'down' ? 'text-warning' : 'text-success'}
                  size={17}
                />
                <span className="flex-1 text-sm text-text-secondary">{driver.label}</span>
                <span className="text-sm text-white">{driver.score}</span>
              </div>
            );
          })}
          <p className="pt-1 text-xs text-text-muted">
            Składowe wyniku Oura — opisują pomiar, nie dowodzą przyczyny.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">
          Kalibracja: Oura nie zwróciła składowych gotowości dla tej nocy.
        </p>
      )}

      <div className="mt-5 border-t border-white/5 pt-4">
        <p className="text-xs uppercase tracking-widest text-text-muted">Jutro · prognoza</p>
        {analysis.forecast.estimate == null ? (
          <p className="mt-2 text-sm text-text-secondary">{analysis.forecast.reason}</p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-light text-white">
              {analysis.forecast.estimate}
              <span className="ml-2 text-sm text-text-muted">
                zakres {analysis.forecast.low}–{analysis.forecast.high}
              </span>
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {analysis.forecast.reason} Pewność: {analysis.forecast.confidence}.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

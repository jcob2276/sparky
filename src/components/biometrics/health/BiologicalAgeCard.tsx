import React from 'react';
import { CheckCircle2, HeartPulse, MinusCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { calculateBiologicalAge } from '@vanguard/domain';

export interface BiologicalAgeCardProps {
  chronologicalAge?: number | null;
  vo2Max?: number | null;
  restingHeartRate?: number | null;
  hrvBaselineMs?: number | null;
  sleepDebtMinutes?: number | null;
  biologicalSex?: 'male' | 'female' | null;
}

export const BiologicalAgeCard: React.FC<BiologicalAgeCardProps> = ({
  chronologicalAge,
  vo2Max,
  restingHeartRate,
  hrvBaselineMs,
  sleepDebtMinutes,
  biologicalSex,
}) => {
  const validAge = chronologicalAge != null && Number.isFinite(chronologicalAge)
    && chronologicalAge >= 18 && chronologicalAge <= 100;
  const validSex = biologicalSex === 'male' || biologicalSex === 'female';
  const result = chronologicalAge != null && validAge && validSex ? calculateBiologicalAge({
    chronologicalAge,
    vo2Max,
    restingHeartRate,
    hrvBaselineMs,
    sleepDebtMinutes,
    biologicalSex,
  }) : null;

  if (!result || result.factors.length === 0) {
    const missing = [
      ...(!validAge ? ['wiek metrykalny'] : []),
      ...(!validSex ? ['płeć biologiczna'] : []),
      ...(result?.factors.length === 0 ? ['pomiary VO2 Max, RHR, HRV lub bilansu snu'] : []),
    ];
    return (
      <section className="space-y-2 rounded-xl border border-border-custom bg-surface-1 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary">Szacowany wiek biologiczny</h3>
        <p className="text-sm text-text-secondary">Oszacowanie niedostępne. Brakuje: {missing.join(', ')}.</p>
        <p className="text-xs text-text-muted">Model wymaga znanego wieku od 18 do 100 lat, płci biologicznej i pomiarów.</p>
      </section>
    );
  }

  const isYounger = result.ageDelta < 0;
  const deltaFormatted = isYounger
    ? `-${Math.abs(result.ageDelta)} lat`
    : result.ageDelta > 0
    ? `+${result.ageDelta} lat`
    : 'Równy wiekowi';

  return (
    <div className="rounded-xl border border-border-custom bg-surface-1 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-info">
            <HeartPulse className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Wiek Biologiczny i Naczyniowy</h3>
            <p className="text-xs text-text-secondary">Szacunek na bazie VO2 Max, RHR, HRV i snu</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            isYounger
              ? 'bg-success/10 text-success border-success/30'
              : result.status === 'optimal'
              ? 'bg-surface-2 text-text-primary border-border-custom'
              : 'bg-warning/10 text-warning border-warning/30'
          }`}
        >
          <Sparkles className="h-3 w-3" />
          {result.statusLabel}
        </span>
      </div>

      {/* Hero Metric Comparison */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
        <div>
          <p className="text-2xs text-text-secondary">Wiek metrykalny</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{result.chronologicalAge} <span className="text-xs font-normal">lat</span></p>
        </div>

        <div className="border-x border-border-custom">
          <p className="text-2xs text-text-secondary">Wiek biologiczny</p>
          <p
            className={`mt-1 text-xl font-bold ${
              isYounger ? 'text-success' : result.ageDelta > 2 ? 'text-warning' : 'text-text-primary'
            }`}
          >
            {result.biologicalAge} <span className="text-xs font-normal">lat</span>
          </p>
        </div>

        <div>
          <p className="text-2xs text-text-secondary">Różnica wieku</p>
          <p
            className={`mt-1 text-xl font-bold ${
              isYounger ? 'text-success' : result.ageDelta > 0 ? 'text-warning' : 'text-text-primary'
            }`}
          >
            {deltaFormatted}
          </p>
        </div>
      </div>

      {/* Biomarker Factors List */}
      {result.factors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">Czynniki kształtujące profil:</p>
          <div className="space-y-1.5">
            {result.factors.map((factor) => {
              const isPositive = factor.status === 'positive';
              const isNegative = factor.status === 'negative';

              return (
                <div
                  key={factor.factor}
                  className="flex items-center justify-between rounded-lg border border-border-custom bg-surface-2/40 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : isNegative ? (
                      <ShieldAlert className="h-3.5 w-3.5 text-warning shrink-0" />
                    ) : (
                      <MinusCircle className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    )}
                    <span className="text-text-primary font-medium">{factor.factor}</span>
                  </div>

                  <span
                    className={`font-semibold ${
                      isPositive ? 'text-success' : isNegative ? 'text-warning' : 'text-text-secondary'
                    }`}
                  >
                    {factor.yearsDelta > 0 ? `+${factor.yearsDelta}` : factor.yearsDelta} l.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-xs leading-relaxed text-text-secondary border-t border-border-custom pt-2">
        {result.summary}
      </p>
    </div>
  );
};

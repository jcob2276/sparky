interface BodyMetricsKpisProps {
  bmi: number | null;
  bmiLabel: string | null;
  bmiBadgeColor: string;
  bf: number | null;
  bfLabel: string | null;
  bfBadgeColor: string;
  latestBodyFat?: number | null;
  whr: number | null;
}

export function BodyMetricsKpis({
  bmi,
  bmiLabel,
  bmiBadgeColor,
  bf,
  bfLabel,
  bfBadgeColor,
  latestBodyFat,
  whr,
}: BodyMetricsKpisProps) {
  if (bmi == null && bf == null && whr == null) return null;

  return (
    <div className="grid grid-cols-3 gap-2 pt-0.5">
      {/* BMI */}
      {bmi != null && (
        <div className="rounded-xl border border-border-custom bg-surface p-2 text-center">
          <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">BMI</p>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">{bmi}</p>
          {bmiLabel && (
            <span className={`inline-block mt-1 text-3xs font-bold px-1.5 py-0.2 rounded border ${bmiBadgeColor}`}>
              {bmiLabel}
            </span>
          )}
        </div>
      )}

      {/* BF% US Navy */}
      {bf != null ? (
        <div className="rounded-xl border border-border-custom bg-surface p-2 text-center">
          <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">BF% (Navy)</p>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">{bf}%</p>
          {bfLabel && (
            <span className={`inline-block mt-1 text-3xs font-bold px-1.5 py-0.2 rounded border ${bfBadgeColor}`}>
              {bfLabel}
            </span>
          )}
        </div>
      ) : latestBodyFat != null ? (
        <div className="rounded-xl border border-border-custom bg-surface p-2 text-center">
          <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">Ostatni BF%</p>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">{latestBodyFat}%</p>
          <span className="inline-block mt-1 text-3xs font-bold px-1.5 py-0.2 rounded border text-text-muted bg-surface-2/40 border-border-custom">
            Zapisany
          </span>
        </div>
      ) : null}

      {/* WHR */}
      {whr != null && (
        <div className="rounded-xl border border-border-custom bg-surface p-2 text-center">
          <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">WHR (T/B)</p>
          <p className="text-sm font-black text-text-primary font-display mt-0.5">{whr}</p>
          <span className={`inline-block mt-1 text-3xs font-bold px-1.5 py-0.2 rounded border ${whr < 0.9 ? 'text-success bg-success/10 border-success/20' : 'text-warning bg-warning/10 border-warning/20'}`}>
            {whr < 0.9 ? 'Optymalny' : 'Uwaga'}
          </span>
        </div>
      )}
    </div>
  );
}

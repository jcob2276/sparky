export function formatHealthSummary(
  summary: Record<string, unknown>,
  foodByDate: Record<string, unknown[]>,
  rawDayLimit: number,
) {
  return `[ZDROWIE/JEDZENIE — AGREGAT 14D + OSTATNIE ${rawDayLimit}D]:
${JSON.stringify({ ...summary, food_products: foodByDate })}`;
}

export function formatStrainContext(
  rows: Array<Record<string, unknown>>,
  wantsFullBiometrics: boolean,
) {
  if (!rows.length) return '[DAILY STRAIN]: brak danych (jeszcze nie policzono).';
  const visible = wantsFullBiometrics ? rows : rows.slice(0, 5);
  const today = rows[0];
  return `[DAILY STRAIN — DANE DETERMINISTYCZNE]:
DZIŚ: Strain ${today?.strain_score ?? '—'}/21, Recovery ${today?.recovery_score ?? '—'}/100, Fueling ${today?.fueling_score ?? '—'}/100, Status ${today?.daily_status ?? '—'}, Limiter: ${today?.main_limiter ?? '—'}.
Green=można obciążać, yellow=ostrożnie, red=regeneracja. Fueling provisional nie jest finalnym wynikiem.
Historia: ${JSON.stringify(visible)}`;
}

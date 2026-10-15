export interface BiologicalAgeInput {
  chronologicalAge: number;
  vo2Max?: number | null;
  restingHeartRate?: number | null;
  hrvBaselineMs?: number | null;
  sleepDebtMinutes?: number | null;
  biologicalSex?: 'male' | 'female' | null;
}

export interface AgeFactorImpact {
  factor: string;
  yearsDelta: number; // e.g. -1.5 (younger) or +2.0 (older)
  label: string;
  status: 'positive' | 'neutral' | 'negative';
}

export interface BiologicalAgeResult {
  chronologicalAge: number;
  biologicalAge: number;
  ageDelta: number; // biologicalAge - chronologicalAge
  status: 'optimal' | 'youthful' | 'elevated' | 'accelerated';
  statusLabel: string;
  factors: AgeFactorImpact[];
  summary: string;
}

/**
 * Calculates Cardiovascular & Biological Age based on clinical biometrics (Bevel Biological Age model)
 */
export function calculateBiologicalAge(input: BiologicalAgeInput): BiologicalAgeResult {
  const chrono = Math.max(18, Math.min(100, Math.round(input.chronologicalAge || 30)));
  const sex = input.biologicalSex || 'male';
  const factors: AgeFactorImpact[] = [];

  let totalYearsAdjustment = 0;

  // 1. VO2 Max Assessment (Strongest clinical correlate of all-cause mortality & biological youth)
  if (typeof input.vo2Max === 'number' && input.vo2Max > 15) {
    // Normal baseline for 30yo: male ~44, female ~38
    const baseExpectedVo2 = sex === 'male' ? Math.max(28, 52 - (chrono - 20) * 0.4) : Math.max(24, 46 - (chrono - 20) * 0.35);
    const vo2Diff = input.vo2Max - baseExpectedVo2;
    
    // Each 3-4 ml/kg/min above expected reduces bio age by ~1 year (capped at +/- 5 years)
    const rawVo2Delta = -(vo2Diff / 3.5);
    const vo2Years = parseFloat(Math.max(-5.0, Math.min(4.0, rawVo2Delta)).toFixed(1));
    totalYearsAdjustment += vo2Years;

    factors.push({
      factor: 'Wydolność tlenowa (VO2 Max)',
      yearsDelta: vo2Years,
      label: vo2Years <= -0.5
        ? `VO2 Max ${input.vo2Max} ml/kg/min odmładza profil o ${Math.abs(vo2Years)} lat`
        : vo2Years >= 0.5
        ? `VO2 Max poniżej normy wiekowej dodaje ${vo2Years} lat`
        : `VO2 Max ${input.vo2Max} ml/kg/min w normie wiekowej`,
      status: vo2Years <= -0.5 ? 'positive' : vo2Years >= 0.5 ? 'negative' : 'neutral',
    });
  }

  // 2. Resting Heart Rate (Cardioprotective autonomic biomarker)
  if (typeof input.restingHeartRate === 'number' && input.restingHeartRate > 35) {
    // Healthy athletic RHR is < 55 bpm, average is ~65-72 bpm, > 75 bpm is elevated
    const rhr = input.restingHeartRate;
    let rhrYears = 0;
    if (rhr < 50) rhrYears = -2.5;
    else if (rhr < 58) rhrYears = -1.5;
    else if (rhr < 68) rhrYears = 0;
    else if (rhr < 76) rhrYears = 1.2;
    else rhrYears = 2.5;

    totalYearsAdjustment += rhrYears;
    factors.push({
      factor: 'Tętno spoczynkowe (RHR)',
      yearsDelta: rhrYears,
      label: rhrYears < 0
        ? `Niskie RHR (${rhr} bpm) wskazuje na silną adaptację mięśnia sercowego (-${Math.abs(rhrYears)} lat)`
        : rhrYears > 0
        ? `Podwyższone RHR (${rhr} bpm) obciąża układ naczyniowy (+${rhrYears} lat)`
        : `RHR ${rhr} bpm w normie fizjologicznej`,
      status: rhrYears < 0 ? 'positive' : rhrYears > 0 ? 'negative' : 'neutral',
    });
  }

  // 3. Heart Rate Variability (HRV - parasympathetic tone)
  if (typeof input.hrvBaselineMs === 'number' && input.hrvBaselineMs > 10) {
    const hrv = input.hrvBaselineMs;
    let hrvYears = 0;
    if (hrv >= 80) hrvYears = -2.0;
    else if (hrv >= 55) hrvYears = -1.0;
    else if (hrv >= 35) hrvYears = 0;
    else if (hrv >= 22) hrvYears = 1.0;
    else hrvYears = 2.0;

    totalYearsAdjustment += hrvYears;
    factors.push({
      factor: 'Zmienność rytmu zatokowego (HRV)',
      yearsDelta: hrvYears,
      label: hrvYears < 0
        ? `Wysoka elastyczność autonomiczna HRV ${hrv} ms (-${Math.abs(hrvYears)} lat)`
        : hrvYears > 0
        ? `Niska modularność układu autonomicznego HRV ${hrv} ms (+${hrvYears} lat)`
        : `HRV ${hrv} ms stabilne`,
      status: hrvYears < 0 ? 'positive' : hrvYears > 0 ? 'negative' : 'neutral',
    });
  }

  // 4. Sleep Debt & Circadian Health
  if (typeof input.sleepDebtMinutes === 'number' && Number.isFinite(input.sleepDebtMinutes)) {
    // Non-positive values (surplus or zero) represent absence of debt.
    const debtMinutes = Math.max(0, input.sleepDebtMinutes);
    const debtHours = debtMinutes / 60;
    let sleepYears = 0;
    if (debtHours <= 1) sleepYears = -0.8;
    else if (debtHours <= 3) sleepYears = 0;
    else if (debtHours <= 6) sleepYears = 1.2;
    else sleepYears = 2.5;

    totalYearsAdjustment += sleepYears;
    factors.push({
      factor: 'Bilans snu i regeneracja',
      yearsDelta: sleepYears,
      label: sleepYears < 0
        ? 'Brak długu snu chroni funkcje kognitywne i naczyniowe (-0.8 lat)'
        : sleepYears > 0
        ? `Nagromadzony dług snu (${debtHours.toFixed(1)}h) nasila stres oksydacyjny (+${sleepYears} lat)`
        : 'Zrównoważony bilans snu',
      status: sleepYears < 0 ? 'positive' : sleepYears > 0 ? 'negative' : 'neutral',
    });
  }

  const bioAge = parseFloat(Math.max(16, (chrono + totalYearsAdjustment)).toFixed(1));
  const ageDelta = parseFloat((bioAge - chrono).toFixed(1));

  let status: 'optimal' | 'youthful' | 'elevated' | 'accelerated' = 'optimal';
  let statusLabel = 'Wiek biologiczny zgodny z metryką';

  if (ageDelta <= -3.0) {
    status = 'youthful';
    statusLabel = `Profil młodszy o ${Math.abs(ageDelta)} lat`;
  } else if (ageDelta < 0) {
    status = 'optimal';
    statusLabel = `Profil młodszy o ${Math.abs(ageDelta)} lat`;
  } else if (ageDelta === 0) {
    status = 'optimal';
    statusLabel = 'Wiek biologiczny zgodny z metryką';
  } else if (ageDelta <= 3.0) {
    status = 'elevated';
    statusLabel = `Profil starszy o +${ageDelta} lat`;
  } else {
    status = 'accelerated';
    statusLabel = `Profil starszy o +${ageDelta} lat (przyspieszone starzenie)`;
  }

  const summary = ageDelta <= 0
    ? `Twój układ sercowo-naczyniowy i regeneracja pracują na poziomie osoby o ${Math.abs(ageDelta)} lat młodszej niż wiek metrykalny (${chrono} l.).`
    : `Wskaźniki wskazują na obciążenie wiekiem biologicznym wyższym o +${ageDelta} lat od metryki. Główne dźwignie poprawy to wydolność tlenowa i dług snu.`;

  return {
    chronologicalAge: chrono,
    biologicalAge: bioAge,
    ageDelta,
    status,
    statusLabel,
    factors,
    summary,
  };
}

import { isRunSport } from '../training/runSports.ts';
import { BodyMetricRow, mergeLatestBodyMetrics, effectiveWaistForNavy, navyBodyFatPct, computeBmi } from './body.ts';
import { DecayedLiftPR, extractLiftPRs } from './lifts.ts';

function ratioToPoints(ratio: number, low: number, mid: number, high: number): number {
  if (ratio <= 0) return 0;
  if (ratio <= low) return Math.max(1, (ratio / low) * 4);
  if (ratio <= mid) return 4 + ((ratio - low) / (mid - low)) * 3;
  if (ratio <= high) return 7 + ((ratio - mid) / (high - mid)) * 2.5;
  return Math.min(10, 9.5 + (ratio - high) * 0.5);
}

export function strengthCapacityScore(
  prs: ReturnType<typeof extractLiftPRs>,
  bodyWeightKg: number | null,
  bodyWeightAsOf?: string | null,
): { score: number; detail: string } {
  const weightNote =
    bodyWeightKg && bodyWeightAsOf ? ` (waga ${bodyWeightKg.toFixed(1)} kg z ${bodyWeightAsOf})` : '';

  if (!bodyWeightKg || bodyWeightKg <= 0) {
    const any = [prs.bench, prs.squat, prs.deadlift].filter(Boolean) as DecayedLiftPR[];
    if (!any.length) return { score: 0, detail: 'Brak zarejestrowanych maxów siłowych.' };
    const avgKg = any.reduce((s, p) => s + p.kg, 0) / any.length;
    const score = Math.min(10, Math.max(1, avgKg / 12));
    return {
      score: Math.round(score * 10) / 10,
      detail: `Maxy (z decay): ${any.map((p) => `${p.label} ${p.rawKg.toFixed(0)} kg`).join(', ')} — brak masy ciała do ratio.`,
    };
  }

  const parts: string[] = [];
  const ratios: number[] = [];
  if (prs.bench) {
    ratios.push(ratioToPoints(prs.bench.kg / bodyWeightKg, 0.75, 1.0, 1.3));
    parts.push(
      `wycisk ${prs.bench.rawKg.toFixed(0)} kg (${(prs.bench.kg / bodyWeightKg).toFixed(2)}×BW${prs.bench.decay < 1 ? `, decay ${Math.round(prs.bench.decay * 100)}%` : ''})`,
    );
  }
  if (prs.squat) {
    ratios.push(ratioToPoints(prs.squat.kg / bodyWeightKg, 1.0, 1.5, 2.0));
    parts.push(`przysiad ${prs.squat.rawKg.toFixed(0)} kg (${(prs.squat.kg / bodyWeightKg).toFixed(2)}×BW)`);
  }
  if (prs.deadlift) {
    ratios.push(ratioToPoints(prs.deadlift.kg / bodyWeightKg, 1.2, 1.8, 2.4));
    parts.push(`martwy ${prs.deadlift.rawKg.toFixed(0)} kg (${(prs.deadlift.kg / bodyWeightKg).toFixed(2)}×BW)`);
  }

  if (!ratios.length) {
    return { score: 0, detail: 'Brak maxów w logu (wycisk / przysiad / martwy).' };
  }

  const score = Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 10) / 10;
  const total = [prs.bench, prs.squat, prs.deadlift]
    .filter(Boolean)
    .reduce((s, p) => s + (p as DecayedLiftPR).kg, 0);
  const totalRatio = total / bodyWeightKg;
  parts.push(`trójbój ~${total.toFixed(0)} kg (${totalRatio.toFixed(2)}×BW z decay)`);

  return {
    score: Math.min(10, Math.max(1, score)),
    detail: `${parts.join(' · ')}. PR starsze niż ~3 lata nie wchodzą.${weightNote}`,
  };
}

export function cooperBestKm(strava: Array<{ best_efforts?: unknown; distance?: number; moving_time?: number; sport_type?: string }>): number | null {
  let best: number | null = null;
  for (const a of strava) {
    const efforts = (a.best_efforts ?? []) as Array<{ name?: string; distance?: number }>;
    for (const e of efforts) {
      const name = (e.name || '').toLowerCase();
      if (name.includes('cooper') || name.includes('12 min') || name.includes('12min')) {
        const km = (e.distance || 0) / 1000;
        if (km > 0 && (best == null || km > best)) best = km;
      }
    }
    const sport = a.sport_type || '';
    if (isRunSport(sport)) {
      const min = (a.moving_time || 0) / 60;
      if (min >= 11.5 && min <= 12.5 && a.distance) {
        const km = a.distance / 1000;
        if (km > 0 && (best == null || km > best)) best = km;
      }
    }
  }
  return best != null ? Math.round(best * 100) / 100 : null;
}

export function cooperToPoints(km: number | null): { score: number; detail: string } {
  if (km == null || km <= 0) {
    return { score: 0, detail: 'Brak testu Coopera / 12 min w Strava.' };
  }
  const score = Math.min(10, Math.max(1, 2 + km * 2.8));
  return {
    score: Math.round(score * 10) / 10,
    detail: `Cooper / 12 min: ${km.toFixed(2)} km → ${score.toFixed(1)} pkt (2,0 km ≈ 4/10, 2,6 km ≈ 7/10).`,
  };
}

export function bodyCompositionBonus(body: BodyRow[], heightCm: number | null): { score: number; detail: string } {
  const merged = mergeLatestBodyMetrics(body);
  if (!merged?.weight || !heightCm) {
    if (!heightCm) {
      return { score: 0, detail: 'Brak wzrostu w profilu żywieniowym — uzupełnij w ustawieniach.' };
    }
    return { score: 0, detail: 'Brak zapisanej wagi — dodaj wagę w Trenerze (Ciało).' };
  }

  const w = merged.weight;
  const bmi = computeBmi(w, heightCm)!;
  const waistNavy = effectiveWaistForNavy(merged);
  const neck = merged.neck;
  const hips = merged.hips;
  const whrWaist = merged.waist ?? merged.belly;
  const whr = whrWaist && hips ? Math.round((whrWaist / hips) * 100) / 100 : null;
  const bf =
    waistNavy && neck
      ? navyBodyFatPct(waistNavy, neck, heightCm)
      : merged.body_fat ?? null;

  const BMI_NORMAL_LOW = 18.5;
  const BMI_NORMAL_HIGH = 24.9;

  let pts = 0;
  const parts: string[] = [];

  if (bmi >= 20 && bmi <= BMI_NORMAL_HIGH) {
    pts += 2;
    parts.push(`BMI ${bmi.toFixed(1)} OK`);
  } else if (bmi >= BMI_NORMAL_LOW && bmi < 20) {
    pts += 1.2;
    parts.push(`BMI ${bmi.toFixed(1)} lekko nisko`);
  } else if (bmi > BMI_NORMAL_HIGH && bmi <= 28) {
    pts += 1;
    parts.push(`BMI ${bmi.toFixed(1)} podwyższone`);
  } else {
    parts.push(`BMI ${bmi.toFixed(1)}`);
  }

  if (whr != null) {
    if (whr < 0.9) {
      pts += 1.5;
      parts.push(`WHR ${whr.toFixed(2)} OK`);
    } else {
      pts += 0.5;
      parts.push(`WHR ${whr.toFixed(2)}`);
    }
  }

  if (bf != null) {
    if (bf <= 15) {
      pts += 2;
      parts.push(`BF ~${bf}% athletic`);
    } else if (bf <= 20) {
      pts += 1.5;
      parts.push(`BF ~${bf}%`);
    } else if (bf <= 25) {
      pts += 0.8;
      parts.push(`BF ~${bf}%`);
    } else {
      parts.push(`BF ~${bf}%`);
    }
  }

  return {
    score: Math.min(4, Math.round(pts * 10) / 10),
    detail: parts.join(' · '),
  };
}

export type BodyRow = BodyMetricRow;

/**
 * Simplified Biology Scores — logic adapted from getbased (AGPL-3.0).
 * Pattern summaries only; not diagnoses.
 * @see https://github.com/elkimek/get-based
 */

import type { MarkerSeries } from '../health/medicalAnalytics';
import { SCORE_MARKER_KEYS, scoreHasEvidence } from '../health/medicalRetestContext';
import { bridgeForMarkerKey, GETBASED_OPTIMAL, toCanonicalValue } from './markerBridge';

import {
  type ScoreTone,
  type BiologyScoreResult,
  type Hit,
  TONE_LABELS,
  clamp,
  lerp,
  resolveScoreTone,
  scoreAgainstRange,
  scoreHighOnly,
  scoreLowOnly,
  getHit,
  finalizeScore,
} from './biologyScoringMath';

export type { ScoreTone, BiologyScoreResult };

function computeIronHandling(seriesByKey: Map<string, MarkerSeries>): BiologyScoreResult | null {
  const ferritin = getHit(seriesByKey, 'ferritin');
  const hgb = getHit(seriesByKey, 'hemoglobin');
  if (!ferritin && !hgb) return null;

  const parts: { hit: Hit; partial: number; weight: number; core?: boolean }[] = [];
  const missing: string[] = [];
  const flags: string[] = [];

  if (ferritin) {
    const partial = Math.min(
      scoreHighOnly(ferritin.value, 300, 800) ?? 0,
      scoreLowOnly(ferritin.value, 30, 5) ?? 0,
    );
    parts.push({ hit: ferritin, partial, weight: 1.15, core: true });
    if (ferritin.value < 30) flags.push('Niski ferrytyna — możliwe wyczerpane zapasy żelaza.');
    if (ferritin.value > 300) flags.push('Wysoki ferrytyna — kontekst stanu zapalnego / przeciążenia.');
  } else missing.push('Ferrytyna');

  if (hgb) {
    parts.push({ hit: hgb, partial: scoreAgainstRange(hgb.value, hgb.range) ?? 50, weight: 0.8, core: true });
  } else missing.push('Hemoglobina');

  const mcv = getHit(seriesByKey, 'mcv');
  if (mcv) parts.push({ hit: mcv, partial: scoreAgainstRange(mcv.value, mcv.range) ?? 50, weight: 0.5 });

  return finalizeScore(
    'ironHandling',
    'Żelazo / krew',
    'Ferrytyna + morfologia',
    'Wzorzec dostępności żelaza (uproszczony Iron Handling z getbased).',
    parts,
    missing,
    flags,
  );
}

function computeLipidPattern(seriesByKey: Map<string, MarkerSeries>): BiologyScoreResult | null {
  const inputs: { key: string; weight: number; core?: boolean; label: string }[] = [
    { key: 'hdl_cholesterol', weight: 1.2, core: true, label: 'HDL' },
    { key: 'ldl_cholesterol_calculated', weight: 1.1, core: true, label: 'LDL' },
    { key: 'triglycerides', weight: 1.0, core: true, label: 'TG' },
    { key: 'cholesterol_total', weight: 0.7, label: 'Chol. całk.' },
    { key: 'non_hdl_cholesterol', weight: 0.8, label: 'Non-HDL' },
  ];
  const parts: { hit: Hit; partial: number; weight: number; core?: boolean }[] = [];
  const missing: string[] = [];
  const flags: string[] = [];

  for (const inp of inputs) {
    const hit = getHit(seriesByKey, inp.key);
    if (!hit) {
      if (inp.core) missing.push(inp.label);
      continue;
    }
    const partial = scoreAgainstRange(hit.value, hit.range) ?? 50;
    if (inp.key === 'ldl_cholesterol_calculated' && hit.range.max != null && hit.value > hit.range.max) {
      flags.push('LDL powyżej optymalnego pasma — kierunek CV do omówienia z lekarzem.');
    }
    parts.push({ hit, partial, weight: inp.weight, core: inp.core });
  }

  if (parts.length === 0) return null;
  return finalizeScore(
    'lipidPattern',
    'Lipidogram',
    'HDL · LDL · TG',
    'Wzorzec lipidowy na zakresach optymalnych getbased.',
    parts,
    missing,
    flags,
  );
}

function computeThyroidContext(seriesByKey: Map<string, MarkerSeries>): BiologyScoreResult | null {
  const tsh = getHit(seriesByKey, 'tsh');
  const ft3 = getHit(seriesByKey, 'ft3');
  const ft4 = getHit(seriesByKey, 'ft4');
  if (!tsh && !ft3 && !ft4) return null;

  const parts: { hit: Hit; partial: number; weight: number; core?: boolean }[] = [];
  const missing: string[] = [];
  const flags: string[] = [];

  if (tsh) {
    const partial = Math.round(clamp(1 / (1 + Math.abs(tsh.value - 1.5) / 1.2), 0.35, 1) * 100);
    parts.push({ hit: tsh, partial, weight: 1.2, core: true });
    if (tsh.value > 2.5) flags.push('TSH blisko górnej granicy optymalnej (2.5 mU/l).');
  } else {
    missing.push('TSH');
  }

  if (ft3) {
    const partial = scoreAgainstRange(ft3.value, ft3.range) ?? 75;
    parts.push({ hit: ft3, partial, weight: 1.0, core: true });
  } else {
    missing.push('Free T3');
  }

  if (ft4) {
    const partial = scoreAgainstRange(ft4.value, ft4.range) ?? 75;
    parts.push({ hit: ft4, partial, weight: 1.0, core: true });
  } else {
    missing.push('Free T4');
  }

  const isFullPanel = !!(tsh && ft3 && ft4);

  return finalizeScore(
    'thyroidContext',
    'Tarczyca',
    isFullPanel ? 'TSH · FT3 · FT4 (Pełny panel)' : 'TSH (uproszczony)',
    isFullPanel ? 'Pełna spójność osi tarczycy wg getbased.' : 'Częściowy profil tarczycy — zalecane uzupełnienie o FT3/FT4.',
    parts,
    missing,
    flags,
  );
}

function computeVitaminDMineral(seriesByKey: Map<string, MarkerSeries>): BiologyScoreResult | null {
  const vd = getHit(seriesByKey, 'vitamin_d_25oh');
  const mg = getHit(seriesByKey, 'magnesium_serum');
  if (!vd && !mg) return null;
  const parts: { hit: Hit; partial: number; weight: number; core?: boolean }[] = [];
  const missing: string[] = [];
  if (vd) parts.push({ hit: vd, partial: scoreAgainstRange(vd.value, vd.range) ?? 50, weight: 1.45, core: true });
  else missing.push('Witamina D');
  if (mg) parts.push({ hit: mg, partial: scoreAgainstRange(mg.value, mg.range) ?? 50, weight: 0.55 });
  else missing.push('Magnez');
  return finalizeScore(
    'vitaminDMineral',
    'D + minerały',
    'Wit. D · magnez',
    'Fragment Bone & Mineral Balance z getbased.',
    parts,
    missing,
    [],
  );
}

function computeMetabolicGlucose(seriesByKey: Map<string, MarkerSeries>): BiologyScoreResult | null {
  const glu = getHit(seriesByKey, 'glucose');
  if (!glu) return null;
  return finalizeScore(
    'metabolicGlucose',
    'Glukoza',
    'Metabolizm',
    'Bez insuliny/HbA1c to tylko pojedynczy sygnał glukozy.',
    [{ hit: glu, partial: scoreAgainstRange(glu.value, glu.range) ?? 50, weight: 1, core: true }],
    ['Insulina', 'HbA1c'],
    [],
  );
}

function applyScoreEvidenceGate(
  score: BiologyScoreResult,
  byKey: Map<string, MarkerSeries>,
): BiologyScoreResult {
  const keys = SCORE_MARKER_KEYS[score.id];
  if (!keys || scoreHasEvidence(byKey, keys)) return score;
  return {
    ...score,
    score: null,
    tone: null,
    toneLabel: 'Archiwalny',
    flags: [
      'Wynik z panelu archiwalnego (>180 dni) — zalecane odświeżenie w kolejnym badaniu.',
      ...score.flags,
    ],
  };
}

export function computeBiologyScoresLite(series: MarkerSeries[]): BiologyScoreResult[] {
  const byKey = new Map(series.map((s) => [s.marker_key, s]));
  const scores = [
    computeIronHandling(byKey),
    computeLipidPattern(byKey),
    computeThyroidContext(byKey),
    computeVitaminDMineral(byKey),
    computeMetabolicGlucose(byKey),
  ].filter(Boolean) as BiologyScoreResult[];

  return scores.map((s) => applyScoreEvidenceGate(s, byKey));
}

export function toneColorClass(tone: ScoreTone | null): string {
  switch (tone) {
    case 'excellent':
    case 'good':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'strained':
      return 'text-amber-600 dark:text-amber-400';
    case 'poor':
    case 'concerning':
    case 'severe':
      return 'text-rose-600 dark:text-rose-400';
    default:
      return 'text-text-muted';
  }
}

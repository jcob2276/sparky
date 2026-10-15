/**
 * Math and scoring utilities for Biology Scores adapted from getbased (AGPL-3.0).
 */

import type { MarkerSeries } from '../health/medicalAnalytics';
import { bridgeForMarkerKey, GETBASED_OPTIMAL, toCanonicalValue } from './markerBridge';

export type ScoreTone = 'excellent' | 'good' | 'strained' | 'poor' | 'concerning' | 'severe';

export type BiologyScoreResult = {
  id: string;
  title: string;
  kicker: string;
  score: number | null;
  tone: ScoreTone | null;
  toneLabel: string;
  coverage: number;
  coverageLabel: string;
  summary: string;
  flags: string[];
  missing: string[];
};

export const TONE_LABELS: Record<ScoreTone, string> = {
  excellent: 'Strong',
  good: 'Good',
  strained: 'Watch',
  poor: 'Low score',
  concerning: 'Concerning',
  severe: 'Severe',
};

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMax;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function resolveScoreTone(score: number | null): ScoreTone | null {
  if (!Number.isFinite(score)) return null;
  if (score! >= 85) return 'excellent';
  if (score! >= 70) return 'good';
  if (score! >= 50) return 'strained';
  if (score! >= 35) return 'poor';
  if (score! >= 15) return 'concerning';
  return 'severe';
}

export function scoreAgainstRange(value: number, range: { min: number | null; max: number | null }): number | null {
  if (!Number.isFinite(value)) return null;
  const { min, max } = range;
  if (min == null && max == null) return null;
  if (min == null && max != null) {
    if (value <= max) return 100;
    const buffer = Math.max(Math.abs(max) * 0.5, 1);
    return Math.round(clamp(lerp(clamp(value, max, max + buffer), max, max + buffer, 99, 0), 0, 99));
  }
  if (max == null && min != null) {
    if (value >= min) return 100;
    const buffer = Math.max(Math.abs(min) * 0.5, 1);
    return Math.round(clamp(lerp(clamp(value, min - buffer, min), min - buffer, min, 0, 99), 0, 99));
  }
  if (value >= min! && value <= max!) return 100;
  const span = Math.max(max! - min!, 1);
  if (value < min!) return Math.round(clamp(lerp(clamp(value, min! - span, min!), min! - span, min!, 0, 99), 0, 99));
  return Math.round(clamp(lerp(clamp(value, max!, max! + span), max!, max! + span, 99, 0), 0, 99));
}

export function scoreHighOnly(value: number, threshold: number, highCeil: number): number | null {
  if (!Number.isFinite(value)) return null;
  if (value <= threshold) return 100;
  const ceil = Math.max(highCeil, threshold + 1);
  return Math.round(clamp(lerp(clamp(value, threshold, ceil), threshold, ceil, 99, 0), 0, 99));
}

export function scoreLowOnly(value: number, threshold: number, lowFloor = 0): number | null {
  if (!Number.isFinite(value)) return null;
  if (value >= threshold) return 100;
  return Math.round(clamp(lerp(clamp(value, lowFloor, threshold), lowFloor, threshold, 0, 99), 0, 99));
}

export type Hit = { label: string; value: number; range: { min: number | null; max: number | null }; weight: number };

function hitFromSeries(series: MarkerSeries): Hit | null {
  const bridge = bridgeForMarkerKey(series.marker_key);
  if (!bridge) return null;
  const cv = toCanonicalValue(series.marker_key, series.latest.value, series.latest.unit);
  if (cv == null) return null;
  const opt = GETBASED_OPTIMAL[bridge.path];
  const range = opt
    ? { min: opt.optimalMin, max: opt.optimalMax }
    : { min: series.latest.ref_low, max: series.latest.ref_high };
  return { label: series.marker_name, value: cv, range, weight: 1 };
}

export function getHit(seriesByKey: Map<string, MarkerSeries>, key: string): Hit | null {
  const s = seriesByKey.get(key);
  if (!s) return null;
  return hitFromSeries(s);
}

export function finalizeScore(
  id: string,
  title: string,
  kicker: string,
  summary: string,
  parts: { hit: Hit; partial: number; weight: number; core?: boolean }[],
  missing: string[],
  flags: string[],
): BiologyScoreResult {
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0) + missing.length;
  const availableWeight = parts.reduce((s, p) => s + p.weight, 0);
  const scoreSum = parts.reduce((s, p) => s + p.partial * p.weight, 0);
  const score = availableWeight > 0 ? Math.round(scoreSum / availableWeight) : null;
  const coverage = totalWeight > 0 ? availableWeight / totalWeight : 0;
  const tone = resolveScoreTone(score);
  return {
    id,
    title,
    kicker,
    score,
    tone,
    toneLabel: tone ? TONE_LABELS[tone] : '—',
    coverage,
    coverageLabel: coverage >= 0.8 ? 'high' : coverage >= 0.45 ? 'partial' : 'low',
    summary,
    flags,
    missing,
  };
}

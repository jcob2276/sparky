/**
 * Hub PR cards: barbell big-three + BW pull-up / push-up / dip + OHP.
 */
import { epley1rm, extractLiftPRs, type SessionLike } from '@vanguard/domain';
import type { HubRecoverySessionRow } from './hubRecovery';

type HubRecordUnit = 'kg' | 'reps';

export type HubLiftRecord = {
  key: 'bench' | 'squat' | 'deadlift' | 'pullup' | 'ohp' | 'pushup' | 'dip';
  displayLabel: string;
  value: number;
  unit: HubRecordUnit;
  date: string;
};

const LIFT_UI: Record<HubLiftRecord['key'], string> = {
  bench: 'Wyciskanie',
  squat: 'Przysiad',
  deadlift: 'Martwy',
  pullup: 'Podciągnięcia',
  ohp: 'OHP',
  pushup: 'Pompki',
  dip: 'Dipy',
};

const PULLUP_RE = /podci[aą]g|pull-?\s*up|chin-?\s*up/i;
const PUSHUP_RE = /pompki?|push-?\s*ups?/i;
const DIP_RE = /\bdipy?\b|\bdips?\b/i;
const OHP_RE =
  /\bohp\b|overhead|military|żołniers|zolniers|wyciskanie.*(nad głow|nad glow|siedząc|siedzac|stojąc|stojac)/i;

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T12:00:00Z`).getTime();
  const b = new Date(`${to.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function toSessionLike(rows: HubRecoverySessionRow[]): SessionLike[] {
  return rows.map((r) => ({ date: r.date, exercise_logs: r.exercise_logs }));
}

export function isOhpName(name: string): boolean {
  const n = name.toLowerCase();
  if (/\bwąsk|wask|close-grip|leżąc|lezac|\bbench\b/i.test(n) && !OHP_RE.test(n)) return false;
  return OHP_RE.test(n);
}

function bestPullup(rows: HubRecoverySessionRow[], today: string): HubLiftRecord | null {
  let bestWeighted: { e1rm: number; date: string } | null = null;
  let bestReps: { reps: number; date: string } | null = null;

  for (const row of rows) {
    for (const log of row.exercise_logs || []) {
      if (!PULLUP_RE.test(log.exercise_name || '')) continue;
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (r <= 0) continue;
      if (w > 0) {
        const e1rm = (r <= 5 ? w : epley1rm(w, r) ?? w) || w;
        if (!bestWeighted || e1rm > bestWeighted.e1rm) {
          bestWeighted = { e1rm, date: row.date.slice(0, 10) };
        }
      } else if (!bestReps || r > bestReps.reps) {
        bestReps = { reps: r, date: row.date.slice(0, 10) };
      }
    }
  }

  if (bestWeighted && daysBetween(bestWeighted.date, today) <= 548) {
    return {
      key: 'pullup',
      displayLabel: LIFT_UI.pullup,
      value: Math.round(bestWeighted.e1rm * 10) / 10,
      unit: 'kg',
      date: bestWeighted.date,
    };
  }
  if (bestReps) {
    return {
      key: 'pullup',
      displayLabel: LIFT_UI.pullup,
      value: bestReps.reps,
      unit: 'reps',
      date: bestReps.date,
    };
  }
  return null;
}

function bestOhp(rows: HubRecoverySessionRow[], today: string): HubLiftRecord | null {
  let best: { e1rm: number; date: string } | null = null;
  for (const row of rows) {
    for (const log of row.exercise_logs || []) {
      if (!isOhpName(log.exercise_name || '')) continue;
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (w <= 0 || r <= 0) continue;
      const e1rm = (r <= 5 ? w : epley1rm(w, r) ?? w) || w;
      if (!best || e1rm > best.e1rm) best = { e1rm, date: row.date.slice(0, 10) };
    }
  }
  if (!best || daysBetween(best.date, today) > 1095) return null;
  return {
    key: 'ohp',
    displayLabel: LIFT_UI.ohp,
    value: Math.round(best.e1rm * 10) / 10,
    unit: 'kg',
    date: best.date,
  };
}

function bestBwReps(
  rows: HubRecoverySessionRow[],
  today: string,
  key: 'pushup' | 'dip',
  match: RegExp,
): HubLiftRecord | null {
  let best: { reps: number; date: string } | null = null;
  for (const row of rows) {
    for (const log of row.exercise_logs || []) {
      if (!match.test(log.exercise_name || '')) continue;
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (w > 0 || r <= 0) continue;
      if (!best || r > best.reps) best = { reps: r, date: row.date.slice(0, 10) };
    }
  }
  if (!best || daysBetween(best.date, today) > 548) return null;
  return {
    key,
    displayLabel: LIFT_UI[key],
    value: best.reps,
    unit: 'reps',
    date: best.date,
  };
}

/** Big three + pull-ups + OHP + BW pompki/dipy when data exists. */
export function buildHubRecords(rows: HubRecoverySessionRow[], today: string): HubLiftRecord[] {
  const prs = extractLiftPRs(toSessionLike(rows), today);
  const out: HubLiftRecord[] = [];
  for (const key of ['bench', 'squat', 'deadlift'] as const) {
    const pr = prs[key];
    if (!pr) continue;
    out.push({
      key,
      displayLabel: LIFT_UI[key],
      value: Math.round(pr.rawKg * 10) / 10,
      unit: 'kg',
      date: pr.date,
    });
  }
  const pull = bestPullup(rows, today);
  if (pull) out.push(pull);
  const ohp = bestOhp(rows, today);
  if (ohp) out.push(ohp);
  const push = bestBwReps(rows, today, 'pushup', PUSHUP_RE);
  if (push) out.push(push);
  const dip = bestBwReps(rows, today, 'dip', DIP_RE);
  if (dip) out.push(dip);
  return out;
}

export { LIFT_UI, daysBetween };

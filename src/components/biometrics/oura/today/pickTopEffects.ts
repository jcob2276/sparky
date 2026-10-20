import type { DriverEffect, EvidenceStrength } from '../../../../lib/biometrics/sleepDrivers/types';

const MAX_EFFECTS = 4;
const RANK: Record<EvidenceStrength, number> = { confirmed: 0, probable: 1, tentative: 2, insufficient: 3 };

/** Visible effects: strongest evidence first, then the biggest correlation; "insufficient" never shows. */
export function pickTopEffects(effects: DriverEffect[]): DriverEffect[] {
  return effects
    .filter(e => e.strength !== 'insufficient')
    .sort((a, b) => RANK[a.strength] - RANK[b.strength] || Math.abs(b.rho ?? 0) - Math.abs(a.rho ?? 0))
    .slice(0, MAX_EFFECTS);
}

import { LIFE_SPHERES, type LifeSphereId } from '../../lib/projects/lifeSpheres';

export const RADAR_SIZE = 280;
export const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 100;

export function polarPoint(index: number, radiusFraction: number) {
  const angle = index * ((2 * Math.PI) / 6) - Math.PI / 2;
  const r = RADAR_RADIUS * Math.max(0, Math.min(1, radiusFraction));
  return { x: RADAR_CENTER + r * Math.cos(angle), y: RADAR_CENTER + r * Math.sin(angle) };
}

export type BudgetBounds = { min: number | null; max: number | null };

export function emptyBudgetMap(): Record<LifeSphereId, BudgetBounds> {
  return Object.fromEntries(
    LIFE_SPHERES.map((s) => [s.id, { min: null, max: null }]),
  ) as Record<LifeSphereId, BudgetBounds>;
}

export function polygonPoints(values: number[], scale: number) {
  return values
    .map((v, i) => {
      const p = polarPoint(i, scale > 0 ? v / scale : 0);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

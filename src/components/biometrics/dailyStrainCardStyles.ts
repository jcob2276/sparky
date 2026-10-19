// VitalBands: color tile by z-score vs personal EWMA baseline (Strand VitalBands.swift)
export function zToVitalColor(z: number | null | undefined, defaultColor: string): string {
  if (z == null) return defaultColor;
  if (z >= 1.0)        return 'text-success dark:text-success';
  if (z >= -1.0)       return defaultColor;
  if (z >= -2.0)       return 'text-warning dark:text-warning';
  return 'text-danger dark:text-danger';
}

export const STATUS_RING = {
  unknown: '!border-border-custom',
  green:  '!border-success/20',
  yellow: '!border-warning/20',
  red:    '!border-danger/25',
};

export type { StrainComponents } from '../../lib/db-json-guards';

import type { CloserDailyLogRow } from './closerApi';
export type WorkContext = { work_energy: number | null; work_pressure: number | null; notes: string };
export const WORK_ENERGY = ['Bardzo mało', 'Mało', 'Średnio', 'Dużo', 'Bardzo dużo'];
export const WORK_PRESSURE = ['Bardzo mała', 'Mała', 'Umiarkowana', 'Duża', 'Bardzo duża'];
export function workContextFromRow(row?: CloserDailyLogRow | null): WorkContext {
  return { work_energy: row?.work_energy ?? null, work_pressure: row?.work_pressure ?? null, notes: row?.notes ?? '' };
}
export function hasWorkContext(row?: CloserDailyLogRow | null) {
  return !!row && (row.work_energy != null || row.work_pressure != null || !!row.notes?.trim());
}

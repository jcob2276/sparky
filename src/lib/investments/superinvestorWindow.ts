import { currentYear, yearFloor } from './yearFloor';

/**
 * Okno raportów 13F: tylko kwartały z bieżącego roku + jeden raport K4 z roku poprzedniego
 * (31 grudnia) jako baseline porównania Q/Q. Starsze dane nie istnieją w bazie.
 */
export function baselinePeriod(today?: string): string {
  return `${currentYear(today) - 1}-12-31`;
}

/** Filtr PostgREST dla `period_of_report` obejmujący bieżący rok i baseline. */
export function reportWindowFilter(today?: string): string {
  return `period_of_report=gte.${baselinePeriod(today)}`;
}

/** Czy okres raportu jest tylko baseline'em (przed 1 stycznia bieżącego roku). */
export function isBaselinePeriod(period: string, today?: string): boolean {
  return period < yearFloor(today);
}

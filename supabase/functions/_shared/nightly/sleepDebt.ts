import { shiftDateStr } from '@vanguard/domain';
import { mean } from './baselines.ts';

/** Dług snu liczony względem bazowej potrzeby ~7,5 h, jak w Oura (nie względem własnego celu użytkownika). */
const SLEEP_DEBT_TARGET_H = 7.5;

/** Dług z 14 nocy z zanikiem 0,9^wiek (ujemny = dług). Potrzebuje minimum 4 nocy, inaczej null. */
export function sleepDebtAt(sleepByDate: Record<string, number>, date: string): number | null {
  let total = 0;
  let count = 0;
  for (let age = 0; age < 14; age++) {
    const hours = sleepByDate[shiftDateStr(date, -age)];
    if (hours == null) continue;
    total += Math.pow(0.9, age) * (hours - SLEEP_DEBT_TARGET_H);
    count++;
  }
  return count >= 4 ? Math.round(total * 10) / 10 : null;
}

/**
 * O ile dług snu (dodatnia liczba = gorzej) jest większy niż Twój zwykły z poprzednich 28 dni.
 * Przewlekły niedosyt snu jest normą Twojego organizmu i nie powinien codziennie obniżać werdyktu,
 * liczy się dopiero pogorszenie względem tej normy.
 */
export function sleepDebtExcess(sleepByDate: Record<string, number>, date: string): number | null {
  const today = sleepDebtAt(sleepByDate, date);
  if (today == null) return null;
  const past: number[] = [];
  for (let back = 1; back <= 28; back++) {
    const v = sleepDebtAt(sleepByDate, shiftDateStr(date, -back));
    if (v != null) past.push(v);
  }
  const usual = past.length >= 7 ? mean(past) : null;
  if (usual == null) return null;
  return Math.round((usual - today) * 10) / 10;
}

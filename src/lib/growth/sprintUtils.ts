import { getSprintInfoForDate } from '@vanguard/domain';
import { getTodayWarsaw } from '../date';

export const SPRINT_SEASON = ['', 'Wiosna', 'Lato', 'Jesień', 'Zima'];

/** Bieżący sprint 12-tygodniowy; definicja w `@vanguard/domain` (wspólna z funkcjami edge). */
export function getSprintInfo() {
  return getSprintInfoForDate(getTodayWarsaw());
}

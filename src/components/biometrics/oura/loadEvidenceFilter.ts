import type { BehaviorEffectResult, CorrelationResult } from '@vanguard/domain';

/** Tematy, które liczy silnik „co wpływa na sen” — nie powtarzamy ich w „Obciążenie → regeneracja”. */
const COVERED_BY_DRIVERS = /caffeine|coffee|kawa|kofein|phone|screen|telefon|ekran|late_night|last_meal|meal_gap|late_meal|calories_late|food|meal|posił|jedze|training_gap|workout_gap|late_workout|late_train|evening_train|sauna|pc_active|computer|komputer/i;

/** Tematy obciążenia i aktywności — to jedyne, co ta sekcja pokazuje. */
const LOAD_TOPIC = /strain|steps|kroki|load|obci[aą]ż|activity|aktywn|train|workout|exercise|cardio|strength|run|walk|trimp/i;

function isCoveredByDrivers(...keys: Array<string | null | undefined>): boolean {
  return keys.some((key) => key != null && COVERED_BY_DRIVERS.test(key));
}

function isLoadTopic(...keys: Array<string | null | undefined>): boolean {
  return keys.some((key) => key != null && LOAD_TOPIC.test(key));
}

/** Korelacje obciążenia (strain/kroki → gotowość itp.) bez tematów silnika snu. */
export function filterLoadCorrelations(items: CorrelationResult[]): CorrelationResult[] {
  return items.filter((item) =>
    isLoadTopic(item.x_metric, item.x_label)
    && !isCoveredByDrivers(item.x_metric, item.x_label));
}

/** Efekty zachowań związane z aktywnością, bez tematów silnika snu (np. trening-odstęp). */
export function filterLoadBehaviors(items: BehaviorEffectResult[]): BehaviorEffectResult[] {
  return items.filter((item) =>
    isLoadTopic(item.behavior_key) && !isCoveredByDrivers(item.behavior_key));
}

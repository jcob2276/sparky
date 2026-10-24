/**
 * Cele ciała w jednym miejscu: wszystkie teksty (Kronika, karty sfer, filary, karta Trening, prognoza tłuszczu) czytają
 * stąd, a cel tłuszczu jest też w Ustawieniach (`nutrition_profile.goal_body_fat`), który ma tę samą wartość.
 * Zmieniając cel, zmień tu i w Ustawieniach, a w Fundamencie tekst wizji (widzi go Oracle).
 */
export const GOAL_BODY_FAT_PCT = 14;
export const GOAL_BENCH_KG = 100;
const GOAL_NET_INCOME_PLN = 15000;
export const GOAL_INCOME_LABEL = `${GOAL_NET_INCOME_PLN.toLocaleString('pl-PL')} zł netto / msc`;
export const GOAL_INCOME_SHORT = `${GOAL_NET_INCOME_PLN / 1000}k zł / msc`;
export const GOAL_BODY_SHORT = `${GOAL_BODY_FAT_PCT}% BF · ${GOAL_BENCH_KG} kg`;

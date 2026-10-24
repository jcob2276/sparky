/**
 * Cele ciała w jednym miejscu: wszystkie teksty (Kronika, karty sfer, filary, karta Trening, prognoza tłuszczu) czytają
 * stąd, a cel tłuszczu jest też w Ustawieniach (`nutrition_profile.goal_body_fat`), który ma tę samą wartość.
 * Zmieniając cel, zmień tu i w Ustawieniach, a w Fundamencie tekst wizji (widzi go Oracle).
 */
export const GOAL_BODY_FAT_PCT = 14;
export const GOAL_BENCH_KG = 100;
export const GOAL_BODY_SHORT = `${GOAL_BODY_FAT_PCT}% BF · ${GOAL_BENCH_KG} kg`;

/** Aktywności Stravy liczone jako bieganie: jedna lista dla wszystkich widoków i funkcji (spacer czy hike to nie bieganie). */
export const RUN_SPORT_TYPES: readonly string[] = ['Run', 'TrailRun', 'VirtualRun'];

export const isRunSport = (sportType: string | null | undefined): boolean => RUN_SPORT_TYPES.includes(sportType ?? '');

/** Wzorzec `workout_day` sesji sauny: nie liczy się jako trening w żadnym liczniku treningów (frontend i funkcje edge). */
export const SAUNA_WORKOUT_DAY_PATTERN = '%sauna%';

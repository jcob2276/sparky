function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z');
}

/** Same ruch pod różnymi nazwami — pierwsza nazwa w grupie jest kanoniczna. */
export const EXERCISE_ALIAS_GROUPS: readonly (readonly string[])[] = [
  [
    'Wyciskanie płaskie',
    'Wyciskanie sztangi na ławce',
    'Bench press',
    'Barbell bench press',
    'Flat bench press',
    'Wyciskanie leżąc',
  ],
  [
    'Wyciskanie skośne',
    'Wyciskanie na skosie',
    'Incline bench press',
    'Barbell incline bench press',
  ],
  [
    'Wyciskanie hantli na ławce',
    'Wyciskanie hantli',
    'Dumbbell bench press',
    'DB bench press',
  ],
  ['Martwy ciąg', 'Martwy ciąg klasyczny', 'Martwy Ciąg', 'Deadlift', 'Conventional deadlift'],
  ['Martwy ciąg rumuński', 'RDL', 'Romanian deadlift'],
  ['Przysiad ze sztangą', 'Przysiad', 'Back squat', 'Barbell squat'],
  ['Podciąganie nachwytem', 'Podciąganie', 'Pull-up', 'Pull ups', 'Pullup', 'Chin-up overhand'],
  ['Podciąganie podchwytem', 'Chin-up', 'Chin ups'],
  ['Wiosłowanie sztangą', 'Wiosłowanie', 'Barbell row', 'Bent over row'],
  ['Wiosłowanie jedną ręką', 'Wiosłowanie hantlem', 'Dumbbell row', 'One arm row'],
  ['Dipy', 'Dips', 'Dip', 'Parallel bar dip'],
  ['OHP sztangą', 'OHP', 'Wyciskanie żołnierskie', 'Military press', 'Overhead press', 'Shoulder press'],
  ['OHP hantlami', 'Wyciskanie hantli nad głowę', 'Dumbbell shoulder press'],
  ['Lat Pulldown', 'Ściąganie drążka', 'Lat pulldown', 'Pulldown'],
  ['Leg press', 'Leg Press', 'Suwnica'],
  ['Hip thrust', 'Hip Thrust', 'Barbell hip thrust'],
  ['Wykroki (miejsce/bułgar)', 'Wykroki', 'Bułgarski przysiad', 'Bulgarian split squat', 'Lunges'],
  ['Sauna', 'Sauna — 80 stopni'],
  ['Wspięcia na łydki', 'Wspięcia na palce', 'Calf raise', 'Standing calf raise'],
] as const;

export function canonicalExerciseName(exerciseName: string): string {
  const trimmed = exerciseName.trim();
  if (!trimmed) return trimmed;

  const key = normalizeKey(trimmed);
  for (const group of EXERCISE_ALIAS_GROUPS) {
    if (group.some((name) => normalizeKey(name) === key)) {
      return group[0];
    }
  }
  return trimmed;
}

export function historyNamesFor(exerciseName: string): string[] {
  const trimmed = exerciseName.trim();
  if (!trimmed) return [];

  const key = normalizeKey(trimmed);
  for (const group of EXERCISE_ALIAS_GROUPS) {
    if (group.some((name) => normalizeKey(name) === key)) {
      return [...new Set(group.map((n) => n.trim()).filter(Boolean))];
    }
  }
  return [trimmed];
}

export function matchedHistoryAlias(queryName: string, loggedAs: string): string | null {
  const names = historyNamesFor(queryName);
  if (names.length <= 1) return null;
  if (normalizeKey(loggedAs) === normalizeKey(queryName)) return null;
  if (names.some((n) => normalizeKey(n) === normalizeKey(loggedAs))) return loggedAs;
  return null;
}

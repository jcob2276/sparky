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
  ['Wyciskanie płaskie', 'Wyciskanie sztangi na ławce', 'Bench press'],
  ['Wyciskanie skośne', 'Wyciskanie na skosie'],
  ['Wyciskanie hantli na ławce', 'Wyciskanie hantli'],
  ['Martwy ciąg', 'Martwy ciąg klasyczny', 'Martwy Ciąg'],
  ['Martwy ciąg rumuński', 'RDL'],
  ['Przysiad ze sztangą', 'Przysiad', 'Back squat'],
  ['Podciąganie nachwytem', 'Podciąganie', 'Pull-up'],
  ['Podciąganie podchwytem', 'Podciąganie podchwytem'],
  ['Wiosłowanie sztangą', 'Wiosłowanie'],
  ['Wiosłowanie jedną ręką', 'Wiosłowanie hantlem'],
  ['Dipy', 'Dips'],
  ['OHP sztangą', 'OHP', 'Wyciskanie żołnierskie'],
  ['OHP hantlami', 'Wyciskanie hantli nad głowę'],
  ['Lat Pulldown', 'Ściąganie drążka'],
  ['Leg press', 'Leg Press', 'Suwnica'],
  ['Hip thrust', 'Hip Thrust'],
  ['Wykroki (miejsce/bułgar)', 'Wykroki', 'Bułgarski przysiad'],
  ['Sauna', 'Sauna — 80 stopni'],
  ['Wspięcia na łydki', 'Wspięcia na palce'],
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

/** Pomiary wstępne od trenera (tydzień testów). Kolejność i numeracja jak w arkuszu trenera. */
export type BaselineUnit = 'weight' | 'reps' | 'time';

export interface BaselineTest {
  key: string;
  /** Numer z arkusza trenera (kilka testów może mieć ten sam numer, np. dipy). */
  no: string;
  name: string;
  unit: BaselineUnit;
  /** W arkuszu trenera przekreślone: domyślnie pominięte, można przywrócić. */
  skippedByDefault?: boolean;
}

export const BASELINE_TESTS: readonly BaselineTest[] = [
  { key: 't01', no: '1', name: 'Z ciężarem (1RM) – podchwyt', unit: 'weight' },
  { key: 't02', no: '2', name: 'Podciąganie +10 kg – nachwyt, max rep', unit: 'reps' },
  { key: 't03', no: '3', name: 'Muscle-ups – 1 RM', unit: 'weight', skippedByDefault: true },
  { key: 't04', no: '4', name: 'Muscle-ups – max reps', unit: 'reps', skippedByDefault: true },
  { key: 't05', no: '5', name: 'Martwy ciąg klasyczny (1RM)', unit: 'weight' },
  { key: 't06', no: '6', name: 'Przysiad (1RM)', unit: 'weight' },
  { key: 't07a', no: '7', name: 'Dipy (1RM)', unit: 'weight' },
  { key: 't07b', no: '7', name: 'Dipy – max reps', unit: 'reps' },
  { key: 't08', no: '8', name: 'Wyciskanie sztangi leżąc na ławce płaskiej (1RM)', unit: 'weight', skippedByDefault: true },
  { key: 't09', no: '9', name: 'Uginanie ramion ze sztangą stojąc, podchwytem – 30 kg, max reps', unit: 'reps' },
  { key: 't10', no: '10', name: 'Pompki – kg, max reps', unit: 'reps' },
  { key: 't12', no: '12', name: 'Wyciskanie sztangi stojąc (1RM)', unit: 'weight' },
  { key: 't13', no: '13', name: 'Unoszenie hantli bokiem – 8 kg, max reps', unit: 'reps' },
  { key: 't14', no: '14', name: 'Pompki w staniu na rękach, nogi oparte o ścianę, na paralletkach – max reps', unit: 'reps', skippedByDefault: true },
  { key: 't15', no: '15', name: 'Zwis na drążku jednorącz – max time', unit: 'time' },
  { key: 't16', no: '16', name: 'Rozpiętki na maszynie 60 kg – max reps', unit: 'reps' },
  { key: 't17', no: '17', name: 'Wznosy nóg do drążka – max reps', unit: 'reps' },
  { key: 't18', no: '18', name: 'L-sit na drążku – max time', unit: 'time' },
  { key: 't19', no: '19', name: 'Wycieraczki leżąc plecami na ziemi, ręce wyprostowane, trzymając się drabinki – max reps', unit: 'reps' },
  { key: 't20', no: '20', name: 'Bułgary 14 kg – max reps', unit: 'reps' },
  { key: 't21', no: '21', name: 'Prostowanie nóg na maszynie siedząc 60 kg – max reps', unit: 'reps' },
  { key: 't22', no: '22', name: 'Przywodzenie leżąc na dwójki 60 kg – max reps', unit: 'reps' },
  { key: 't23', no: '23', name: 'Butterflys z ciężarem stojąc 6 kg – max reps', unit: 'reps' },
  { key: 't24', no: '24', name: 'Bulgarian dip na kółkach gimnastycznych 20 kg – max reps', unit: 'reps', skippedByDefault: true },
];

export const BASELINE_PLACEHOLDER: Record<BaselineUnit, { main: string; max: string }> = {
  weight: { main: 'np. 80 kg × 3', max: 'kg' },
  reps: { main: 'np. 12 powt.', max: 'powt.' },
  time: { main: 'np. 45 s', max: 'sekundy' },
};

export interface BaselineResult {
  test_key: string;
  main_set: string | null;
  max_value: string | null;
  skipped: boolean | null;
  video_path: string | null;
  video_url: string | null;
}

export const isBaselineSkipped = (test: BaselineTest, result?: Pick<BaselineResult, 'skipped'>): boolean =>
  result?.skipped ?? test.skippedByDefault ?? false;

const filled = (result?: Pick<BaselineResult, 'main_set' | 'max_value'>): boolean => Boolean(result?.main_set?.trim() || result?.max_value?.trim());

/** Ile z aktywnych (nie pominiętych) testów ma wpisany wynik. */
export function baselineProgress(results: readonly BaselineResult[]): { done: number; total: number } {
  const byKey = new Map(results.map((r) => [r.test_key, r]));
  const active = BASELINE_TESTS.filter((t) => !isBaselineSkipped(t, byKey.get(t.key)));
  return { done: active.filter((t) => filled(byKey.get(t.key))).length, total: active.length };
}

/** Tekst do wysłania trenerowi: aktywne testy z wynikiem, serią, maxem i linkiem do wideo (jeśli to link). */
export function formatBaselineSummary(results: readonly BaselineResult[]): string {
  const byKey = new Map(results.map((r) => [r.test_key, r]));
  const lines = BASELINE_TESTS.flatMap((test) => {
    const result = byKey.get(test.key);
    if (isBaselineSkipped(test, result)) return [];
    const parts = [
      result?.main_set?.trim() ? `seria: ${result.main_set.trim()}` : null,
      result?.max_value?.trim() ? `max: ${result.max_value.trim()}` : null,
      result?.video_url ? `wideo: ${result.video_url}` : result?.video_path ? 'wideo: nagrane w aplikacji' : null,
    ].filter(Boolean);
    return [`${test.no}. ${test.name} — ${parts.length ? parts.join(', ') : 'brak wyniku'}`];
  });
  return `Pomiary wstępne\n${lines.join('\n')}`;
}

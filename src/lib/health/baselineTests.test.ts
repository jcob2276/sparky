import { describe, expect, it } from 'vitest';
import { BASELINE_TESTS, baselineProgress, formatBaselineSummary, isBaselineSkipped, type BaselineResult } from './baselineTests';

const result = (patch: Partial<BaselineResult> & { test_key: string }): BaselineResult =>
  ({ main_set: null, max_value: null, skipped: null, video_path: null, video_url: null, ...patch });

describe('pomiary wstępne', () => {
  it('klucze testów są unikalne, a przekreślone w arkuszu są domyślnie pominięte', () => {
    expect(new Set(BASELINE_TESTS.map((t) => t.key)).size).toBe(BASELINE_TESTS.length);
    const skipped = BASELINE_TESTS.filter((t) => t.skippedByDefault).map((t) => t.key);
    expect(skipped).toEqual(['t03', 't04', 't08', 't14', 't24']);
    const test = BASELINE_TESTS.find((t) => t.key === 't03')!;
    expect(isBaselineSkipped(test)).toBe(true);
    expect(isBaselineSkipped(test, { skipped: false })).toBe(false);
  });

  it('liczy postęp tylko po aktywnych testach i uwzględnia przywrócone', () => {
    const base = baselineProgress([]);
    expect(base.done).toBe(0);
    expect(base.total).toBe(BASELINE_TESTS.length - 5);
    const progress = baselineProgress([
      result({ test_key: 't05', max_value: '180 kg' }),
      result({ test_key: 't03', max_value: '10 kg', skipped: false }),
      result({ test_key: 't06', main_set: '   ' }),
    ]);
    expect(progress).toEqual({ done: 2, total: base.total + 1 });
  });

  it('streszczenie dla trenera pomija przekreślone testy i podaje link do wideo', () => {
    const text = formatBaselineSummary([
      result({ test_key: 't05', main_set: '160 kg × 3', max_value: '180 kg', video_url: 'https://youtu.be/x' }),
      result({ test_key: 't06', video_path: 'u/t06.mp4' }),
    ]);
    expect(text).toContain('5. Martwy ciąg klasyczny (1RM) — seria: 160 kg × 3, max: 180 kg, wideo: https://youtu.be/x');
    expect(text).toContain('6. Przysiad (1RM) — wideo: nagrane w aplikacji');
    expect(text).toContain('12. Wyciskanie sztangi stojąc (1RM) — brak wyniku');
    expect(text).not.toContain('Muscle-ups');
  });
});

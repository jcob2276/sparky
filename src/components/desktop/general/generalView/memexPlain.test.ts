import { describe, expect, it } from 'vitest';
import { groupHypotheses } from './memexPlain';

const item = (hypothesis: string, confidence: number, provocation: string | null = null) => ({
  hypothesis, provocation, confidence_score: confidence, category: 'friction_pattern', evidence_count: 1, created_at: null,
});

describe('groupHypotheses', () => {
  it('merges repeats of one pattern and translates the raw key', () => {
    const result = groupHypotheses([
      item('[FRICTION PATTERN] sleep_disruption x5: wieczorny telefon', 0.8),
      item('[FRICTION PATTERN] sleep_disruption x4: scrollowanie rano', 0.75),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Telefon kosztem snu');
    expect(result[0].detail).toBe('wieczorny telefon');
    expect(result[0].evidence).toBe(2);
  });

  it('shows an identical provocation only once and removes raw keys from the text', () => {
    const result = groupHypotheses([
      item('[FRICTION PATTERN] social_hesitation x4: a', 0.85, 'Ten sam tekst'),
      item('[FRICTION PATTERN] avoidance x3: b', 0.7, 'Ten sam tekst'),
      item('[FRICTION PATTERN] self_control_break x9: c', 0.6, 'dni z execution_score 0'),
    ]);
    expect(result.filter((r) => r.provocation === 'Ten sam tekst')).toHaveLength(1);
    expect(result.find((r) => r.key === 'self_control_break')?.provocation).toBe('dni z wskaźnik wykonania 0');
  });
});

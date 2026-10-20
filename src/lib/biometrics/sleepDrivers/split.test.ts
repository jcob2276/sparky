import { describe, expect, it } from 'vitest';
import { compareGroups, type SplitSpec } from './split';

const spec = (fixedThreshold: number | null): SplitSpec => ({
  fixedThreshold,
  thresholdLabel: (t) => `próg ${t}`,
  lowLabel: (t) => `poniżej ${t}`,
  highLabel: (t) => `${t}+`,
});

describe('compareGroups', () => {
  const pairs: Array<[number, number]> = [[1, 10], [2, 12], [2.5, 14], [4, 20], [5, 22], [6, 24]];

  it('dzieli po stałym progu i liczy delta = high - low', () => {
    const s = compareGroups(pairs, spec(3));
    expect(s).toMatchObject({ lowN: 3, highN: 3, lowMean: 12, highMean: 22, delta: 10, thresholdLabel: 'próg 3' });
  });

  it('spada do mediany, gdy stały próg zostawia małą grupę', () => {
    const s = compareGroups(pairs, spec(100));
    expect(s?.lowN).toBe(3);
    expect(s?.highN).toBe(3);
    expect(s?.thresholdLabel).toBe('próg 3.3');
  });

  it('null przy zbyt małej próbie lub jednej wartości', () => {
    expect(compareGroups(pairs.slice(0, 4), spec(3))).toBeNull();
    expect(compareGroups(Array.from({ length: 8 }, (): [number, number] => [5, 1]), spec(null))).toBeNull();
  });
});

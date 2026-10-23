import { describe, expect, it } from 'vitest';
import { parseChartSpec, labelYear } from './analystChartSpec';
import { parseBlocks } from './analystParse';

describe('analyst chart spec', () => {
  it('reads quarter years from labels', () => {
    expect(labelYear('Q1 2026')).toBe(2026);
    expect(labelYear('2025 Q4')).toBe(2025);
    expect(labelYear('1Q26')).toBe(2026);
    expect(labelYear('Dino')).toBeNull();
  });
  it('drops quarters outside the current year', () => {
    const raw = JSON.stringify({ title: 'T', unit: 'mln PLN', source: 'GPW', asOf: '05.03.2026', bars: [
      { label: 'Q4 2025', value: 5 }, { label: 'Q1 2026', value: 10, margin: 7.5 }, { label: 'Q2 2026', value: '12,5' },
    ] });
    const spec = parseChartSpec(raw, 2026);
    expect(spec?.bars.map((b) => b.label)).toEqual(['Q1 2026', 'Q2 2026']);
    expect(spec?.bars[0].margin).toBe(7.5);
    expect(spec?.bars[1].value).toBe(12.5);
    expect(spec?.droppedOutOfYear).toBe(1);
  });
  it('returns null for invalid or fully out-of-year data', () => {
    expect(parseChartSpec('nie json', 2026)).toBeNull();
    expect(parseChartSpec('{"bars":[{"label":"Q1 2024","value":1}]}', 2026)).toBeNull();
  });
});

describe('parseBlocks', () => {
  it('parses a fenced chart block and a source line', () => {
    const md = 'Wstęp\n```chart {"title":"Przychody","bars":[{"label":"Q1 2026","value":3}]}```\nŹródło: GPW · dane do 05.03.2026';
    const types = parseBlocks(md).map((b) => b.type);
    expect(types).toEqual(['text', 'chart', 'source']);
  });
});

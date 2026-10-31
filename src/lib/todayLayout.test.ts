import { describe, expect, it } from 'vitest';
import { DEFAULT_TODAY_LAYOUT, parseTodayLayout } from './todayLayout';

describe('today layout preferences', () => {
  it('recovers the default from absent, malformed or unsupported settings', () => {
    for (const value of [null, '{', [], { sections: [] }, { version: 2, sections: [] }]) {
      expect(parseTodayLayout(value)).toEqual(DEFAULT_TODAY_LAYOUT);
    }
  });

  it('retains saved order and hidden sections while dropping unknown and duplicate cards', () => {
    const sections = [
      { id: 'agenda', visible: true },
      { id: 'vision', visible: false },
      { id: 'agenda', visible: false },
      { id: 'unrecognized', visible: true },
      { id: 'food', visible: 'false' },
    ];
    const result = parseTodayLayout(JSON.stringify({ version: 1, sections }));
    expect(result.sections.slice(0, 2)).toEqual(sections.slice(0, 2));
    expect(result.sections.map(section => section.id)).toHaveLength(DEFAULT_TODAY_LAYOUT.sections.length);
    expect(result.sections.find(section => section.id === 'food')?.visible).toBe(true);
    expect(sections).toHaveLength(5);
  });

  it('keeps an explicit all-hidden layout and returns independent defaults', () => {
    const allHidden = { version: 1, sections: DEFAULT_TODAY_LAYOUT.sections.map(section => ({ ...section, visible: false })) };
    expect(parseTodayLayout(JSON.stringify(allHidden))).toEqual(allHidden);
    const first = parseTodayLayout(null);
    first.sections[0].visible = false;
    expect(parseTodayLayout(null).sections[0].visible).toBe(true);
  });
});

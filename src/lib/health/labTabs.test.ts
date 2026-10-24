import { describe, expect, it } from 'vitest';
import { LAB_TABS, tabForSection } from './labTabs';

describe('tabForSection', () => {
  it('mapuje dawne sekcje na zakładki', () => {
    expect(tabForSection('sugestie')).toBe('przeglad');
    expect(tabForSection('cialo')).toBe('wyniki');
    expect(tabForSection('scores')).toBe('trendy');
    expect(tabForSection('dokumenty')).toBe('dokumenty');
  });

  it('nieznana sekcja otwiera Przegląd, a każda zakładka ma etykietę', () => {
    expect(tabForSection('nie-ma')).toBe('przeglad');
    expect(LAB_TABS.map((t) => t.key)).toEqual(['przeglad', 'wyniki', 'trendy', 'dokumenty']);
  });
});

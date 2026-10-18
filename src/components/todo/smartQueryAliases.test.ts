import { describe, expect, it } from 'vitest';
import { extractFilterTokens, normalizeSmartQueryAliases, removeFilterToken } from './smartQueryAliases';
import { matchesSmartQuery, type SmartQueryItem } from './todoUtils';

const item: SmartQueryItem = {
  id: '1', title: 'Raport', priority: 'urgent', tags: null, due_date: '2026-10-20',
  section_id: null, status: 'open',
};

describe('smart query aliases', () => {
  it('rewrites Polish keys and values to canonical tokens', () => {
    expect(normalizeSmartQueryAliases('termin:tydzień priorytet:pilny raport')).toBe('due:week priority:urgent raport');
  });

  it('filters with Polish aliases like the English tokens', () => {
    expect(matchesSmartQuery('termin:tydzień', item, '2026-10-18', {})).toBe(true);
    expect(matchesSmartQuery('termin:zaległe', item, '2026-10-18', {})).toBe(false);
    expect(matchesSmartQuery('priorytet:pilny', item, '2026-10-18', {})).toBe(true);
  });

  it('extracts and removes chips', () => {
    const [chip] = extractFilterTokens('termin:tydzień raport');
    expect(chip.label).toBe('termin: tydzień');
    expect(removeFilterToken('termin:tydzień raport', chip.raw)).toBe('raport');
  });
});

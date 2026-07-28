import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHUTDOWN_ITEMS,
  buildShutdownChecklistRows,
  normalizeCustomShutdownItem,
} from './shutdownChecklistModel';

describe('buildShutdownChecklistRows', () => {
  it('combines fixed rituals, custom items and active supplements', () => {
    const rows = buildShutdownChecklistRows({
      customItems: [{ id: 'custom-spacer', label: 'Spacer 20 minut' }],
      supplements: [
        { id: 'creatine', name: 'Kreatyna' },
        { id: 'd3', name: 'D3' },
      ],
      loggedSupplementIds: new Set(['creatine']),
      checkedItemIds: new Set(['phone-free-morning']),
    });

    expect(rows).toEqual([
      ...DEFAULT_SHUTDOWN_ITEMS.map((item) => ({
        ...item,
        checked: item.id === 'phone-free-morning',
        kind: 'ritual',
      })),
      {
        id: 'custom-spacer',
        label: 'Spacer 20 minut',
        checked: false,
        kind: 'custom',
      },
      {
        id: 'supplement-creatine',
        label: 'Kreatyna',
        checked: true,
        kind: 'supplement',
        supplementId: 'creatine',
      },
      {
        id: 'supplement-d3',
        label: 'D3',
        checked: false,
        kind: 'supplement',
        supplementId: 'd3',
      },
    ]);
  });
});

describe('normalizeCustomShutdownItem', () => {
  it('trims a user item and creates a stable id', () => {
    expect(normalizeCustomShutdownItem('  Rozciąganie 10 min  ', () => 'abc')).toEqual({
      id: 'custom-abc',
      label: 'Rozciąganie 10 min',
    });
  });

  it('rejects an empty item', () => {
    expect(normalizeCustomShutdownItem('   ', () => 'abc')).toBeNull();
  });
});

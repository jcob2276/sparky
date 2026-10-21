import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHUTDOWN_ITEMS,
  buildShutdownChecklistRows,
  normalizeCustomShutdownItem,
} from './shutdownChecklistModel';

describe('buildShutdownChecklistRows', () => {
  it('combines fixed rituals and custom items', () => {
    const rows = buildShutdownChecklistRows({
      customItems: [{ id: 'custom-spacer', label: 'Spacer 20 minut' }],
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

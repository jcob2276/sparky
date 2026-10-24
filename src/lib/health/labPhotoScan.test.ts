import { describe, expect, it } from 'vitest';
import { describeLabScanError, draftsFromScan, isPdfFile } from './labPhotoScan';

describe('draftsFromScan', () => {
  it('zamienia odczyt na tekstowe wiersze kreatora, puste granice zostają puste', () => {
    const drafts = draftsFromScan({
      resultDate: '2026-10-20',
      provider: null,
      results: [{ marker_name: 'Ferrytyna', value: 45.5, unit: 'ng/ml', ref_low: 30, ref_high: null, category: null }],
    });
    expect(drafts).toEqual([{ markerName: 'Ferrytyna', value: '45.5', unit: 'ng/ml', refLow: '30', refHigh: '', category: '' }]);
  });
});

describe('describeLabScanError', () => {
  it('niewdrożona funkcja to zwykłe zdanie, inne komunikaty przechodzą dalej', () => {
    expect(describeLabScanError(new Error('Requested function was not found'))).toContain('nie jest jeszcze dostępny');
    expect(describeLabScanError(new Error('Nie udało się odczytać wyników ze zdjęcia. Spróbuj ostrzejszego, bliższego ujęcia.'))).toContain('ostrzejszego');
    expect(describeLabScanError(new Error(''))).toBe('Nie udało się odczytać wyników ze zdjęcia.');
  });
});

describe('isPdfFile', () => {
  it('rozpoznaje PDF po typie albo rozszerzeniu, zdjęcia nie', () => {
    expect(isPdfFile({ type: 'application/pdf', name: 'a' })).toBe(true);
    expect(isPdfFile({ type: '', name: 'Wyniki.PDF' })).toBe(true);
    expect(isPdfFile({ type: 'image/jpeg', name: 'a.jpg' })).toBe(false);
  });
});

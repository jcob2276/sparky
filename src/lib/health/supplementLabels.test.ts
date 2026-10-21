import { describe, expect, it } from 'vitest';
import { shortSupplementName } from './supplementLabels';

describe('shortSupplementName', () => {
  it('zna swoje suplementy po slugu', () => {
    expect(shortSupplementName({ slug: 'd3k2', name: 'D3 + K2 MK-7' })).toBe('D3');
    expect(shortSupplementName({ slug: 'magnez', name: 'Magnez chelatowany (diglicynian) Biowen' })).toBe('Magnez');
    expect(shortSupplementName({ slug: 'omega3', name: 'Omega-3' })).toBe('Omega');
  });
  it('dla nieznanego skraca do pierwszej części nazwy', () => {
    expect(shortSupplementName({ slug: 'x', name: 'Ashwagandha KSM-66 (600 mg)' })).toBe('Ashwagandha KSM-66');
    expect(shortSupplementName({ slug: 'y', name: 'Witamina C + cynk' })).toBe('Witamina C');
  });
});

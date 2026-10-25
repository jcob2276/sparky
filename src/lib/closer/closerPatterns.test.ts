import { describe, expect, it } from 'vitest';
import { callPatterns } from './closerPatterns';
import type { Json } from '../database.types';

const moment = (phase: string | null, experiment = 'Zapytaj o kryteria decyzji.') => ({ timestamp: '00:01:00', phase, what: 'Obserwacja', why: '', experiment });
const call = (id: string, day: string, mistakes: Json[], good: Json[] = []) =>
  ({ id, title: 'Rozmowa ' + id, started_at: day + 'T10:00:00Z', ai_mistakes: mistakes, ai_good_moves: good });

describe('callPatterns', () => {
  it('liczy etap raz na rozmowę, sortuje po liczbie rozmów i bierze najnowszy eksperyment', () => {
    const result = callPatterns([
      call('a', '2026-10-01', [moment('cena', 'Stary eksperyment'), moment('cena'), moment('obiekcje')], [moment('potrzeby')]),
      call('b', '2026-10-20', [moment('cena', 'Nowy eksperyment'), moment('obiekcje')], [moment('potrzeby')]),
      call('c', '2026-10-10', [moment('cena'), moment('otwarcie')]),
    ]);
    expect(result.analyzed).toBe(3);
    expect(result.practice.map(p => [p.phase, p.calls])).toEqual([['cena', 3], ['obiekcje', 2]]);
    expect(result.practice[0].latest).toEqual({ callId: 'b', title: 'Rozmowa b', experiment: 'Nowy eksperyment' });
    expect(result.strength).toMatchObject({ phase: 'potrzeby', label: 'Badanie potrzeb', calls: 2 });
  });

  it('pomija stary format bez etapów i pojedyncze przypadki', () => {
    const result = callPatterns([call('old', '2026-09-01', [moment(null)]), call('one', '2026-10-01', [moment('cena')])]);
    expect(result).toEqual({ analyzed: 1, practice: [], strength: null });
  });
});

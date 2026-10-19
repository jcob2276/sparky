import { describe, expect, it } from 'vitest';
import { buildReadinessBrief, formatHours } from './readinessPlain';

describe('buildReadinessBrief', () => {
  it('turns the jargon-heavy stored signals into plain Polish, worst reasons first', () => {
    const brief = buildReadinessBrief({
      level: 'strained',
      mainLimiter: 'sleep',
      sleepScore: 62,
      sleepDebtH: -3.2,
      signals: [
        { key: 'hrv', flag: 'bad', detail: 'wyraźnie poniżej — zmęczenie autonomiczne' },
        { key: 'rhr', flag: 'good', detail: 'poniżej lub na poziomie baseline' },
        { key: 'acwr', flag: 'watch', detail: 'load spada (ACWR 0.62) — przestrzeń do budowania' },
      ],
    });
    expect(brief.headline).toBe('Dziś lżej');
    expect(brief.reasons).toHaveLength(3);
    // main limiter is sleep, so sleep leads even though HRV is "bad"
    expect(brief.reasons[0]).toMatchObject({ key: 'sleep', tone: 'watch' });
    const all = brief.reasons.map((r) => r.text).join(' ');
    expect(all).not.toMatch(/baseline|ACWR|autonomiczne|load/i);
  });

  it('explains a falling training load as room to build, without the ACWR number', () => {
    const brief = buildReadinessBrief({
      level: 'balanced',
      signals: [{ key: 'acwr', flag: 'watch', detail: 'load spada (ACWR 0.62) — przestrzeń do budowania' }],
    });
    expect(brief.reasons[0].text).toBe('Trenowałeś ostatnio mniej niż zwykle, więc możesz dołożyć obciążenia.');
  });

  it('reads the ACWR ratio to tell a safe load from a spike', () => {
    const spike = buildReadinessBrief({ level: 'strained', signals: [{ key: 'acwr', flag: 'bad', detail: 'SPIKE (ACWR 1.71) — ryzyko kontuzji' }] });
    expect(spike.reasons[0]).toMatchObject({ tone: 'bad', text: 'Gwałtowny skok obciążenia. Rośnie ryzyko kontuzji.' });
    const sweet = buildReadinessBrief({ level: 'primed', signals: [{ key: 'acwr', flag: 'good', detail: 'load w sweet spot (ACWR 1.05)' }] });
    expect(sweet.reasons[0].tone).toBe('good');
  });

  it('names what pulls the day down in one sentence, without repeating the tile values', () => {
    const brief = buildReadinessBrief({
      level: 'strained',
      sleepScore: 75,
      sleepDebtH: -5.2,
      signals: [{ key: 'hrv', flag: 'bad', detail: 'wyraźnie poniżej — zmęczenie autonomiczne' }],
    });
    expect(brief.drivers).toBe('Najmocniej ciągną w dół: dług snu 5 h 12 min i niskie HRV.');
    expect(buildReadinessBrief({ level: 'primed', sleepScore: 90 }).drivers).toBeNull();
  });

  it('reports missing data honestly instead of inventing a verdict', () => {
    expect(buildReadinessBrief({ level: null })).toMatchObject({ headline: 'Za mało danych', reasons: [] });
    expect(buildReadinessBrief({ level: 'insufficient' }).headline).toBe('Za mało danych');
  });

  it('keeps at most three reasons and ignores unknown or silent signals', () => {
    const brief = buildReadinessBrief({
      level: 'rundown',
      sleepScore: 40,
      sleepDebtH: -4,
      signals: [
        { key: 'hrv', flag: 'bad', detail: '' },
        { key: 'rhr', flag: 'bad', detail: '' },
        { key: 'respRate', flag: 'neutral', detail: '' },
        { key: 'mystery', flag: 'bad', detail: '' },
      ],
    });
    expect(brief.headline).toBe('Dziś odpoczywaj');
    expect(brief.reasons).toHaveLength(3);
    expect(brief.reasons.every((r) => r.key !== 'mystery' && r.key !== 'respRate')).toBe(true);
  });

  it('formats hours as hours and minutes', () => {
    expect(formatHours(-3.2)).toBe('3 h 12 min');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(2)).toBe('2 h');
  });
});

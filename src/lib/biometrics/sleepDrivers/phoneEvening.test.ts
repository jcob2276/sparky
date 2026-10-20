import { describe, expect, it } from 'vitest';
import { phoneEveningMinutes } from './phoneEvening';

const flat = (value: number) => Array.from({ length: 48 }, () => value);
const ms = (iso: string) => Date.parse(iso);

describe('phoneEveningMinutes', () => {
  it('bedtime przed północą: buckety D-1 od 21:30 do zaśnięcia, ostatni proporcjonalnie', () => {
    const prev = flat(0);
    prev[43] = 10; // 21:30-22:00
    prev[44] = 20; // 22:00-22:30
    prev[45] = 30; // 22:30-23:00, zasypia 22:45 => połowa
    const days = new Map([['2026-10-14', prev]]);
    // 22:45 lato (CEST) = 20:45Z
    expect(phoneEveningMinutes('2026-10-15', ms('2026-10-14T20:45:00Z'), days)).toBe(10 + 20 + 15);
  });

  it('bedtime po północy: D-1 od 21:30 do 24:00 plus D od 00:00 do zaśnięcia', () => {
    const prev = flat(0);
    for (let i = 43; i < 48; i++) prev[i] = 5;
    const day = flat(0);
    day[0] = 30;
    day[1] = 20;
    const days = new Map([['2026-10-14', prev], ['2026-10-15', day]]);
    // 00:45 lokalnie (CEST) = 22:45Z poprzedniego dnia
    expect(phoneEveningMinutes('2026-10-15', ms('2026-10-14T22:45:00Z'), days)).toBe(25 + 30 + 10);
  });

  it('zaśnięcie przed 21:30 => 0', () => {
    const days = new Map([['2026-10-14', flat(30)]]);
    expect(phoneEveningMinutes('2026-10-15', ms('2026-10-14T18:00:00Z'), days)).toBe(0);
  });

  it('brak bucketów potrzebnego dnia => null (historia sprzed wdrożenia)', () => {
    expect(phoneEveningMinutes('2026-10-15', ms('2026-10-14T22:45:00Z'), new Map())).toBeNull();
    const onlyPrev = new Map([['2026-10-14', flat(1)]]);
    expect(phoneEveningMinutes('2026-10-15', ms('2026-10-14T22:45:00Z'), onlyPrev)).toBeNull();
  });

  it('noc ze zmianą czasu 2026-10-25: godziny lokalne, nie UTC', () => {
    const prev = flat(0);
    for (let i = 43; i < 48; i++) prev[i] = 10;
    const day = flat(1);
    const days = new Map([['2026-10-24', prev], ['2026-10-25', day]]);
    // 02:30 CET (po cofnięciu zegara) = 01:30Z => lokalnie dzień 25, minuta 150 => 5 bucketów po 1 min
    expect(phoneEveningMinutes('2026-10-25', ms('2026-10-25T01:30:00Z'), days)).toBe(50 + 5);
  });
});

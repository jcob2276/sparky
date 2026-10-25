import { describe, expect, it } from 'vitest';
import { phaseReport } from './closerPhaseTrends';
import type { Json } from '../database.types';

const crit = (id: string, label = id) => ({ id, label });
const phase = (name: string, score: number, met: string[] = [], missed: string[] = []): Json =>
  ({ phase: name, score, met: met.map(id => crit(id)), missed: missed.map(id => crit(id)), evidence: null });
const call = (day: number, phases: Json[], kind: string | null = 'sales') =>
  ({ started_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, ai_call_kind: kind, ai_phases: phases });

describe('phaseReport', () => {
  const calls = [
    ...[1, 2, 3, 4, 5].map(d => call(d, [phase('cena', 2, [], ['cena.cisza_po_cenie']), phase('potrzeby', 3, ['potrzeby.dopytywanie'])])),
    ...[11, 12, 13, 14, 15].map(d => call(d, [phase('cena', 4, ['cena.cisza_po_cenie']), phase('potrzeby', 4, ['potrzeby.dopytywanie'])])),
  ];

  it('liczy średnią z 5 ostatnich i zmianę względem poprzednich 5', () => {
    const cena = phaseReport(calls).trends.find(t => t.phase === 'cena')!;
    expect(cena).toMatchObject({ calls: 10, recent: 4, delta: 2 });
  });

  it('pomija rozmowy niesprzedażowe i etapy bez próby (mniej niż 3 oceny)', () => {
    const report = phaseReport([...calls, call(20, [phase('cena', 1)], 'training'), call(21, [phase('obiekcje', 5, ['obiekcje.wysluchanie'])])]);
    expect(report.salesCalls).toBe(11);
    expect(report.trends.find(t => t.phase === 'cena')!.calls).toBe(10);
    expect(report.trends.find(t => t.phase === 'obiekcje')).toMatchObject({ calls: 1, recent: null, delta: null });
  });

  it('wskazuje najniżej oceniany etap, powtarzające się braki i to, co działa', () => {
    const report = phaseReport([...calls.slice(0, 5), ...calls.slice(0, 5).map(c => ({ ...c, started_at: c.started_at.replace('-10-', '-11-') }))]);
    expect(report.fix?.trend.phase).toBe('cena');
    expect(report.fix?.missed).toMatchObject({ id: 'cena.cisza_po_cenie', calls: 10 });
    expect(report.repeating[0]).toMatchObject({ id: 'cena.cisza_po_cenie', phaseLabel: 'Cena' });
    expect(report.working.map(s => s.id)).toEqual(['potrzeby.dopytywanie']);
  });

  it('ignoruje uszkodzone wpisy ai_phases', () => {
    expect(phaseReport([call(1, [{ phase: 'cena', score: 'x' }, null, 'abc'] as Json[])])).toMatchObject({ salesCalls: 0, fix: null });
  });
});

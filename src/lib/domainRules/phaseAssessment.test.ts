import { describe, expect, it } from 'vitest';
import { DEFAULT_PHASE_CRITERIA, callKind, groundPhaseAssessments } from '@vanguard/domain';

const transcript = [
  { timestamp: '00:10:00', speaker: { display_name: 'Jakub' }, text: 'Cena to 5500 złotych, można na raty.' },
  { timestamp: '00:10:20', speaker: { display_name: 'Klient' }, text: 'Muszę to przemyśleć.' },
];

describe('groundPhaseAssessments', () => {
  it('zostawia ocenę z istniejącymi kryteriami i cytatem z transkryptu', () => {
    const [a] = groundPhaseAssessments([{ phase: 'cena', score: 3.6, met: ['cena.pewne_podanie'], missed: ['cena.cisza_po_cenie'], evidence: 'cena to 5500 złotych' }], transcript, DEFAULT_PHASE_CRITERIA);
    expect(a).toMatchObject({ phase: 'cena', score: 4, evidence: 'cena to 5500 złotych' });
    expect(a.met.map(k => k.id)).toEqual(['cena.pewne_podanie']);
    expect(a.missed[0].label).toBe('Po cenie zaczekano na reakcję klienta');
  });

  it('odrzuca nieznany etap, wynik poza 1-5, powtórzony etap i ocenę bez znanych kryteriów', () => {
    const base = { score: 3, met: ['cena.pewne_podanie'], missed: [] };
    const out = groundPhaseAssessments([
      { ...base, phase: 'small talk' }, { ...base, phase: 'cena', score: 9 }, { ...base, phase: 'cena' }, { ...base, phase: 'cena' },
      { phase: 'otwarcie', score: 3, met: ['cena.pewne_podanie'], missed: ['wymyslone'] },
    ], transcript, DEFAULT_PHASE_CRITERIA);
    expect(out.map(a => a.phase)).toEqual(['cena']);
  });

  it('zmyślony cytat dowodowy zamienia na null, ale ocenę zostawia; kryterium nie jest naraz spełnione i brakujące', () => {
    const [a] = groundPhaseAssessments([{ phase: 'cena', score: 2, met: ['cena.pewne_podanie'], missed: ['cena.pewne_podanie', 'cena.opcje_platnosci'], evidence: 'zupełnie inne zdanie' }], transcript, DEFAULT_PHASE_CRITERIA);
    expect(a.evidence).toBeNull();
    expect(a.missed.map(k => k.id)).toEqual(['cena.opcje_platnosci']);
  });

  it('callKind akceptuje tylko znane typy', () => {
    expect(callKind('sales')).toBe('sales');
    expect(callKind('coaching')).toBeNull();
  });
});

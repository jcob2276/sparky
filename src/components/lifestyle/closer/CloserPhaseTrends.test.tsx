import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CloserPhaseTrends from './CloserPhaseTrends';
import type { PhaseReport } from '../../../lib/closer/closerPhaseTrends';

const cena = { phase: 'cena' as const, label: 'Cena', calls: 12, recent: 2.4, delta: -0.6 };
const report: PhaseReport = {
  salesCalls: 12,
  trends: [cena, { phase: 'potrzeby', label: 'Badanie potrzeb', calls: 12, recent: 4, delta: 0.8 }],
  fix: { trend: cena, missed: { id: 'cena.cisza_po_cenie', label: 'Po cenie zaczekano na reakcję klienta', phaseLabel: 'Cena', calls: 9 } },
  repeating: [{ id: 'cena.cisza_po_cenie', label: 'Po cenie zaczekano na reakcję klienta', phaseLabel: 'Cena', calls: 9 }],
  working: [{ id: 'potrzeby.dopytywanie', label: 'Odpowiedzi dopytane', phaseLabel: 'Badanie potrzeb', calls: 11 }],
};

describe('CloserPhaseTrends', () => {
  it('pokazuje średnie, zmiany, co poprawić, co się powtarza i co działa', () => {
    render(<CloserPhaseTrends report={report} />);
    expect(screen.getByText('2,4/5')).toBeInTheDocument();
    expect(screen.getByText('-0,6')).toBeInTheDocument();
    expect(screen.getByText('+0,8')).toBeInTheDocument();
    expect(screen.getByText(/to Twój najniżej oceniany etap/)).toBeInTheDocument();
    expect(screen.getByText(/brak w 9 rozm\./)).toBeInTheDocument();
    expect(screen.getByText('Działa — zostaw')).toBeInTheDocument();
  });

  it('nie pokazuje nic przy mniej niż 3 rozmowach sprzedażowych, a przy małej próbie ostrzega', () => {
    const { container, rerender } = render(<CloserPhaseTrends report={{ ...report, salesCalls: 2 }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CloserPhaseTrends report={{ ...report, salesCalls: 6 }} />);
    expect(screen.getByText(/mała próba/)).toBeInTheDocument();
  });
});

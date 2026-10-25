import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CloserCallPatterns from './CloserCallPatterns';

const pattern = { phase: 'cena' as const, label: 'Cena', calls: 4, latest: { callId: 'c1', title: 'Marlena', experiment: 'Zapytaj, jak klientka podejmuje decyzje.' } };

describe('CloserCallPatterns', () => {
  it('pokazuje powtarzające się etapy i otwiera rozmowę z ostatnim eksperymentem', () => {
    const onOpen = vi.fn();
    render(<CloserCallPatterns patterns={{ analyzed: 6, practice: [pattern], strength: { ...pattern, phase: 'potrzeby', label: 'Badanie potrzeb', calls: 3 } }} onOpen={onOpen} />);
    expect(screen.getByText('do przećwiczenia w 4 z 6')).toBeInTheDocument();
    expect(screen.getByText(/Mocna strona: Badanie potrzeb/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Otwórz rozmowę: Marlena' }));
    expect(onOpen).toHaveBeenCalledWith('c1');
  });

  it('nie pokazuje nic przy zbyt małej liczbie analiz', () => {
    const { container } = render(<CloserCallPatterns patterns={{ analyzed: 2, practice: [pattern], strength: null }} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

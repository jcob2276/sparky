import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, type DayNumbersDraft } from '../../../lib/closer/closerDayModel';
import SalesNumbersFields from './SalesNumbersFields';

function Harness({ initial = EMPTY_DRAFT }: { initial?: DayNumbersDraft }) {
  const [draft, setDraft] = useState(initial);
  return (
    <SalesNumbersFields
      idPrefix="t"
      draft={draft}
      onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
    />
  );
}

describe('SalesNumbersFields', () => {
  it('pokazuje cztery pola liczbowe i pole opinii', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/Rozmowy odebrane/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Umówieni/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rozmowy sprzedażowe/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sprzedaże/)).toBeInTheDocument();
    expect(screen.getByLabelText('Jedno zdanie o tych liczbach')).toBeInTheDocument();
  });

  it('przepuszcza tylko cyfry, maksymalnie trzy', () => {
    render(<Harness />);
    const field = screen.getByLabelText(/Rozmowy odebrane/);
    fireEvent.change(field, { target: { value: '4a0-1,2' } });
    expect(field).toHaveValue('401');
  });

  it('klawiatura numeryczna na telefonie', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/Umówieni/)).toHaveAttribute('inputmode', 'numeric');
  });

  it('„bez sprzedaży” pokazuje zera i blokuje pola, ale zostawia opinię do wpisania', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText(/Dziś bez sprzedaży/));
    for (const name of [/Rozmowy odebrane/, /Umówieni/, /Rozmowy sprzedażowe/, /Sprzedaże/]) {
      expect(screen.getByLabelText(name)).toHaveValue('0');
      expect(screen.getByLabelText(name)).toBeDisabled();
    }
    expect(screen.getByLabelText('Jedno zdanie o tych liczbach')).toBeEnabled();
  });

  it('zachowuje wpisaną opinię', () => {
    render(<Harness />);
    const note = screen.getByLabelText('Jedno zdanie o tych liczbach');
    fireEvent.change(note, { target: { value: 'Rano same odmowy' } });
    expect(note).toHaveValue('Rano same odmowy');
  });
});

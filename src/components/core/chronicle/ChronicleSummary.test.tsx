import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChronicleSummary from './ChronicleSummary';
import ChronicleControls from './ChronicleControls';

const summary = {
  goalLine: { title: 'Konto', hint: 'Umówieni 4 z 30 · cel 15 000 zł netto / msc', pct: 13 },
  tiles: [
    { label: 'Diale', value: '40', delta: '+10', tone: 'good' as const },
    { label: 'Umówieni', value: '4', delta: null, tone: 'neutral' as const, hint: 'z 30' },
    { label: 'Sprzedaże', value: '—', delta: null, tone: 'neutral' as const },
  ],
  chart: { label: 'Umówieni', unit: '', labels: ['pn', 'wt', 'śr'], values: [4, null, 6] },
  notes: ['Brak liczb z 1 dnia (bez dzisiejszego): sumy są zaniżone.'],
};

describe('ChronicleSummary', () => {
  it('pokazuje cel, kafelki z porównaniem, wykres z przerwą i braki danych', () => {
    render(<ChronicleSummary summary={summary} loading={false} error={null} periodTitle="Ten tydzień" />);
    expect(screen.getByText(/Konto · Ten tydzień/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Postęp do celu' })).toHaveAttribute('aria-valuenow', '13');
    expect(screen.getByText('+10 vs poprzedni')).toBeInTheDocument();
    expect(screen.getAllByText('brak porównania')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Umówieni, Ten tydzień' })).toBeInTheDocument();
    expect(screen.getByText(/Brak liczb z 1 dnia/)).toBeInTheDocument();
  });

  it('w tygodniu nie rysuje wykresu, ale zostawia cel, kafelki i braki danych', () => {
    render(<ChronicleSummary summary={summary} loading={false} error={null} periodTitle="Ten tydzień" showChart={false} />);
    expect(screen.queryByRole('img', { name: 'Umówieni, Ten tydzień' })).not.toBeInTheDocument();
    expect(screen.getByText('+10 vs poprzedni')).toBeInTheDocument();
    expect(screen.getByText(/Brak liczb z 1 dnia/)).toBeInTheDocument();
  });

  it('podpisuje zmianę okresem, z którym porównano, zamiast „poprzedni”', () => {
    render(<ChronicleSummary summary={summary} loading={false} error={null} periodTitle="Ten tydzień" compareLabel="21–27 wrz" />);
    expect(screen.getByText('+10 vs 21–27 wrz')).toBeInTheDocument();
  });

  it('grupuje kafelki pod nagłówkami sekcji, a bez grup zostawia jeden blok', () => {
    const grouped = {
      ...summary,
      tiles: [
        { label: 'Sen', value: '7 h', delta: null, tone: 'neutral' as const, group: 'Sen' },
        { label: 'HRV', value: '60', delta: null, tone: 'neutral' as const, group: 'Sen' },
        { label: 'Kalorie', value: '2400', delta: null, tone: 'neutral' as const, group: 'Jedzenie' },
      ],
    };
    const { rerender } = render(<ChronicleSummary summary={grouped} loading={false} error={null} periodTitle="Ten tydzień" />);
    expect(screen.getByText('Sen', { selector: 'p.px-1' })).toBeInTheDocument();
    expect(screen.getByText('Jedzenie', { selector: 'p.px-1' })).toBeInTheDocument();
    rerender(<ChronicleSummary summary={summary} loading={false} error={null} periodTitle="Ten tydzień" />);
    expect(screen.queryByText('Jedzenie', { selector: 'p.px-1' })).toBeNull();
  });

  it('bez danych do wykresu mówi o tym wprost', () => {
    render(<ChronicleSummary summary={{ ...summary, chart: { ...summary.chart, values: [null, null, null] } }} loading={false} error={null} periodTitle="Ten tydzień" />);
    expect(screen.getByText('Brak danych do wykresu w tym okresie.')).toBeInTheDocument();
  });

  it('błąd odczytu nie udaje pustych danych', () => {
    render(<ChronicleSummary summary={null} loading={false} error={new Error('offline')} periodTitle="Ten tydzień" />);
    expect(screen.getByText('Nie udało się wczytać danych tego okresu.')).toBeInTheDocument();
  });
});

describe('ChronicleControls', () => {
  it('przełącza cel i okres oraz zostawia eksport na miejscu', () => {
    const onGoal = vi.fn();
    const onPeriod = vi.fn();
    const onExport = vi.fn();
    render(<ChronicleControls goal="cialo" onGoal={onGoal} period="week" onPeriod={onPeriod} onExport={onExport} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Konto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Miesiąc' }));
    fireEvent.click(screen.getByRole('button', { name: /Eksport/ }));
    expect(onGoal).toHaveBeenCalledWith('konto');
    expect(onPeriod).toHaveBeenCalledWith('month');
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tab', { name: 'Ciało' })).toHaveAttribute('aria-selected', 'true');
  });
});

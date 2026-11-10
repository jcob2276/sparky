import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildMonthPlan, EMPTY_DAY, summarizeProgress, type DayActual } from '../../lib/closer/monthPlan';
import { MonthPlanView } from './MonthPlanView';

const config = { startDate: '2026-11-02', targetPln: 10000, showRate: 2 / 3, minSalesWeekDays: 3 };

function renderPlan(today: string, actuals: Record<string, DayActual>) {
  const plan = buildMonthPlan(config, actuals, today);
  return render(
    <MonthPlanView
      plan={plan}
      progress={summarizeProgress(plan, actuals, today)}
      actuals={actuals}
      today={today}
      targetPln={10000}
      selectedDate={today}
      onSelectDate={() => undefined}
      entry={null}
    />,
  );
}

describe('MonthPlanView', () => {
  it('pokazuje sumy miesiąca i minimum każdego dnia roboczego', () => {
    renderPlan('2026-11-02', {});
    expect(screen.getByText('0/111')).toBeInTheDocument();
    expect(screen.getByText('0/4')).toBeInTheDocument();
    expect(screen.getByText('brak rozmów')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/minimum [56], umówiono 0/)).toHaveLength(21);
    expect(screen.getAllByLabelText(/rezerwa/)).toHaveLength(8);
  });

  it('przelicza dzisiejsze minimum po zaległościach, pokazuje sprzedaż i close rate', () => {
    renderPlan('2026-11-05', { '2026-11-02': { ...EMPTY_DAY, appointments: 2, salesCalls: 4, salesClosed: 1 } });
    expect(screen.getByLabelText('2.11, minimum 6, umówiono 2, sales calli 4, sprzedaży 1')).toBeInTheDocument();
    expect(screen.getByText('zostało 7 · +1 ponad plan')).toBeInTheDocument();
    expect(screen.queryByText(/60 min/)).not.toBeInTheDocument();
    expect(screen.getByText('1 z 4 · mała próba')).toBeInTheDocument();
    expect(screen.getAllByText('25%').length).toBeGreaterThan(0);
  });

  it('pokazuje czas, minima dzienne i dni zamknięte refleksją', () => {
    renderPlan('2026-11-03', {
      '2026-11-02': { ...EMPTY_DAY, workMinutes: 150, reflectionMinutes: 15, learningMinutes: 40, reflection: 'Zamknąłem dzień z konkretną refleksją.' },
      '2026-11-03': { ...EMPTY_DAY, learningMinutes: 10 },
    });
    expect(screen.getByText('2 h 30 min')).toBeInTheDocument();
    expect(screen.getByText('dziś 0/15 min')).toBeInTheDocument();
    expect(screen.getByText('dziś 10/30 min')).toBeInTheDocument();
    expect(screen.getByText('Zamknięte dni z refleksją: 1 z 2')).toBeInTheDocument();
    expect(screen.getByLabelText(/^2\.11, minimum \d, .*dzień zamknięty$/)).toBeInTheDocument();
  });
});

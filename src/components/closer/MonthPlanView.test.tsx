import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildMonthPlan, summarizeProgress } from '../../lib/closer/monthPlan';
import { MonthPlanView } from './MonthPlanView';

const plan = buildMonthPlan({ startDate: '2026-11-02', targetPln: 10000, showRate: 2 / 3, minSalesWeekDays: 3 });

function renderPlan(today: string, actuals: Record<string, { appointments: number; salesClosed: number }>) {
  return render(<MonthPlanView plan={plan} progress={summarizeProgress(plan, actuals, today)} actuals={actuals} today={today} targetPln={10000} />);
}

describe('MonthPlanView', () => {
  it('pokazuje sumy miesiąca i minimum każdego dnia roboczego', () => {
    renderPlan('2026-11-02', {});
    expect(screen.getByText('0/111')).toBeInTheDocument();
    expect(screen.getByText('0/4')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/minimum [56], umówiono 0/)).toHaveLength(21);
    expect(screen.getAllByLabelText(/rezerwa/)).toHaveLength(8);
  });

  it('dolicza zaległość do dzisiejszego minimum i pokazuje sprzedaż', () => {
    renderPlan('2026-11-03', { '2026-11-02': { appointments: 2, salesClosed: 1 } });
    expect(screen.getByLabelText('2.11, minimum 6, umówiono 2, sprzedaży 1')).toBeInTheDocument();
    expect(screen.getByText(/w tym 4 zaległe/)).toBeInTheDocument();
  });
});

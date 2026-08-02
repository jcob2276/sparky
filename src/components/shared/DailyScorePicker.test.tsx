// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DailyScorePicker from './DailyScorePicker';

describe('DailyScorePicker', () => {
  it('shows the four approved day ranges and all mood labels', () => {
    render(
      <DailyScorePicker
        dayScore={7}
        setDayScore={vi.fn()}
        moodScore={3}
        setMoodScore={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Znaczenie wyniku dnia')).toHaveTextContent(
      '1–3 Trudny4–6 Nierówny7–8 Dobry9–10 Wyjątkowy',
    );

    ['Ciężko', 'Słabo', 'Neutralnie', 'Dobrze', 'Świetnie'].forEach((label) => {
      expect(screen.getByText(label)).toBeVisible();
    });
  });

  it('describes the selected range without nesting another card', () => {
    const { container } = render(
      <DailyScorePicker
        dayScore={9}
        setDayScore={vi.fn()}
        moodScore={4}
        setMoodScore={vi.fn()}
      />,
    );

    expect(screen.getByText('9–10 · Wyjątkowy dzień')).toBeInTheDocument();
    expect(container.querySelector('[data-ui="card"]')).not.toBeInTheDocument();
  });
});

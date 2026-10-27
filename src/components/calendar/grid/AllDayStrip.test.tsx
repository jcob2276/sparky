import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AllDayStrip } from './AllDayStrip';

const noop = () => undefined;

describe('AllDayStrip holidays', () => {
  it('shows a Polish public holiday even when the day has no all-day events', () => {
    render(<AllDayStrip days={['2026-11-01', '2026-11-02']} allDayByDay={[[], []]} gutterWidth={44} onEventClick={noop} />);
    expect(screen.getByLabelText(/Święto: Wszystkich Świętych/)).toBeInTheDocument();
  });

  it('renders nothing for ordinary days without events', () => {
    const { container } = render(<AllDayStrip days={['2026-11-03', '2026-11-04']} allDayByDay={[[], []]} gutterWidth={44} onEventClick={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps all-day events and the holiday together', () => {
    const event = { id: 'e1', summary: 'Urodziny Ani', category: 'relacje' } as Parameters<typeof AllDayStrip>[0]['allDayByDay'][number][number];
    render(<AllDayStrip days={['2026-05-01']} allDayByDay={[[event]]} gutterWidth={44} onEventClick={noop} />);
    expect(screen.getByLabelText(/Święto: Święto Pracy/)).toBeInTheDocument();
    expect(screen.getByLabelText('Urodziny Ani')).toBeInTheDocument();
  });
});

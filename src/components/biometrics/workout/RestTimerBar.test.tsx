// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RestTimerBar from './RestTimerBar';

describe('RestTimerBar', () => {
  it('renders with initial remaining seconds using NumberTicker', () => {
    render(<RestTimerBar initialSeconds={90} />);
    expect(screen.getByLabelText('1:30')).toBeInTheDocument();
    expect(screen.getByText('Odpoczynek')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    render(<RestTimerBar initialSeconds={90} />);
    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
  });
});

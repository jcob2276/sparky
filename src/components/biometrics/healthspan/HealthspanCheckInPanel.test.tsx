import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HealthspanCheckInPanel from './HealthspanCheckInPanel';

describe('HealthspanCheckInPanel', () => {
  it('supports the non-wearable path and submits manual values', () => {
    const onSave = vi.fn();
    render(<HealthspanCheckInPanel onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bez zegarka' }));
    fireEvent.change(screen.getByLabelText('VO₂ max'), { target: { value: '48' } });
    fireEvent.change(screen.getByLabelText('Sen — godziny'), { target: { value: '7.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz check-in' }));
    expect(onSave).toHaveBeenCalledWith('manual', { sleepHours: 7.5, vo2Max: 48 });
  });
});

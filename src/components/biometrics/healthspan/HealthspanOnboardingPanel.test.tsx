import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HealthspanOnboardingPanel from './HealthspanOnboardingPanel';

describe('HealthspanOnboardingPanel', () => {
  it('creates a non-wearable profile from guided baseline data', () => {
    const onSave = vi.fn();
    render(<HealthspanOnboardingPanel onSave={onSave} saving={false} />);
    fireEvent.change(screen.getByLabelText('Data urodzenia'), { target: { value: '1988-04-12' } });
    fireEvent.change(screen.getByLabelText('Typowy sen — godziny'), { target: { value: '7.2' } });
    fireEvent.change(screen.getByLabelText('Typowe kroki dziennie'), { target: { value: '7000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz profil Healthspan' }));
    expect(onSave).toHaveBeenCalledWith({
      birthDate: '1988-04-12',
      sex: 'M',
      payload: { sleepHours: 7.2, steps: 7000 },
    });
  });
});

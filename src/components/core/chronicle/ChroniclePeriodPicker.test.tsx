import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/useHaptics', () => {
  const haptics = { light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() };
  return { haptics, useHaptics: () => haptics };
});

import ChroniclePeriodPicker from './ChroniclePeriodPicker';

function setup(over: Partial<React.ComponentProps<typeof ChroniclePeriodPicker>> = {}) {
  const props = {
    label: '19–25 paź', compareLabel: '12–18 paź', isCurrent: true, canCompareNewer: true,
    onShift: vi.fn(), onShiftCompare: vi.fn(), onReset: vi.fn(), ...over,
  };
  render(<ChroniclePeriodPicker {...props} />);
  return props;
}

describe('ChroniclePeriodPicker', () => {
  it('pokazuje oba okresy i pozwala cofać się w każdym z nich osobno', () => {
    const props = setup();
    expect(screen.getByText('19–25 paź')).toBeInTheDocument();
    expect(screen.getByText('12–18 paź')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Okres: wcześniejszy' }));
    expect(props.onShift).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Okres porównania: wcześniejszy' }));
    expect(props.onShiftCompare).toHaveBeenCalledWith(1);
  });

  it('na bieżącym okresie nie da się iść do przyszłości i nie ma przycisku „Bieżący”', () => {
    setup({ isCurrent: true });
    expect(screen.getByRole('button', { name: 'Okres: późniejszy' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Bieżący' })).toBeNull();
  });

  it('w starszym okresie można wrócić do bieżącego', () => {
    const props = setup({ isCurrent: false, label: '12–18 paź', compareLabel: '5–11 paź' });
    expect(screen.getByRole('button', { name: 'Okres: późniejszy' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bieżący' }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });
});

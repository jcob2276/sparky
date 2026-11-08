import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('ma rolę switch, nazwę z etykiety i przełącza się kliknięciem', () => {
    const onChange = vi.fn();
    render(<Switch label="Uwzględnij oszczędności" checked={false} onChange={onChange} />);
    const control = screen.getByRole('switch', { name: 'Uwzględnij oszczędności' });
    expect(control).not.toBeChecked();
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('pokazuje stan włączony i respektuje disabled', () => {
    render(<Switch label="Opcja" checked onChange={() => undefined} disabled />);
    const control = screen.getByRole('switch', { name: 'Opcja' });
    expect(control).toBeChecked();
    expect(control).toBeDisabled();
  });
});

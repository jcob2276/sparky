import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutPlateCalculatorModal } from './WorkoutPlateCalculatorModal';

describe('WorkoutPlateCalculatorModal', () => {
  it('renders total weight, bar weight and calculated plates per side', () => {
    render(
      <WorkoutPlateCalculatorModal
        isOpen={true}
        onClose={vi.fn()}
        initialWeightKg={100} // 100 kg total with 20 kg bar = 40 kg per side (25 + 15 or 20 + 20)
      />
    );

    expect(screen.getByText('Kalkulator Talerzy na Sztangę')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/40 kg na stronę/i)).toBeInTheDocument();
    expect(screen.getByText('Gryf olimpijski')).toBeInTheDocument();
  });

  it('adjusts weight on clicking increment buttons', () => {
    render(
      <WorkoutPlateCalculatorModal
        isOpen={true}
        onClose={vi.fn()}
        initialWeightKg={80}
      />
    );

    const plusTen = screen.getByRole('button', { name: /dodaj 10 kg/i });
    fireEvent.click(plusTen);

    expect(screen.getByText('90')).toBeInTheDocument();
  });
});

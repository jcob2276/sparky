import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardioDriftCard } from './CardioDriftCard';

describe('CardioDriftCard', () => {
  it('renders optimal coupling state', () => {
    render(
      <CardioDriftCard
        data={{
          decouplingPercentage: 2.1,
          efHalf1: 0.0238,
          efHalf2: 0.0233,
          rating: 'optimal_coupling',
          ratingLabel: 'Pełne sprzężenie (< 3.5%)',
          hasSignificantDrift: false,
          hrDeltaBpm: 2,
          recommendation: 'Wzorcowa baza tlenowa.',
        }}
      />
    );

    expect(screen.getByText('Dryf Tętna (Aerobic Decoupling)')).toBeInTheDocument();
    expect(screen.getByText('2.1%')).toBeInTheDocument();
    expect(screen.getByText('Pełne sprzężenie')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('Wzorcowa baza tlenowa.')).toBeInTheDocument();
  });

  it('renders decoupling warning when drift exceeds 5%', () => {
    render(
      <CardioDriftCard
        data={{
          decouplingPercentage: 6.8,
          efHalf1: 0.0238,
          efHalf2: 0.0222,
          rating: 'aerobic_decoupling',
          ratingLabel: 'Dryf tętna (> 5.0%)',
          hasSignificantDrift: true,
          hrDeltaBpm: 10,
          recommendation: 'Zidentyfikowano dryf tętna (6.8%).',
        }}
      />
    );

    expect(screen.getByText('6.8%')).toBeInTheDocument();
    expect(screen.getByText('Rozprzężenie tlenowe')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('Zidentyfikowano dryf tętna (6.8%).')).toBeInTheDocument();
  });

  it('renders mild drift state correctly', () => {
    render(
      <CardioDriftCard
        data={{
          decouplingPercentage: 4.2,
          efHalf1: 0.024,
          efHalf2: 0.023,
          rating: 'mild_drift',
          ratingLabel: 'Umiarkowany dryf (3.5% - 5.0%)',
          hasSignificantDrift: false,
          hrDeltaBpm: 4,
          recommendation: 'Lekki dryf tętna (4.2%).',
        }}
      />
    );

    expect(screen.getByText('4.2%')).toBeInTheDocument();
    expect(screen.getByText('Lekki dryf')).toBeInTheDocument();
    expect(screen.getByText('Lekki dryf (3.5% - 5%)')).toBeInTheDocument();
  });

  it('renders clean notice when data is null', () => {
    render(<CardioDriftCard data={null} />);
    expect(screen.getByText(/Brak zarejestrowanych biegów/i)).toBeInTheDocument();
  });
});

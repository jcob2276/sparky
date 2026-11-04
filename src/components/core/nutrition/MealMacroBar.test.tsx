import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MealMacroBar from './MealMacroBar';

describe('MealMacroBar', () => {
  it('keeps missing data and targets distinct from a measured zero', () => {
    render(<MealMacroBar calories={null} targetKcal={null} protein={0} targetProtein={null} fat={null} carbs={12.5} />);
    const items = within(screen.getByRole('region', { name: 'Makroskładniki wybranego dnia' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Kcal— / —');
    expect(items[1]).toHaveTextContent('Białko0 / — g');
    expect(items[2]).toHaveTextContent('Tłuszcze— / — g');
    expect(items[3]).toHaveTextContent('Węgle12,5 / — g');
    expect(screen.getByText('Dziennik jedzenia · brak danych kcal')).toBeInTheDocument();
  });

  it('shows recorded targets and decimal values in Polish', () => {
    render(<MealMacroBar calories={1500.5} targetKcal={2200} protein={90.5} targetProtein={130} fat={40.2} carbs={140.8} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/1\s?500,5 \/ 2\s?200/);
    expect(items[1]).toHaveTextContent('90,5 / 130 g');
    expect(items[2]).toHaveTextContent('40,2 / 73 g');
    expect(items[2]).toHaveAttribute('data-macro', 'fat');
    expect(items[3]).toHaveAttribute('data-macro', 'carbs');
    expect(screen.queryByText(/brak danych kcal/)).not.toBeInTheDocument();
  });
});

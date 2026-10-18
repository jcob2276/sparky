import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OuraNutritionFuelingView } from './OuraNutritionFuelingView';
const empty = {date:'2026-10-14',strainRow:null,oura:null};
describe('biometrics evidence surfaces', () => {
  it('shows missing food and target data instead of sample meals, caffeine and hydration values', () => {
    render(<OuraNutritionFuelingView data={empty} />);
    expect(screen.getByText(/Brak dziennika jedzenia/)).toBeInTheDocument();
    expect(screen.queryByText('2155')).not.toBeInTheDocument();
    expect(screen.queryByText('3750')).not.toBeInTheDocument();
    expect(screen.queryByText(/22:25/)).not.toBeInTheDocument();
  });
});

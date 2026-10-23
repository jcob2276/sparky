// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionTitle from './SectionTitle';

describe('SectionTitle', () => {
  it('renders an h2 heading by default', () => {
    render(<SectionTitle>Dziś</SectionTitle>);
    expect(screen.getByRole('heading', { level: 2, name: 'Dziś' })).toBeInTheDocument();
  });

  it('supports other heading levels and a trailing slot', () => {
    render(<SectionTitle as="h3" trailing={<span>3</span>}>Zadania</SectionTitle>);
    expect(screen.getByRole('heading', { level: 3, name: 'Zadania' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

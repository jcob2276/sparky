// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('renders the large title as the single h1 plus subtitle and slots', () => {
    render(<PageHeader title="Dziś" subtitle="Piątek, 23 paź" leading={<span>wstecz</span>} actions={<span>akcja</span>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dziś' })).toBeInTheDocument();
    expect(screen.getByText('Piątek, 23 paź')).toBeInTheDocument();
    expect(screen.getByText('wstecz')).toBeInTheDocument();
    expect(screen.getByText('akcja')).toBeInTheDocument();
  });
});

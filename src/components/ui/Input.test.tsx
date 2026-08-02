// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Input from './Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Test" />);
    expect(screen.getByPlaceholderText('Test')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { rerender } = render(<Input size="sm" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('text-sm');

    rerender(<Input size="lg" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('text-base');
  });

  it('shows error state', () => {
    render(<Input label="Name" error="Required" data-testid="input" />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('uses the shared control surface', () => {
    render(<Input label="Name" />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveClass('ui-control');
  });

  it('renders icon', () => {
    render(<Input icon={<span data-testid="icon">🔍</span>} data-testid="input" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toHaveClass('pl-9');
  });

  it('can be disabled', () => {
    render(<Input disabled data-testid="input" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });
});
